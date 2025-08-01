const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const userRouter = require("./routes/userRoute");
const productRouter = require("./routes/productRoute");
const salesRouter = require("./routes/salesRoute");
const purchaseRouter = require("./routes/purchaseRoute");

const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

const app = express();

app.use(cors());

app.use(morgan("dev"));

app.use(express.json());

app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/purchase", purchaseRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/product", productRouter);

app.use(globalErrorHandler);

module.exports = app;
