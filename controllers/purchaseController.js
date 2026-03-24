const mongoose = require("mongoose");

const catchAsync = require("../utils/catchAsync");

const Purchase = require("../models/purchaseModel");
const Product = require("../models/productModel");
const CompanyProduct = require("../models/companyProductModel");
const AppError = require("../utils/appError");
const PurchaseItem = require("../models/purchaseItemModel");
const {
  resolveSupplier,
  createPurchase,
  createPurchaseItems,
} = require("../services/purchase.service");
const {
  TransactionState,
  ReceivingStatus,
  PaymentStatus,
} = require("../utils/constants");

exports.recordPurchase = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      supplier,
      purchaseState,
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

    if (!items || items.length === 0) {
      return next(new AppError(400, "Purchase must have at least one item"));
    }

    session.startTransaction();

    const supplierId = await resolveSupplier(supplier, company, session);

    const purchase = await createPurchase(
      supplierId,
      company,
      purchaser,
      session,
    );

    const purchaseId = purchase[0]._id;

    // Create PurchaseItems
    const purchaseItems = await createPurchaseItems(
      purchaseId,
      items,
      company,
      session,
    );

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

    const totalProductCost = result[0]?.totalProductCost || 0;

    const totalPurchaseCost =
      totalProductCost + (extraCost || 0) + (transportationCost || 0);

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

// TODO
// Update controller to create selling price on product
