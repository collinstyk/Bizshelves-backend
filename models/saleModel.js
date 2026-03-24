const mongoose = require("mongoose");

const {
  TransactionState,
  DeliveryStatus,
  PaymentStatus,
} = require("./../utils/constants");

const saleSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: function () {
        return this.saleState === "CONFIRMED";
      },
    },
    company: { type: mongoose.Schema.ObjectId, ref: "Company", required: true },
    seller: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    totalSaleAmount: { type: Number, required: true },
    totalPaid: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank transfer", "POS", "credit"],
      default: "cash",
    },
    saleState: {
      type: String,
      required: true,
      enum: Object.values(TransactionState),
    },
    deliveryStatus: {
      type: String,
      required: true,
      enum: Object.values(DeliveryStatus),
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: Object.values(PaymentStatus),
    },

    createdAt: { type: Date, default: Date.now },
    confirmedAt: Date,
  },
  { timestamps: true },
);

const Sale = mongoose.model("Sale", saleSchema);

module.exports = Sale;

// TODO
// Different Payment method can exist on one sale, depending on the payment status
