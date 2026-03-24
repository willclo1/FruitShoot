module.exports = {
  apps: [
    {
      name: "fruitshoot-expo",
      cwd: ".",
      script: "npx",
      args: "expo start --tunnel --clear",
      env: {
        EXPO_TUNNEL_SUBDOMAIN: "fruitshoot"
      },
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 5000,
      time: true
    }
  ]
};