const mongoose = require("mongoose");

const { ReceivingStatus } = require("../utils/constants");
const Purchase = require("./purchaseModel");

const purchaseItemSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyProduct",
      required: true,
      index: true,
    },
    quantityOrdered: {
      type: Number,
      required: true,
      min: [1, "Quantity ordered must be greater than 0"],
    },
    packagingUnit: { type: String, required: true, min: 1 },
    unitsPerPackage: { type: String, required: true, min: 1 },
    quantityReceived: {
      type: Number,
      default: 0,
      min: [0, "Quantity received cannot be negative"],
      validate: {
        validator: function (value) {
          return value <= this.quantityOrdered;
        },
        message: "Quantity received cannot exceed quantity ordered",
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price must be greater than or equal to 0"],
    },
    totalPrice: {
      type: Number,
      default: function () {
        return this.quantityOrdered * this.unitPrice;
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field for remaining quantity
purchaseItemSchema.virtual("remainingQuantity").get(function () {
  return this.quantityOrdered - this.quantityReceived;
});

// Update totalPrice before saving
purchaseItemSchema.pre("save", function (next) {
  this.totalPrice = this.quantityOrdered * this.unitPrice;
  next();
});

purchaseItemSchema.pre("findOneAndUpdate", function (next) {
  this.setOptions({ runValidators: true });

  const update = this.getUpdate();

  // Handle both direct updates and $set
  const data = update.$set || update;

  if (data.quantityOrdered !== undefined && data.unitPrice !== undefined) {
    data.totalPrice = data.quantityOrdered * data.unitPrice;
  }

  next();
});

purchaseItemSchema.methods.updateParentPurchase = async function () {
  const purchaseItems = await this.constructor.find({
    purchaseId: this.purchaseId,
  });
  const totalOrdered = purchaseItems.reduce(
    (sum, item) => sum + item.quantityOrdered,
    0,
  );
  const totalReceived = purchaseItems.reduce(
    (sum, item) => sum + item.quantityReceived,
    0,
  );

  let receivingStatus = ReceivingStatus.NOT_RECEIVED;
  if (totalReceived === 0) receivingStatus = ReceivingStatus.NOT_RECEIVED;
  else if (totalReceived < totalOrdered)
    receivingStatus = ReceivingStatus.PARTLY_RECEIVED;
  else receivingStatus = ReceivingStatus.RECEIVED;

  const purchase = await Purchase.findById(this.purchaseId);
  if (!purchase) return;

  purchase.receivingStatus = receivingStatus;

  await purchase.save();
};

// Hooks to update parent purchase
purchaseItemSchema.post("save", async function () {
  await this.updateParentPurchase();
});
purchaseItemSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) await doc.updateParentPurchase();
});

module.exports = mongoose.model("PurchaseItem", purchaseItemSchema);
