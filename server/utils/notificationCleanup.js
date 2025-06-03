const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const ScrimChat = require("../models/ScrimChat");

/**
 * Utility functions for notification cleanup and maintenance
 */

/**
 * Clean up old read notifications
 * @param {number} daysOld - Number of days old for notifications to be considered for deletion
 * @returns {Promise<number>} Number of notifications deleted
 */
const cleanupOldNotifications = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await Notification.deleteMany({
      read: true,
      createdAt: { $lt: cutoffDate },
    });

    console.log(
      `✅ [CLEANUP] Deleted ${result.deletedCount} old read notifications older than ${daysOld} days`
    );
    return result.deletedCount;
  } catch (error) {
    console.error("🔥 [CLEANUP] Error cleaning up old notifications:", error);
    throw error;
  }
};

/**
 * Remove duplicate notifications
 * Removes notifications that are identical in team, scrim, type, and sender
 * keeping only the most recent one
 * @returns {Promise<number>} Number of duplicate notifications removed
 */
const removeDuplicateNotifications = async () => {
  try {
    const duplicates = await Notification.aggregate([
      {
        $group: {
          _id: {
            team: "$team",
            scrim: "$scrim",
            type: "$type",
            sender: "$sender",
          },
          docs: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
    ]);

    let deletedCount = 0;

    for (const duplicate of duplicates) {
      // Keep the first (newest) document, delete the rest
      const toDelete = duplicate.docs.slice(1);
      const result = await Notification.deleteMany({
        _id: { $in: toDelete },
      });
      deletedCount += result.deletedCount;
    }

    console.log(`✅ [CLEANUP] Removed ${deletedCount} duplicate notifications`);
    return deletedCount;
  } catch (error) {
    console.error(
      "🔥 [CLEANUP] Error removing duplicate notifications:",
      error
    );
    throw error;
  }
};

/**
 * Clean up notifications for non-existent scrims or chats
 * @returns {Promise<number>} Number of orphaned notifications removed
 */
const cleanupOrphanedNotifications = async () => {
  try {
    // Find notifications with scrim references that no longer exist
    const scrimNotifications = await Notification.find({
      scrim: { $exists: true, $ne: null },
    }).populate("scrim");

    const orphanedScrimNotifs = scrimNotifications.filter(
      (notif) => !notif.scrim
    );

    // Find notifications with chat references that no longer exist
    const chatNotifications = await Notification.find({
      chat: { $exists: true, $ne: null },
    }).populate("chat");

    const orphanedChatNotifs = chatNotifications.filter((notif) => !notif.chat);

    const allOrphaned = [...orphanedScrimNotifs, ...orphanedChatNotifs];
    const orphanedIds = allOrphaned.map((notif) => notif._id);

    if (orphanedIds.length > 0) {
      const result = await Notification.deleteMany({
        _id: { $in: orphanedIds },
      });

      console.log(
        `✅ [CLEANUP] Removed ${result.deletedCount} orphaned notifications`
      );
      return result.deletedCount;
    }

    console.log(`✅ [CLEANUP] No orphaned notifications found`);
    return 0;
  } catch (error) {
    console.error(
      "🔥 [CLEANUP] Error cleaning up orphaned notifications:",
      error
    );
    throw error;
  }
};

/**
 * Archive old chat messages to prevent database bloat
 * @param {number} daysOld - Number of days old for messages to be considered for archiving
 * @param {number} keepRecentMessages - Minimum number of recent messages to keep per chat
 * @returns {Promise<number>} Number of messages archived
 */
const archiveOldChatMessages = async (
  daysOld = 90,
  keepRecentMessages = 50
) => {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const chats = await ScrimChat.find({
      "messages.timestamp": { $lt: cutoffDate },
      $expr: { $gt: [{ $size: "$messages" }, keepRecentMessages] },
    });

    let totalArchivedMessages = 0;

    for (const chat of chats) {
      const oldMessages = chat.messages.filter(
        (msg) => new Date(msg.timestamp) < cutoffDate
      );

      // Only archive if we have more than keepRecentMessages
      if (chat.messages.length > keepRecentMessages) {
        const messagesToKeep = Math.max(
          chat.messages.length - oldMessages.length,
          keepRecentMessages
        );

        const messagesToArchive = chat.messages.length - messagesToKeep;

        if (messagesToArchive > 0) {
          // Remove old messages, keeping the most recent ones
          chat.messages = chat.messages.slice(-messagesToKeep);
          await chat.save();

          totalArchivedMessages += messagesToArchive;
          console.log(
            `📦 [CLEANUP] Archived ${messagesToArchive} messages from chat ${chat._id}`
          );
        }
      }
    }

    console.log(
      `✅ [CLEANUP] Total archived messages: ${totalArchivedMessages}`
    );
    return totalArchivedMessages;
  } catch (error) {
    console.error("🔥 [CLEANUP] Error archiving old chat messages:", error);
    throw error;
  }
};

/**
 * Get cleanup statistics
 * @returns {Promise<Object>} Statistics about notifications and messages
 */
const getCleanupStats = async () => {
  try {
    const stats = await Promise.all([
      // Notification stats
      Notification.countDocuments(),
      Notification.countDocuments({ read: true }),
      Notification.countDocuments({ read: false }),
      Notification.countDocuments({
        createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      }),

      // Chat stats
      ScrimChat.countDocuments(),
      ScrimChat.aggregate([
        { $project: { messageCount: { $size: "$messages" } } },
        { $group: { _id: null, totalMessages: { $sum: "$messageCount" } } },
      ]),
    ]);

    const [
      totalNotifications,
      readNotifications,
      unreadNotifications,
      oldNotifications,
      totalChats,
      messageStats,
    ] = stats;

    const totalMessages = messageStats[0]?.totalMessages || 0;

    return {
      notifications: {
        total: totalNotifications,
        read: readNotifications,
        unread: unreadNotifications,
        older30Days: oldNotifications,
      },
      chats: {
        total: totalChats,
        totalMessages,
      },
      generatedAt: new Date(),
    };
  } catch (error) {
    console.error("🔥 [CLEANUP] Error getting cleanup stats:", error);
    throw error;
  }
};

/**
 * Run complete cleanup process
 * @param {Object} options - Cleanup options
 * @returns {Promise<Object>} Cleanup results
 */
const runCompleteCleanup = async (options = {}) => {
  const {
    oldNotificationDays = 30,
    oldMessageDays = 90,
    keepRecentMessages = 50,
    removeDuplicates = true,
    removeOrphaned = true,
  } = options;

  try {
    console.log("🧹 [CLEANUP] Starting complete cleanup process...");

    const results = {
      startTime: new Date(),
      deletedNotifications: 0,
      removedDuplicates: 0,
      removedOrphaned: 0,
      archivedMessages: 0,
      errors: [],
    };

    // 1. Clean old notifications
    try {
      results.deletedNotifications = await cleanupOldNotifications(
        oldNotificationDays
      );
    } catch (error) {
      results.errors.push(`Old notifications cleanup failed: ${error.message}`);
    }

    // 2. Remove duplicates
    if (removeDuplicates) {
      try {
        results.removedDuplicates = await removeDuplicateNotifications();
      } catch (error) {
        results.errors.push(`Duplicate removal failed: ${error.message}`);
      }
    }

    // 3. Remove orphaned notifications
    if (removeOrphaned) {
      try {
        results.removedOrphaned = await cleanupOrphanedNotifications();
      } catch (error) {
        results.errors.push(`Orphaned cleanup failed: ${error.message}`);
      }
    }

    // 4. Archive old messages
    try {
      results.archivedMessages = await archiveOldChatMessages(
        oldMessageDays,
        keepRecentMessages
      );
    } catch (error) {
      results.errors.push(`Message archiving failed: ${error.message}`);
    }

    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;

    console.log("✅ [CLEANUP] Complete cleanup finished:", results);
    return results;
  } catch (error) {
    console.error("🔥 [CLEANUP] Complete cleanup failed:", error);
    throw error;
  }
};

/**
 * Schedule periodic cleanup (call this in your main server file)
 * @param {number} intervalHours - How often to run cleanup (in hours)
 * @param {Object} options - Cleanup options
 */
const schedulePeriodicCleanup = (intervalHours = 24, options = {}) => {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(
    `⏰ [CLEANUP] Scheduling periodic cleanup every ${intervalHours} hours`
  );

  // Run immediately but don't wait for it
  runCompleteCleanup(options).catch((error) => {
    console.error("🔥 [CLEANUP] Initial cleanup failed:", error);
  });

  // Schedule recurring cleanup
  return setInterval(async () => {
    try {
      await runCompleteCleanup(options);
    } catch (error) {
      console.error("🔥 [CLEANUP] Scheduled cleanup failed:", error);
    }
  }, intervalMs);
};

module.exports = {
  cleanupOldNotifications,
  removeDuplicateNotifications,
  cleanupOrphanedNotifications,
  archiveOldChatMessages,
  getCleanupStats,
  runCompleteCleanup,
  schedulePeriodicCleanup,
};
