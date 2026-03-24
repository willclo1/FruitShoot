module.exports = {
  apps: [
    {
      name: "fruitshoot-expo",
      cwd: ".",
      script: "npx",
      args: "expo start --tunnel --clear",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      time: true
    }
  ]
};