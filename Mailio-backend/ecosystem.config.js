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
