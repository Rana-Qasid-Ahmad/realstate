const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/chat', require('./routes/chat'));

app.get('/', (req, res) => res.json({ message: 'RealVista API Running ✅' }));

const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Auth failed'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.user.name}`);
  socket.join(socket.user._id.toString());

  socket.on('join_conversation', (conversationId) => socket.join(conversationId));
  socket.on('leave_conversation', (conversationId) => socket.leave(conversationId));

  socket.on('send_message', async ({ conversationId, text }) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      const isParticipant = conversation.participants.some(p => p.toString() === socket.user._id.toString());
      if (!isParticipant) return;

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.user._id,
        text,
        readBy: [socket.user._id],
      });

      const populated = await Message.findById(message._id).populate('sender', 'name avatar role');

      const otherParticipants = conversation.participants.filter(p => p.toString() !== socket.user._id.toString());
      const unreadUpdate = {};
      for (const participantId of otherParticipants) {
        const current = conversation.unreadCount?.get(participantId.toString()) || 0;
        unreadUpdate[`unreadCount.${participantId}`] = current + 1;
      }

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastMessageAt: new Date(),
        ...unreadUpdate,
      });

      io.to(conversationId).emit('new_message', populated);
      for (const participantId of otherParticipants) {
        io.to(participantId.toString()).emit('unread_update', { conversationId });
      }
    } catch (err) {
      console.error('Socket error:', err);
    }
  });

  socket.on('typing', ({ conversationId }) => {
    socket.to(conversationId).emit('user_typing', { userId: socket.user._id, name: socket.user.name });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(conversationId).emit('user_stop_typing', { userId: socket.user._id });
  });

  socket.on('disconnect', () => console.log(`🔌 Disconnected: ${socket.user.name}`));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(process.env.PORT || 5000, () => console.log(`🚀 Server on port ${process.env.PORT || 5000}`));
  })
  .catch(err => console.error('❌ DB Error:', err));
