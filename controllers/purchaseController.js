const catchAsync = require("../utils/catchAsync");

const Purchase = require("../models/purchaseModel");
const Product = require("../models/productModel");
const CompanyProduct = require("../models/companyProductModel");
const AppError = require("../utils/appError");

exports.recordPurchase = catchAsync(async (req, res, next) => {
  // 1) extract the user id and company id from the req.user
  if (!req.user)
    return new AppError(400, "Login or sign up to perform this action.");
  const { _id: userId, company: companyId } = req.user;

  // 2) Extract the neccesary data from the request body
  const {
    boughtFrom,
    receivedBy,
    totalProductCost,
    transportationCost,
    products, // either has product (productId) or name and category
    status,
    paymentMethod,
  } = req.body;

  const purchasedProducts = [];

  for (const item of products) {
    const {
      name,
      packagingUnits,
      baseUnit,
      category,
      product,
      breakdown,
      totalPrice,
    } = item;

    let receivedBreakdown = item.receivedBreakdown || [];

    if (
      ["PAID_RECEIVED", "NOT_PAID_RECEIVED", "PARTLY_PAID_RECEIVED"].includes(
        status
      )
    )
      receivedBreakdown = breakdown.map((b) => {
        return {
          unit: b.unit,
          quantity: b.quantity,
          purchasePrice: b.purchasePrice,
        };
      });

    // if product is sent, name, packagingUnits, baseUnit, category are not required

    let productId;

    if (product) {
      const existingProduct = await Product.findById(product);
      if (!existingProduct) {
        return next(new AppError(404, "Product not found"));
      }
      productId = existingProduct._id;
    } else if (name && category) {
      const existingProduct = await Product.findOne({
        name,
        category,
      });
      if (!existingProduct) {
        const newProduct = await Product.create({
          name,
          category,
          baseUnit,
          packagingUnits,
        });

        productId = newProduct._id;
      }

      productId = existingProduct._id;
    }

    const existingCompanyProduct = await CompanyProduct.findOne({
      company: companyId,
      product: productId,
    });

    if (!existingCompanyProduct) {
      await CompanyProduct.create({
        company: companyId,
        product: productId,
        costPricePerUnit: breakdown.reduce((acc, item) => {
          acc[item.unit] = item.purchasePrice;
          return acc;
        }, {}),
        category,
      });
    }

    purchasedProducts.push({
      productId,
      breakdown,
      receivedBreakdown,
      totalPrice,
    });
  }

  if (
    ["PAID_RECEIVED", "NOT_PAID_RECEIVED", "PARTLY_PAID_RECEIVED"].includes(
      status
    )
  ) {
    // update the inventory of the company products
    for (const item of purchasedProducts) {
      const { productId, breakdown } = item;

      const companyProduct = await CompanyProduct.findOne({
        product: productId,
      });

      breakdown.forEach((item) => {
        const currentQty = companyProduct.inventory.get(item.unit) || 0;

        companyProduct.inventory.set(item.unit, item.quantity + currentQty);
      });

      await companyProduct.save();
    }
  }

  // b) if the status indicates partly received, update the necessary fields in the company product inventory
  if (
    [
      "PAID_PARTLY_RECEIVED",
      "PARTLY_PAID_PARTLY_RECEIVED",
      "NOT_PAID_PARTLY_RECEIVED",
    ].includes(status)
  ) {
    // a) check if receivedBreakdown is provided
    for (const item of purchasedProducts) {
      const { productId, receivedBreakdown } = item;

      if (!receivedBreakdown || receivedBreakdown.length === 0)
        return next(
          new AppError(400, "Provide a breakdown of the received goods")
        );

      const companyProduct = await CompanyProduct.findOne({
        product: productId,
      });

      receivedBreakdown.forEach((item) => {
        const currentQty = companyProduct.inventory.get(item.unit) || 0;

        companyProduct.inventory.set(item.unit, item.quantity + currentQty);
      });

      await companyProduct.save();
    }
  }

  // c) if the status indicates not received, do nothing

  // CREATE THE PURCHASE
  const purchase = await Purchase.create({
    boughtFrom,
    company: companyId,
    purchasedBy: userId,
    receivedBy,
    products: purchasedProducts,
    status,
    totalProductCost,
    transportationCost,
    totalPurchaseCost: totalProductCost + transportationCost,
    paymentMethod,
  });

  res.status(201).json({
    status: "success",
    data: { purchase },
  });
});
