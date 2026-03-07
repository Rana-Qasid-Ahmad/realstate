const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @POST /api/chat/conversations — start or get existing conversation
router.post('/conversations', protect, async (req, res) => {
  try {
    const { recipientId, propertyId } = req.body;
    const senderId = req.user._id;

    if (recipientId === senderId.toString()) {
      return res.status(400).json({ message: 'Cannot message yourself' });
    }

    // Check if conversation already exists between these two users for this property
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
      ...(propertyId ? { property: propertyId } : {}),
    }).populate('participants', 'name email role avatar')
      .populate('property', 'title images location')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
        property: propertyId || null,
        unreadCount: { [recipientId]: 0, [senderId.toString()]: 0 },
      });
      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name email role avatar')
        .populate('property', 'title images location')
        .populate('lastMessage');
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/chat/conversations — get all conversations for current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email role avatar')
      .populate('property', 'title images location')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/chat/conversations/:id/messages — get messages in a conversation
router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar role')
      .sort({ createdAt: 1 });

    // Mark all messages as read for this user
    await Message.updateMany(
      { conversation: req.params.id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Reset unread count for this user
    await Conversation.findByIdAndUpdate(req.params.id, {
      $set: { [`unreadCount.${req.user._id}`]: 0 }
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @POST /api/chat/conversations/:id/messages — send a message (REST fallback)
router.post('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const message = await Message.create({
      conversation: req.params.id,
      sender: req.user._id,
      text: req.body.text,
      readBy: [req.user._id],
    });

    const populated = await Message.findById(message._id).populate('sender', 'name avatar role');

    // Update conversation lastMessage and unread counts for other participants
    const otherParticipants = conversation.participants.filter(p => p.toString() !== req.user._id.toString());
    const unreadUpdate = {};
    for (const participantId of otherParticipants) {
      const current = conversation.unreadCount?.get(participantId.toString()) || 0;
      unreadUpdate[`unreadCount.${participantId}`] = current + 1;
    }

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
      ...unreadUpdate,
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/chat/unread — total unread count for current user
router.get('/unread', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id });
    const total = conversations.reduce((sum, c) => {
      return sum + (c.unreadCount?.get(req.user._id.toString()) || 0);
    }, 0);
    res.json({ total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @GET /api/chat/agents — get all agents for buyers to start a chat
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await User.find({ role: { $in: ['agent', 'admin'] }, isActive: true, _id: { $ne: req.user._id } }).select('name email role avatar bio phone');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
