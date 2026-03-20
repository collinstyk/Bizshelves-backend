const mongoose = require("mongoose");
const {
  PurchaseState,
  ReceivingStatus,
  PaymentStatus,
} = require("./../utils/constants");

const purchaseSchema = new mongoose.Schema(
  {
    supplier: {
      type: String,
      required: function () {
        return this.PurchaseState === "CONFIRMED";
      },
    },
    company: { type: mongoose.Schema.ObjectId, required: true, ref: "Company" },
    purchaser: { type: mongoose.Schema.ObjectId, required: true, ref: "User" },
    recipient: { type: mongoose.Schema.ObjectId, ref: "User" },
    purchaseState: {
      type: String,
      required: true,
      enum: Object.values(PurchaseState),
    },
    receivingStatus: {
      type: String,
      required: true,
      enum: Object.values(ReceivingStatus),
      default: ReceivingStatus.NOT_RECEIVED,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.NOT_PAID,
    },
    amountPaid: { type: Number, default: 0 },
    totalProductCost: { type: Number, default: 0 },
    transportationCost: { type: Number, default: 0 },
    extraCost: { type: Number, default: 0 },
    totalPurchaseCost: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank transfer", "POS", "credit"],
      default: "bank transfer",
    },
    createdAt: { type: Date, default: Date.now },
    confirmedAt: Date,
  },
  { timestamps: true },
);

purchaseSchema.pre("save", function (next) {
  this.totalPurchaseCost =
    this.totalProductCost +
    (this.transportationCost || 0) +
    (this.extraCost || 0);

  next();
});

// Update

const Purchase = mongoose.model("Purchase", purchaseSchema);

module.exports = Purchase;
