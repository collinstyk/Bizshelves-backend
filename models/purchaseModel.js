const mongoose = require("mongoose");

const PurchaseStatus = {
  PAID_NOT_RECEIVED: "PAID_NOT_RECEIVED",
  PAID_RECEIVED: "PAID_RECEIVED",
  PAID_PARTLY_RECEIVED: "PAID_PARTLY_RECEIVED",
  NOT_PAID_NOT_RECEIVED: "NOT_PAID_NOT_RECEIVED", // will be replaced by draft most times unless any special case
  NOT_PAID_RECEIVED: "NOT_PAID_RECEIVED",
  NOT_PAID_PARTLY_RECEIVED: "NOT_PAID_PARTLY_RECEIVED",
  PARTLY_PAID_RECEIVED: "PARTLY_PAID_RECEIVED",
  PARTLY_PAID_NOT_RECEIVED: "PARTLY_PAID_NOT_RECEIVED",
  PARTLY_PAID_PARTLY_RECEIVED: "PARTLY_PAID_PARTLY_RECEIVED",
  DRAFT: "DRAFT",
};

const breakdownSchema = new mongoose.Schema(
  {
    unit: { type: String, required: true }, // carton
    quantity: { type: Number, required: true }, // 4
    expiryDate: { type: Date },
    purchasePrice: { type: Number },
    batchId: { type: String },
  },
  { _id: false }
);

const productSaleSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.ObjectId, ref: "CompanyProduct" },
    breakdown: [breakdownSchema],
    receivedBreakdown: [breakdownSchema],
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
    purchasedBy: {
      type: mongoose.Schema.ObjectId,
      required: true,
      ref: "User",
    },
    recievedBy: { type: mongoose.Schema.ObjectId, ref: "User" }, // should be updated when the product(s) is received
    products: [productSaleSchema],
    status: {
      type: String,
      required: true,
      enum: Object.values(PurchaseStatus),
    },
    amountPaid: { type: Number, default: 0 }, // should be indicated when payment is made
    totalProductCost: { type: Number, required: true },
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

/*
{
  boughtFrom: 'Chrisemua and sons',
  purchaseBy: mongoDbObjectID,
  recievedBy: mongoDbObjectID,
  products: [{product: 'Jameson'
              }]
}
*/
