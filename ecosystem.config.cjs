module.exports = {
  apps: [
    {
      name: "govt-frontend",
      script: ".output/server/index.mjs",
      interpreter: "node",
      cwd: "/root/govt-frontend",
      env: {
        PORT: 5005,
        NODE_ENV: "production",
      },
    },
  ],
};
