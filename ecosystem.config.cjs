module.exports = {
  apps: [
    {
      name: "bantuanku-api",
      cwd: __dirname,
      script: "npm",
      args: "run start -w apps/api",
      env: {
        NODE_ENV: "production",
        API_HOST: "127.0.0.1",
        API_PORT: "3001",
      },
    },
    {
      name: "bantuanku-admin",
      cwd: __dirname,
      script: "npm",
      args: "run start -w apps/admin",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "bantuanku-web",
      cwd: __dirname,
      script: "npm",
      args: "run start -w apps/web",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
