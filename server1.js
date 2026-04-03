// ============================================================
//  PM2 Ecosystem Config
//
//  Start app  :  ./node_modules/.bin/pm2 start ecosystem.config.js
//  Check status:  ./node_modules/.bin/pm2 status
//  View logs  :  ./node_modules/.bin/pm2 logs nc-checker
//  Restart    :  ./node_modules/.bin/pm2 restart nc-checker
//  Stop       :  ./node_modules/.bin/pm2 stop nc-checker
// ============================================================

module.exports = {
  apps: [
    {
      // App name — used in all pm2 commands
      name: "nc-checker",

      // Entry point file
      script: "server.js",

      // Number of instances to run (1 is fine for this tool)
      instances: 1,

      // Automatically restart if the app crashes
      autorestart: true,

      // Don't watch files for changes (not needed in production)
      watch: false,

      // Restart if memory usage goes above 200MB
      max_memory_restart: "200M",

      // Environment variables passed to the app
      env: {
        NODE_ENV: "production",
        PORT: 4423
      },

      // Log file locations (created automatically)
      out_file:        "./logs/out.log",    // normal logs
      error_file:      "./logs/error.log",  // error logs
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};