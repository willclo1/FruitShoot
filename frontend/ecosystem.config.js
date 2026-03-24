module.exports = {
  apps: [
    {
      name: "fruitshoot-expo",
      cwd: ".",
      script: "script",
      args: "-q /dev/null npx expo start --tunnel --clear",
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      time: true
    }
  ]
};