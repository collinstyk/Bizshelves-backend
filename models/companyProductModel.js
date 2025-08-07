const mongoose = require("mongoose");

const companyProductSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    costPricePerUnit: {
      type: Map,
      of: Number, // e.g. { "carton": 50000, "bottle": 5500 }
      required: true,
    },
    sellingPricePerUnit: {
      type: Map,
      of: Number, // e.g. { "carton": 50000, "bottle": 5500 }
      required: false,
    },
    inventory: {
      type: Map,
      of: Number, // { "carton": 10, "bottle": 5 }
      default: {},
    },
    status: {
      type: String,
      enum: [
        "SELLING_PRICE_SET",
        "COST_PRICE_SET",
        "SELLING_PRICE_NOT_SET",
        "COST_PRICE_NOT_SET",
      ],
    },
    category: {
      type: String,
      required: [true, "Please provide a category for this product"],
    },
    productionDate: Date,
    expiryDate: Date,
    batchId: String,
  },
  {
    timestamps: true,
  }
);

const CompanyProduct = mongoose.model("CompanyProduct", companyProductSchema);

module.exports = CompanyProduct;
