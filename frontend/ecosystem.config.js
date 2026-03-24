module.exports = {
  apps: [
    {
      name: "fruitshoot-expo",
      cwd: ".",
      script: "npx",
      args: "expo start --clear",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      time: true
    },
    {
      name: "fruitshoot-ngrok",
      cwd: ".",
      script: "ngrok",
      args: "http 8081 --log=stdout",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      time: true
    }
  ]
};