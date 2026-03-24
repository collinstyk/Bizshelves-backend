const mongoose = require("mongoose");

const catchAsync = require("../utils/catchAsync");

const {
  resolveCustomerId,
  createSale,
  validateItems,
  getCompanyProductMap,
  validateStock,
  createSaleItems,
  deductStock,
  calculateTotalSaleAmount,
  getPaymentStatus,
  updateSale,
} = require("../services/sale.service");

exports.recordSale = catchAsync(async (req, res, next) => {
  const session = await mongoose.startSession();
  const { _id: seller, company } = req.user;

  const {
    items,
    paymentMethod,
    customer,
    saleState,
    packagingUnit,
    totalPaid,
  } = req.body;

  try {
    const customerId = await resolveCustomerId(customer, company, session);

    const sale = await createSale(customerId, company, seller, session);

    const saleId = sale[0]._id;

    validateItems(items);

    const companyProductMap = await getCompanyProductMap(items, session);

    validateStock(items, companyProductMap);

    const saleItems = await createSaleItems(items, saleId, session);

    await deductStock(items, companyProductMap, session);

    const totalSaleAmount = calculateTotalSaleAmount(saleItems);

    const paymentStatus = getPaymentStatus(totalPaid, totalSaleAmount, next);

    const updatedSale = await updateSale(
      saleId,
      totalSaleAmount,
      totalPaid,
      paymentStatus,
      saleState.toUpperCase(),
      session,
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: "success",
      data: {
        sale: updatedSale,
        items: saleItems,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
});
