const mongoose = require("mongoose");

const breakdownSchema = new mongoose.Schema(
  {
    unit: String,
    quantity: Number,
    pricePerUnit: Number,
  },
  { _id: false }
);

const productSaleSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.ObjectId, ref: "CompanyProduct" },
    breakdown: [breakdownSchema],
    totalPrice: Number,
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.ObjectId, ref: "Company", required: true },
    soldBy: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    products: [productSaleSchema],
    totalSaleAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank transfer", "POS", "credit"],
      default: "cash",
    },
    customerName: String,
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);

module.exports = Sale;
