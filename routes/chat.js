const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

async function updateConversationAfterMessage(conversationId, messageId, senderId, conversation) {
  const otherParticipants = conversation.participants.filter(p => p.toString() !== senderId.toString());
  const unreadUpdate = {};
  for (const participantId of otherParticipants) {
    const current = conversation.unreadCount?.get(participantId.toString()) || 0;
    unreadUpdate[`unreadCount.${participantId}`] = current + 1;
  }
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: messageId,
    lastMessageAt: new Date(),
    ...unreadUpdate,
  });
  return otherParticipants;
}

router.post('/conversations', protect, async (req, res) => {
  try {
    const { recipientId, propertyId } = req.body;
    const senderId = req.user._id;
    if (recipientId === senderId.toString()) return res.status(400).json({ message: 'Cannot message yourself' });

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

router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name email role avatar')
      .populate('property', 'title images location')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })
      .lean();
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar role')
      .sort({ createdAt: 1 })
      .lean();

    // Mark unread messages as read + reset unread counter in parallel
    await Promise.all([
      Message.updateMany(
        { conversation: req.params.id, sender: { $ne: req.user._id }, isRead: false },
        { isRead: true, readAt: new Date() }
      ),
      Conversation.findByIdAndUpdate(req.params.id, {
        $set: { [`unreadCount.${req.user._id}`]: 0 }
      }),
    ]);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
    const isParticipant = conversation.participants.some(p => p.toString() === req.user._id.toString());
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });
    if (!req.body.text?.trim()) return res.status(400).json({ message: 'Message text is required' });

    const message = await Message.create({
      conversation: req.params.id,
      sender: req.user._id,
      text: req.body.text.trim(),
      isRead: false,
    });

    const populated = await Message.findById(message._id).populate('sender', 'name avatar role').lean();
    await updateConversationAfterMessage(req.params.id, message._id, req.user._id, conversation);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .select('unreadCount')
      .lean();
    const total = conversations.reduce((sum, c) => {
      const map = c.unreadCount;
      return sum + (map instanceof Map ? (map.get(req.user._id.toString()) || 0) : (map?.[req.user._id.toString()] || 0));
    }, 0);
    res.json({ total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await User.find({
      role: { $in: ['agent', 'admin'] },
      isActive: true,
      _id: { $ne: req.user._id }
    }).select('name email role avatar bio phone').lean();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
