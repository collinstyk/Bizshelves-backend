const mongoose = require("mongoose");

const companyProductSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
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
      required: true,
    },
    inventory: {
      type: Map,
      of: Number, // { "carton": 10, "bottle": 5 }
      default: {},
    },
    productionDate: Date,
    expiryDate: Date,
  },
  {
    timestamps: true,
  }
);

const CompanyProduct = mongoose.model("CompanyProduct", companyProductSchema);

module.exports = CompanyProduct;
