const mongoose = require("mongoose");

const { DeliveryStatus } = require("./../utils/constants");
const Sale = require("./saleModel");

const saleItemSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
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
    packagingUnit: { type: String, required: true },
    quantityDelivered: {
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
saleItemSchema.virtual("remainingQuantity").get(function () {
  return this.quantityOrdered - this.quantityDelivered;
});

saleItemSchema.pre("save", function (next) {
  this.totalPrice = this.quantityOrdered * this.unitPrice;
  next();
});

saleItemSchema.methods.updateParentSale = async function (session) {
  const sale = await Sale.findById(this.saleId).session(session);
  if (!sale) return;

  const saleItems = await this.constructor
    .find({ saleId: this.saleId })
    .session(session);

  let totalOrdered = 0;
  let totalDelivered = 0;

  for (const item of saleItems) {
    totalOrdered += item.quantityOrdered;
    totalDelivered += item.quantityDelivered;
  }

  let deliveryStatus;

  if (totalDelivered === 0) {
    deliveryStatus = DeliveryStatus.NOT_DELIVERED;
  } else if (totalDelivered < totalOrdered) {
    deliveryStatus = DeliveryStatus.PARTLY_DELIVERED;
  } else {
    deliveryStatus = DeliveryStatus.DELIVERED;
  }

  sale.deliveryStatus = deliveryStatus;

  await sale.save({ session });
};

saleItemSchema.post("save", async function () {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await this.updateParentSale(session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
});

saleItemSchema.post("findOneAndUpdate", async function () {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    await this.updateParentSale(session);

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
});

module.exports = mongoose.model("SaleItem", saleItemSchema);
