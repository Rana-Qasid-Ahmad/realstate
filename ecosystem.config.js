// ============================================================
// ecosystem.config.js — PM2 process manager configuration
//
// PM2 = production process manager for Node.js
// Install: npm install -g pm2
// Start:   pm2 start ecosystem.config.js
// Monitor: pm2 monit
// Logs:    pm2 logs
// ============================================================

module.exports = {
  apps: [
    {
      name: 'realvista-api',
      script: 'cluster.js',       // Uses cluster.js to spawn 1 process per CPU
      instances: 1,               // cluster.js handles forking — set to 1 here
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M', // auto-restart if memory exceeds 500MB (memory leak protection)
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Restart strategy: exponential backoff
      min_uptime: '10s',
      max_restarts: 10,
      // Log settings
      out_file: './logs/api-out.log',
      error_file: './logs/api-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      // Separate process for background email sending
      name: 'realvista-email-worker',
      script: 'workers/emailWorker.js',
      instances: 1,               // one worker is enough unless email volume is huge
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
      },
      out_file: './logs/worker-out.log',
      error_file: './logs/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
