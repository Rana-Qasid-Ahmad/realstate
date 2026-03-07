// ============================================================
// chat.js — Routes for the messaging system
// ============================================================

const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');


// ============================================================
// POST /api/chat/conversations
// Start a new conversation OR get an existing one
// ============================================================
router.post('/conversations', protect, async (req, res) => {
  try {
    const { recipientId, propertyId } = req.body;
    const myId = req.user._id;

    // Can't message yourself
    if (recipientId === myId.toString()) {
      return res.status(400).json({ message: 'You cannot message yourself.' });
    }

    // Check if a conversation already exists between these two users
    // about this specific property
    const existingConversation = await Conversation.findOne({
      participants: { $all: [myId, recipientId] },
      property: propertyId || null,
    })
      .populate('participants', 'name email role avatar')
      .populate('property', 'title images location')
      .populate('lastMessage');

    // If a conversation already exists, return it instead of creating a new one
    if (existingConversation) {
      return res.json(existingConversation);
    }

    // Create a new conversation
    const newConversation = await Conversation.create({
      participants: [myId, recipientId],
      property: propertyId || null,
      unreadCount: {},
    });

    // Fetch the created conversation with populated data
    const populatedConversation = await Conversation.findById(newConversation._id)
      .populate('participants', 'name email role avatar')
      .populate('property', 'title images location')
      .populate('lastMessage');

    res.json(populatedConversation);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/chat/conversations
// Get all conversations for the logged in user
// ============================================================
router.get('/conversations', protect, async (req, res) => {
  try {
    // Find all conversations where the current user is a participant
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate('participants', 'name email role avatar')
      .populate('property', 'title images location')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 }); // Most recent conversations first

    res.json(conversations);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/chat/conversations/:id/messages
// Get all messages in a conversation
// ============================================================
router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversationId = req.params.id;

    // Make sure the conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Make sure the logged in user is a participant
    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not part of this conversation.' });
    }

    // Get all messages, oldest first
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar role')
      .sort({ createdAt: 1 });

    // Mark all messages as read by this user
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Reset the unread count for this user to 0
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCount.${req.user._id}`]: 0 },
    });

    res.json(messages);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// POST /api/chat/conversations/:id/messages
// Send a message (REST fallback if socket is unavailable)
// ============================================================
router.post('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Check that the user is part of this conversation
    const isParticipant = conversation.participants.some(
      (participantId) => participantId.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not part of this conversation.' });
    }

    // Create the message
    const newMessage = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text: req.body.text,
      readBy: [req.user._id], // The sender has already "read" their own message
    });

    // Fetch the message with sender info populated
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name avatar role');

    // Update the conversation's lastMessage and increment unread counts
    // for everyone else in the conversation
    const otherParticipants = conversation.participants.filter(
      (participantId) => participantId.toString() !== req.user._id.toString()
    );

    const unreadUpdates = {};
    for (const participantId of otherParticipants) {
      const currentCount = conversation.unreadCount?.get(participantId.toString()) || 0;
      unreadUpdates[`unreadCount.${participantId}`] = currentCount + 1;
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
      lastMessageAt: new Date(),
      ...unreadUpdates,
    });

    res.status(201).json(populatedMessage);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/chat/unread
// Get the total unread message count for the logged in user
// ============================================================
router.get('/unread', protect, async (req, res) => {
  try {
    const myConversations = await Conversation.find({ participants: req.user._id });

    // Add up unread counts across all conversations
    let totalUnread = 0;
    for (const conversation of myConversations) {
      const unreadInThisConversation = conversation.unreadCount?.get(req.user._id.toString()) || 0;
      totalUnread = totalUnread + unreadInThisConversation;
    }

    res.json({ total: totalUnread });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ============================================================
// GET /api/chat/agents
// Get all agents the current user can start a chat with
// ============================================================
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await User.find({
      role: { $in: ['agent', 'admin'] },
      isActive: true,
      _id: { $ne: req.user._id }, // Exclude the current user
    }).select('name email role avatar bio phone');

    res.json(agents);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
