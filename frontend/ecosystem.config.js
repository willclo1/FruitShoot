module.exports = {
  apps: [
    {
      name: "fruitshoot-expo",
      cwd: "./frontend",
      script: "npx",
      args: "expo start --tunnel",
      env: {
        CI: "1"
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000
    }
  ]
};