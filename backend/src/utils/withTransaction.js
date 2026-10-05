const { sequelize } = require('../../models');

/**
 * Виконує work(transaction) у транзакції.
 * @param {object|null} externalTransaction
 * @param {function} work async (transaction) => result
 */
async function withTransaction(externalTransaction, work) {
  const transaction = externalTransaction || (await sequelize.transaction());
  const ownsTransaction = !externalTransaction;

  try {
    const result = await work(transaction);
    if (ownsTransaction) await transaction.commit();
    return result;
  } catch (error) {
    if (ownsTransaction) await transaction.rollback();
    throw error;
  }
}

module.exports = withTransaction;