const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

const app = require("./app");

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

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}...`);
});
