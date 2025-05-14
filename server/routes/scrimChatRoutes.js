const express = require('express');
const ScrimChat = require('../models/ScrimChat');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * 🟢 Send a Message in a Scrim Chat
 */
router.post('/:scrimId', protect, async (req, res) => {
    const { text } = req.body;

    try {
        let chat = await ScrimChat.findOne({ scrim: req.params.scrimId });

        if (!chat) {
            chat = new ScrimChat({ scrim: req.params.scrimId, messages: [] });
        }

        chat.messages.push({ sender: req.user.id, text });
        await chat.save();

        res.json({ message: 'Message sent', chat });
    } catch (error) {
        console.error("Send Chat Message Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/**
 * 🔵 Get Messages for a Scrim Chat
 */
router.get('/:scrimId', protect, async (req, res) => {
    try {
        const chat = await ScrimChat.findOne({ scrim: req.params.scrimId }).populate('messages.sender', 'username');
        if (!chat) return res.json({ messages: [] });

        res.json(chat.messages);
    } catch (error) {
        console.error("Fetch Scrim Chat Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/**
 * 🔴 Delete Chat When Scrim is Confirmed or Canceled
 */
router.delete('/:scrimId', protect, async (req, res) => {
    try {
        await ScrimChat.findOneAndDelete({ scrim: req.params.scrimId });
        res.json({ message: 'Scrim chat deleted' });
    } catch (error) {
        console.error("Delete Scrim Chat Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
