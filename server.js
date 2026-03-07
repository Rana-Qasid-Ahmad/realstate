// ============================================================
// server.js — The main entry point of the backend
// This file sets up Express, Socket.io, and connects to MongoDB
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load .env variables into process.env
dotenv.config();

// -------------------------------------------------------
// Step 1: Create the Express app and HTTP server
// We need a raw HTTP server (not just Express) so Socket.io can attach to it
// -------------------------------------------------------
const app = express();
const httpServer = http.createServer(app);

// -------------------------------------------------------
// Step 2: Attach Socket.io to the HTTP server
// Socket.io handles real-time connections (the chat feature)
// -------------------------------------------------------
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible in route files via req.app.get('io')
app.set('io', io);

// -------------------------------------------------------
// Step 3: Register Express middlewares
// Middleware runs on every request before reaching routes
// -------------------------------------------------------

// Allow requests from the frontend (CORS = Cross-Origin Resource Sharing)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse JSON request bodies (so we can read req.body)
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// -------------------------------------------------------
// Step 4: Register all route files
// Each file handles a group of related endpoints
// -------------------------------------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/chat', require('./routes/chat'));

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'RealVista API is running ✅' });
});

// -------------------------------------------------------
// Step 5: Set up Socket.io real-time chat
// -------------------------------------------------------

// Import models needed for socket message handling
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Socket.io middleware: verify the token before allowing a connection
io.use(async (socket, next) => {
  try {
    // The frontend sends the token when connecting
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('No token provided.'));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user and attach to the socket
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found.'));
    }

    socket.user = user;
    next();

  } catch (error) {
    next(new Error('Token is invalid.'));
  }
});

// Handle socket events when a user connects
io.on('connection', (socket) => {
  console.log(`🔌 ${socket.user.name} connected`);

  // Join a personal room named after the user's ID
  // Used for sending notifications directly to one user
  socket.join(socket.user._id.toString());

  // User opens a conversation: join the room for that conversation
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
  });

  // User leaves a conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
  });

  // User sends a message
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, text } = data;

      // Make sure the conversation exists
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      // Make sure the sender is a participant
      const isParticipant = conversation.participants.some(
        (id) => id.toString() === socket.user._id.toString()
      );
      if (!isParticipant) return;

      // Save the message to the database
      const newMessage = await Message.create({
        conversation: conversationId,
        sender: socket.user._id,
        text: text,
        readBy: [socket.user._id],
      });

      // Fetch the message with sender details for the frontend
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'name avatar role');

      // Find the other participants (not the sender)
      const otherParticipants = conversation.participants.filter(
        (id) => id.toString() !== socket.user._id.toString()
      );

      // Build the unread count update for each other participant
      const unreadUpdates = {};
      for (const participantId of otherParticipants) {
        const currentCount = conversation.unreadCount?.get(participantId.toString()) || 0;
        unreadUpdates[`unreadCount.${participantId}`] = currentCount + 1;
      }

      // Update the conversation with the latest message info
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: newMessage._id,
        lastMessageAt: new Date(),
        ...unreadUpdates,
      });

      // Broadcast the message to everyone in the conversation room
      io.to(conversationId).emit('new_message', populatedMessage);

      // Also notify other participants so they can update their badge count
      for (const participantId of otherParticipants) {
        io.to(participantId.toString()).emit('unread_update', { conversationId });
      }

    } catch (error) {
      console.error('Socket message error:', error);
    }
  });

  // Typing indicator: tell others someone is typing
  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('user_typing', {
      userId: socket.user._id,
      name: socket.user.name,
    });
  });

  // Stop typing
  socket.on('stop_typing', (data) => {
    socket.to(data.conversationId).emit('user_stop_typing', {
      userId: socket.user._id,
    });
  });

  // User disconnected
  socket.on('disconnect', () => {
    console.log(`🔌 ${socket.user.name} disconnected`);
  });
});

// -------------------------------------------------------
// Step 6: Connect to MongoDB, then start the server
// We wait for the database before accepting any requests
// -------------------------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });
