const { createClient } = require("redis");

const client = createClient({
  username: "default",
  password: "XTUO06Q1sxnxUYWO7VaBPZXCDHHQWmci",
  socket: {
    host: "redis-10550.c278.us-east-1-4.ec2.redns.redis-cloud.com",
    port: 10550,
  },
});

client.on("connect", () => {
  console.log("✅ Redis connected");
});

client.on("error", (err) => console.log("Redis Client Error", err));

client.connect();

module.exports = client;
