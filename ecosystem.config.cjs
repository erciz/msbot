module.exports = {
  apps: [
    {
      name: "msbot",
      script: "pollingApiBot.js",
      interpreter: "node",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        GROUP_MENTION_ONLY: "true",
        REMOVE_WEBHOOK_ON_START: "true"
      }
    }
  ]
};
