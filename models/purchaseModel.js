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

const purchaseSchema = new mongoose.Schema(
  {
    boughtFrom: {
      type: String,
      required: true,
    },
    company: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "Company",
    },
    recievedBy: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "User",
    },
    products: [productSaleSchema],
    transportationCost: Number,
    totalPurchaseCost: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank transfer", "POS", "credit"],
      default: "bank transfer",
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Purchase = mongoose.model("Purchase", purchaseSchema);

module.exports = Purchase;
