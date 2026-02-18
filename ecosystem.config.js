module.exports = {
  apps: [
    {
      name: 'tipovacka',
      script: 'server/dist/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Restart if the app crashes
      autorestart: true,
      // Restart if memory exceeds 300MB
      max_memory_restart: '300M',
      // Log files
      out_file: './logs/app-out.log',
      error_file: './logs/app-error.log',
      // Merge stdout and stderr into one log
      merge_logs: true,
      // Prepend timestamps to logs
      time: true,
    },
  ],
};
