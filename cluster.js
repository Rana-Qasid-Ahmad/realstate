// ============================================================
// cluster.js — Multi-core Node.js process management
//
// Node.js runs on a single CPU core by default.
// This file spawns one worker process per CPU core,
// multiplying throughput linearly with core count.
//
// 4 cores = 4x capacity
// 8 cores = 8x capacity
//
// Usage: node cluster.js (instead of node server.js)
// PM2:   pm2 start cluster.js -i max  (auto-detects core count)
// ============================================================

const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`🚀 Primary process ${process.pid} running`);
  console.log(`🔁 Spawning ${numCPUs} worker processes...`);

  // Fork one worker per CPU core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Auto-restart crashed workers
  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️  Worker ${worker.process.pid} died (${signal || code}). Restarting...`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} online`);
  });

} else {
  // Each worker runs the full Express + Socket.io server
  // Socket.io scaling across workers is handled by the Redis adapter
  require('./server.js');
}
