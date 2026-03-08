// ============================================================
// server.js — Express + Socket.io with graceful Redis fallback
//
// Redis is OPTIONAL for local dev. If not running:
//   - API works fully (no caching, but correct)
//   - Socket.io works on single server (no multi-server sync)
//   - Email queue skipped (emails sent inline instead)
//
// In production with Redis: full scaling enabled automatically.
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const compression = require('compression');
const jwt = require('jsonwebtoken');

dotenv.config();

const { connectRedis, getRedisClient, getRedisSubscriber, isRedisAvailable, cacheGet } = require('./config/redis');

async function startServer() {
  // -------------------------------------------------------
  // 1. Connect Redis FIRST (before socket adapter setup)
  //    connectRedis() never throws — app starts either way
  // -------------------------------------------------------
  await connectRedis();

  // -------------------------------------------------------
  // 2. Create Express + HTTP server
  // -------------------------------------------------------
  const app = express();
  const server = http.createServer(app);

  // -------------------------------------------------------
  // 3. Socket.io — attach Redis adapter only if Redis is up
  // -------------------------------------------------------
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  if (isRedisAvailable()) {
    // Production path: all servers share socket state via Redis
    io.adapter(createAdapter(getRedisClient(), getRedisSubscriber()));
    console.log('✅ Socket.io Redis adapter enabled (multi-server chat ready)');
  } else {
    // Dev / no-Redis path: single-server socket.io (default in-memory adapter)
    console.log('ℹ️  Socket.io using in-memory adapter (fine for single server / local dev)');
  }

  app.set('io', io);

  // -------------------------------------------------------
  // 4. Middleware
  // -------------------------------------------------------
  app.use(compression());
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(hpp());

  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { message: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many auth attempts. Please wait 15 minutes.' },
  });

  // -------------------------------------------------------
  // 5. Routes
  // -------------------------------------------------------
  app.use('/api/auth', authLimiter, require('./routes/auth'));
  app.use('/api/properties', require('./routes/properties'));
  app.use('/api/agents', require('./routes/agents'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/inquiries', require('./routes/inquiries'));
  app.use('/api/chat', require('./routes/chat'));

  app.get('/health', (req, res) => res.json({
    status: 'ok',
    pid: process.pid,
    redis: isRedisAvailable() ? 'connected' : 'unavailable',
  }));
  app.get('/', (req, res) => res.json({ message: 'RealVista API Running ✅' }));

  // -------------------------------------------------------
  // 6. Socket.io auth + events
  // -------------------------------------------------------
  const Message = require('./models/Message');
  const Conversation = require('./models/Conversation');
  const User = require('./models/User');

  async function updateConversationAfterMessage(conversationId, messageId, senderId, conversation) {
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== senderId.toString()
    );
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

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try Redis cache first, fall back to DB
      let user = await cacheGet(`user:${decoded.id}`);
      if (!user) {
        user = await User.findById(decoded.id).select('-password').lean();
        if (!user) return next(new Error('User not found'));
      }

      if (!user.isActive) return next(new Error('Account deactivated'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.user._id.toString());

    socket.on('join_conversation', (id) => socket.join(id));
    socket.on('leave_conversation', (id) => socket.leave(id));

    socket.on('send_message', async ({ conversationId, text }) => {
      try {
        if (!text?.trim()) return;
        const conversation = await Conversation.findById(conversationId).lean();
        if (!conversation) return;
        const isParticipant = conversation.participants.some(p => p.toString() === socket.user._id.toString());
        if (!isParticipant) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          text: text.trim(),
          isRead: false,
        });

        const populated = await Message.findById(message._id).populate('sender', 'name avatar role').lean();
        const otherParticipants = await updateConversationAfterMessage(conversationId, message._id, socket.user._id, conversation);

        io.to(conversationId).emit('new_message', populated);
        for (const pid of otherParticipants) {
          io.to(pid.toString()).emit('unread_update', { conversationId });
        }
      } catch (err) {
        console.error('Socket send_message error:', err.message);
      }
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', { userId: socket.user._id, name: socket.user.name });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user_stop_typing', { userId: socket.user._id });
    });
  });

  // -------------------------------------------------------
  // 7. Connect MongoDB + start listening
  // -------------------------------------------------------
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ MongoDB connected');

  const port = process.env.PORT || 5000;
  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port} (PID ${process.pid})`);
    console.log(`   Redis: ${isRedisAvailable() ? '✅ enabled' : '⚠️  disabled (no caching)'}`);
  });

  // -------------------------------------------------------
  // 8. Graceful shutdown
  // -------------------------------------------------------
  process.on('SIGTERM', async () => {
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  });
}

// Start — catch any unexpected startup error
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
