const db = require("../../models");

const paymentModel = db?.payments || db?.Payment || db?.Payments;

const requirePaymentModel = (operation) => {
  if (!paymentModel || typeof paymentModel[operation] !== "function") {
    throw new Error(`Payment database model does not support ${operation}`);
  }
  return paymentModel;
};

const normalizePayment = (payment) => {
  if (!payment) return null;

  return {
    ...payment,
    amount: Number(payment.amount ?? 0),
    userId: payment.userId ? Number(payment.userId) : null,
    status: (payment.status || "pending").toLowerCase(),
  };
};

const createPayment = async (payload, options = {}) => {
  const record = normalizePayment({
    ...payload,
    amount: Number(payload.amount ?? 0),
    status: String(payload.status || "pending").toLowerCase(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const payment = await requirePaymentModel("create").create(record, options);
  return normalizePayment(payment.toJSON ? payment.toJSON() : payment);
};

const findPaymentById = async (id, options = {}) => {
  const payment = await requirePaymentModel("findByPk").findByPk(id, options);
  return payment
    ? normalizePayment(payment.toJSON ? payment.toJSON() : payment)
    : null;
};

const findPaymentByReference = async (reference, options = {}) => {
  const { userId, ...queryOptions } = options;
  const referenceValue = String(reference || "");
  const payment = await requirePaymentModel("findOne").findOne({
    where: {
      reference: referenceValue,
      ...(userId === undefined ? {} : { userId: Number(userId) }),
    },
    ...queryOptions,
  });
  return payment
    ? normalizePayment(payment.toJSON ? payment.toJSON() : payment)
    : null;
};

const updatePayment = async (id, updates, options = {}) => {
  const paymentId = Number(id);
  const [count] = await requirePaymentModel("update").update(updates, {
    where: { id: paymentId },
    ...options,
  });
  return count ? findPaymentById(paymentId, options) : null;
};

module.exports = {
  createPayment,
  findPaymentById,
  findPaymentByReference,
  updatePayment,
};
