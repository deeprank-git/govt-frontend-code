module.exports = {
  apps: [
    {
      name: "govt-frontend",
      script: "dist/server/index.mjs",
      interpreter: "node",
      cwd: "/root/govt-prep/govt-frontend-code",
      env: {
        PORT: 5005,
        NODE_ENV: "production",
      },
    },
  ],
};
