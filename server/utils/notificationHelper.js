const Notification = require("../models/Notification");

/**
 * Create a notification and emit it via Socket.IO
 * @param {Object} io - Socket.IO instance
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createAndEmitNotification = async (io, notificationData) => {
  try {
    // 1. Create the notification
    const notification = await Notification.create(notificationData);

    // 2. Populate only the fields that exist for this notification
    let populateQuery = Notification.findById(notification._id)
      .populate("team", "name")
      .populate("sender", "username email avatar");

    // Conditionally populate scrim if it exists
    if (notificationData.scrim) {
      populateQuery = populateQuery.populate("scrim", "_id name scheduledTime");
    }

    // Conditionally populate chat if it exists
    if (notificationData.chat) {
      populateQuery = populateQuery.populate("chat", "_id");
    }

    // Execute the query
    const populatedNotification = await populateQuery.lean();

    // 3. Add computed fields
    let link = null;
    let message = "";
    const senderName =
      populatedNotification.sender?.username ||
      populatedNotification.sender?.email ||
      "Someone";

    switch (populatedNotification.type) {
      case "message":
        if (populatedNotification.scrim?._id) {
          link = `/chats/${populatedNotification.scrim._id}`;
          message = `${senderName} sent a message`;
        }
        break;
      case "request":
        if (populatedNotification.scrim?._id) {
          link = `/scrims/${populatedNotification.scrim._id}/requests`;
          message = `${senderName} sent a scrim request`;
        }
        break;
      case "match":
        if (populatedNotification.scrim?._id) {
          link = `/scrims/${populatedNotification.scrim._id}`;
          message = `Match update for ${
            populatedNotification.scrim?.name || "scrim"
          }`;
        }
        break;
      default:
        message = `New ${populatedNotification.type} notification`;
        link = "/notifications";
    }

    const notificationWithMetadata = {
      ...populatedNotification,
      link,
      message,
      url: link, // Legacy support
    };

    // 4. Emit to the team's room
    if (io && populatedNotification.team._id) {
      const teamRoom = `team_${populatedNotification.team._id}`;
      console.log(`🔔 Emitting notification to room: ${teamRoom}`);
      io.to(teamRoom).emit("newNotification", notificationWithMetadata);
    }

    console.log(
      `✅ Created and emitted ${populatedNotification.type} notification for team ${populatedNotification.team._id}`
    );

    return notificationWithMetadata;
  } catch (error) {
    console.error("🔥 Error creating and emitting notification:", error);
    throw error;
  }
};

/**
 * Create multiple notifications and emit them
 * @param {Object} io - Socket.IO instance
 * @param {Array} notificationsData - Array of notification data objects
 * @returns {Promise<Array>} Created notifications
 */
const createAndEmitMultipleNotifications = async (io, notificationsData) => {
  try {
    const results = [];

    for (const notifData of notificationsData) {
      const notification = await createAndEmitNotification(io, notifData);
      results.push(notification);
    }

    return results;
  } catch (error) {
    console.error("🔥 Error creating multiple notifications:", error);
    throw error;
  }
};

/**
 * Get Socket.IO instance from the request object
 * This assumes you've attached the io instance to req in middleware
 * @param {Object} req - Express request object
 * @returns {Object|null} Socket.IO instance
 */
const getSocketIO = (req) => {
  return req.app.get("io") || global.io || null;
};

module.exports = {
  createAndEmitNotification,
  createAndEmitMultipleNotifications,
  getSocketIO,
};
