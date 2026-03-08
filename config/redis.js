// ============================================================
// redis.js — Redis client with graceful fallback
//
// If Redis is not running (e.g. local dev without Redis installed),
// the app starts normally — caching and socket scaling are just
// skipped. No crash, no blocking.
//
// In production: set REDIS_HOST/PORT/PASSWORD in .env
// Locally:       either install Redis, or just leave it — app works without it
// ============================================================

const Redis = require('ioredis');

let redisClient = null;
let redisSubscriber = null;
let redisAvailable = false;

function isRedisAvailable() { return redisAvailable; }

function getRedisConfig() {
  const isUpstash = process.env.REDIS_HOST && process.env.REDIS_HOST.includes('upstash.io');

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    // Upstash requires TLS — auto-detected from hostname
    tls: isUpstash ? { rejectUnauthorized: false } : undefined,
    // Retry up to 3 times then stop (don't spam retries in dev)
    retryStrategy: (times) => {
      if (times >= 3) return null;
      return 1000;
    },
    enableOfflineQueue: true,
    lazyConnect: true,
    connectTimeout: 4000,
    maxRetriesPerRequest: 1,
  };
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(getRedisConfig());
    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('✅ Redis connected — caching and socket scaling enabled');
    });
    redisClient.on('close', () => { redisAvailable = false; });
    redisClient.on('error', (err) => {
      redisAvailable = false;
      if (err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
        // suppress repeat errors — one warning is enough (printed in connectRedis)
      } else {
        console.error('Redis error:', err.message);
      }
    });
  }
  return redisClient;
}

function getRedisSubscriber() {
  if (!redisSubscriber) {
    redisSubscriber = new Redis(getRedisConfig());
    redisSubscriber.on('error', () => {}); // primary client already logs
  }
  return redisSubscriber;
}

// -------------------------------------------------------
// connectRedis() — call once at startup BEFORE setting up
// the socket.io adapter. Resolves either way — never rejects.
// -------------------------------------------------------
async function connectRedis() {
  try {
    const pub = getRedisClient();
    const sub = getRedisSubscriber();
    // Both must connect before the socket adapter is created
    await Promise.all([pub.connect(), sub.connect()]);
    redisAvailable = true;
    console.log('✅ Redis ready');
  } catch {
    redisAvailable = false;
    console.warn('⚠️  Redis not available — running without cache (app works fine without it)');
    console.warn('   To enable: install Redis locally or set REDIS_HOST in .env');
  }
}

// -------------------------------------------------------
// Cache helpers — all silently no-op if Redis is down
// -------------------------------------------------------

async function cacheGet(key) {
  if (!redisAvailable) return null;
  try {
    const val = await getRedisClient().get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  if (!redisAvailable) return;
  try {
    await getRedisClient().setex(key, ttlSeconds, JSON.stringify(value));
  } catch {}
}

async function cacheDel(key) {
  if (!redisAvailable) return;
  try { await getRedisClient().del(key); } catch {}
}

async function cacheDelPattern(pattern) {
  if (!redisAvailable) return;
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
  } catch {}
}

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  connectRedis,
  isRedisAvailable,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
};