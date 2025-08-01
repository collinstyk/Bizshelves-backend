const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const app = require("./app");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // origin: "http://localhost:5173", // To be edited during production
    methods: ["GET", "POST"],
  },
});

const DB = process.env.DATABASE.replace(/<username>|<password>/g, (match) => {
  const replaceObj = {
    "<username>": process.env.DATABASE_USERNAME,
    "<password>": process.env.DATABASE_PASSWORD,
  };
  return replaceObj[match];
});

mongoose
  .connect(DB)
  .then(() => {
    console.log("DB connection successful!");
  })
  .catch((err) => {
    console.error("DB connection error:", err.message);
  });

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  socket.on("check-product", (data) => {
    console.log("Product check requested", data);

    // Just a test example, to be editted when trying to send sales data
    const testStockQuantity = 200;

    if (data.quantity > testStockQuantity) {
      socket.emit("product-status", {
        status: "insufficient",
        message: "Not enough inventory",
      });
    } else {
      socket.emit("product-status", {
        status: "available",
        message: "Product is available",
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const port = 3000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}...`);
});
