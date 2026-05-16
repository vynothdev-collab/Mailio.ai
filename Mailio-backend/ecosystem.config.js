/**
 * PM2 deployment config.
 *
 *   API   → cluster mode (multiple Node processes share the listening port).
 *   Worker → fork mode. NEVER cluster: BullMQ Workers must not share Redis
 *            blocking connections across cluster children. Scale workers by
 *            increasing `instances` (fork) or by deploying more containers.
 *
 * Run `pm2 start ecosystem.config.js` to launch both.
 *
 * Until Phase 2 (global Redis limiter) lands, KEEP `worker.instances = 1`.
 * Each worker still enforces the 57/10s ceiling per-process, so running
 * more than one concurrently will overshoot the third-party API.
 */
module.exports = {
  apps: [
    {
      name: 'mailio-api',
      script: 'dist/main.api.js',
      exec_mode: 'cluster',
      instances: process.env.API_INSTANCES || 'max',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
    },
    {
      name: 'mailio-worker',
      script: 'dist/main.worker.js',
      exec_mode: 'fork',
      instances: parseInt(process.env.WORKER_INSTANCES || '1', 10),
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G',
      kill_timeout: 30000,
    },
  ],
};
