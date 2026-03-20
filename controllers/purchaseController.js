const mongoose = require("mongoose");

const catchAsync = require("../utils/catchAsync");

const Purchase = require("../models/purchaseModel");
const Product = require("../models/productModel");
const CompanyProduct = require("../models/companyProductModel");
const AppError = require("../utils/appError");
const PurchaseItem = require("../models/purchaseItemModel");

exports.recordPurchase = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      supplier,
      purchaseState = "DRAFT",
      receivingStatus,
      paymentStatus,
      amountPaid,
      transportationCost,
      extraCost,
      paymentMethod,
      items,
    } = req.body;

    const purchaser = req.user._id;
    const company = req.user.company;

    if (items.length === 0)
      next(new AppError(400, "Purchase must have at least one item"));

    session.startTransaction();

    // Create Purchase
    const purchase = await Purchase.create(
      [
        {
          supplier,
          company,
          purchaser,
          purchaseState: "DRAFT",
          receivingStatus: "NOT_RECEIVED",
          paymentStatus: "NOT_PAID",
          totalProductCost: 0,
          transportationCost: 0,
          extraCost: 0,
          totalPurchaseCost: 0,
        },
      ],
      { session },
    );

    const purchaseId = purchase[0]._id;

    // Create PurchaseItems
    const purchaseItemsData = await Promise.all(
      items.map(async (item) => {
        if (!item.productId) {
          const {
            name,
            baseUnit,
            packagingUnit,
            baseUnitPrice,
            unitPrice,
            unitsPerPackage,
            category,
          } = item;
          const packagingUnits = new Map();
          packagingUnits[packagingUnit] = unitsPerPackage;

          const product = await Product.create(
            [
              {
                name,
                baseUnit,
                packagingUnits,
                category,
              },
            ],
            { session },
          );

          const productId = product[0]._id;

          const costPricePerUnit = new Map();
          costPricePerUnit[baseUnit] = baseUnitPrice;
          costPricePerUnit[packagingUnit] = unitPrice;

          const companyProduct = await CompanyProduct.create(
            [
              {
                company,
                product: productId,
                costPricePerUnit,
                category,
              },
            ],
            { session },
          );

          const companyProductId = companyProduct[0]._id;

          return {
            purchaseId,
            productId: companyProductId,
            quantityOrdered: item.quantityOrdered,
            unitPrice: item.unitPrice,
            packagingUnit,
            unitsPerPackage,
          };
        } else
          return {
            purchaseId,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            unitPrice: item.unitPrice,
            packagingUnit: item.packagingUnit,
            unitsPerPackage: item.unitsPerPackage,
          };
      }),
    );

    const purchaseItems = await PurchaseItem.insertMany(purchaseItemsData, {
      session,
    });

    //  Recalculate totals manually
    const result = await PurchaseItem.aggregate([
      {
        $match: {
          purchaseId: new mongoose.Types.ObjectId(purchaseId),
        },
      },
      {
        $group: {
          _id: "$purchaseId",
          totalProductCost: { $sum: "$totalPrice" },
        },
      },
    ]).session(session);

    console.log(result);
    const totalProductCost = result[0]?.totalProductCost || 0;
    console.log(totalProductCost);

    const totalPurchaseCost = totalProductCost + extraCost + transportationCost;

    // Update the Purchase with correct totals
    const updatedPurchase = await Purchase.findOneAndUpdate(
      { _id: purchaseId },
      {
        purchaseState,
        receivingStatus,
        paymentStatus,
        amountPaid,
        paymentMethod,
        totalProductCost,
        totalPurchaseCost,
        extraCost,
        transportationCost,
      },
      { new: true, runValidators: true, session },
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      message: "Purchase recorded successfully",
      data: { purchase: updatedPurchase, items: purchaseItems },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    next(error);
  }
});

// exports.recordPurchase = catchAsync(async (req, res, next) => {
//   // 1) extract the user id and company id from the req.user
//   if (!req.user)
//     return next(new AppError(400, "Login or sign up to perform this action."));

//   const { _id: userId, company: companyId } = req.user;

//   // 2) Extract the neccesary data from the request body
//   const {
//     boughtFrom,
//     receivedBy,
//     totalProductCost,
//     transportationCost,
//     products, // either has product (productId) or name and category
//     status,
//     paymentMethod,
//   } = req.body;

//   const purchasedProducts = [];

//   if (!products || !Array.isArray(products) || products.length === 0) {
//     return next(new AppError(400, "Products are required"));
//   }

//   for (const item of products) {
//     const {
//       name,
//       packagingUnits,
//       baseUnit,
//       category,
//       product,
//       breakdown,
//       totalPrice,
//     } = item;

//     let receivedBreakdown = item.receivedBreakdown || [];

//     if (
//       ["PAID_RECEIVED", "NOT_PAID_RECEIVED", "PARTLY_PAID_RECEIVED"].includes(
//         status,
//       )
//     )
//       receivedBreakdown = breakdown.map((b) => {
//         return {
//           unit: b.unit,
//           quantity: b.quantity,
//           purchasePrice: b.purchasePrice,
//         };
//       });

//     // if product is sent, name, packagingUnits, baseUnit, category are not required

//     let productId;

//     if (product) {
//       const existingProduct = await Product.findById(product);
//       if (!existingProduct) {
//         return next(new AppError(404, "Product not found"));
//       }
//       productId = existingProduct._id;
//     } else if (name && category) {
//       const existingProduct = await Product.findOne({
//         name,
//         category,
//       });
//       if (!existingProduct) {
//         const existingProduct = await Product.create({
//           name,
//           category,
//           baseUnit,
//           packagingUnits,
//         });

//         productId = existingProduct._id;
//       }

//       productId = existingProduct._id;
//     }

//     const existingCompanyProduct = await CompanyProduct.findOne({
//       company: companyId,
//       product: productId,
//     });

//     if (!existingCompanyProduct) {
//       await CompanyProduct.create({
//         company: companyId,
//         product: productId,
//         costPricePerUnit: breakdown.reduce((acc, item) => {
//           acc[item.unit] = item.purchasePrice;
//           return acc;
//         }, {}),
//         category,
//       });
//     }

//     purchasedProducts.push({
//       productId,
//       breakdown,
//       receivedBreakdown,
//       totalPrice,
//     });
//   }

//   // - received: update the inventory of the company products
//   if (
//     ["PAID_RECEIVED", "NOT_PAID_RECEIVED", "PARTLY_PAID_RECEIVED"].includes(
//       status,
//     )
//   ) {
//     for (const item of purchasedProducts) {
//       const { productId, breakdown } = item;
//       console.log(breakdown); ////////////////////////////

//       const companyProduct = await CompanyProduct.findOne({
//         company: companyId,
//         product: productId,
//       });

//       breakdown.forEach((item) => {
//         const currentQty = companyProduct.inventory.get(item.unit) || 0;

//         companyProduct.inventory.set(item.unit, item.quantity + currentQty);
//       });

//       await companyProduct.save();
//     }
//   }

//   // - partly received: update the necessary fields in the company product inventory
//   if (
//     [
//       "PAID_PARTLY_RECEIVED",
//       "PARTLY_PAID_PARTLY_RECEIVED",
//       "NOT_PAID_PARTLY_RECEIVED",
//     ].includes(status)
//   ) {
//     // a) check if receivedBreakdown is provided
//     for (const item of purchasedProducts) {
//       const { productId, receivedBreakdown } = item;

//       if (!receivedBreakdown || receivedBreakdown.length === 0)
//         return next(
//           new AppError(400, "Provide a breakdown of the received goods"),
//         );

//       const companyProduct = await CompanyProduct.findOne({
//         company: companyId,
//         product: productId,
//       });

//       receivedBreakdown.forEach((item) => {
//         const currentQty = companyProduct.inventory.get(item.unit) || 0;
//         if (!companyProduct)
//           return new AppError(404, "Company product not found");

//         companyProduct.inventory.set(item.unit, item.quantity + currentQty);
//       });

//       await companyProduct.save();
//     }
//   }

//   // - not received: do nothing

//   console.log(purchasedProducts[0].breakdown);

//   // CREATE THE PURCHASE
//   const purchase = await Purchase.create({
//     boughtFrom,
//     company: companyId,
//     purchasedBy: userId,
//     receivedBy,
//     products: purchasedProducts,
//     status,
//     totalProductCost,
//     transportationCost,
//     totalPurchaseCost:
//       Number(totalProductCost || 0) + Number(transportationCost || 0),
//     paymentMethod,
//   });

//   res.status(201).json({
//     status: "success",
//     data: { purchase },
//   });
// });
