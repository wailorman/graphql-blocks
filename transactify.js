const transactify = (config = {}) => wrappedFunc =>
  async function (...args) {
    const { type = 'helper' } = config;

    /* eslint-disable prefer-destructuring */
    let context;
    if (type === 'helper' || type === 'resolver') {
      context = args[2];
    } else if (type === 'hookier') {
      context = args[0][2];
    } else {
      context = args[2];
    }
    /* eslint-enable prefer-destructuring */

    const { transaction: _transaction, db } = context;

    const transaction = _transaction || (await db.sequelize.transaction());
    context.transaction = transaction;

    try {
      // eslint-disable-next-line prefer-spread
      const res = await wrappedFunc.apply(null, args);

      if (!_transaction) {
        // If we are in root level of recursion
        await transaction.commit();
        context.transaction = null;
      }

      return res;
    } catch (error) {
      if (!_transaction) {
        await transaction.rollback();
      }

      // let e = new Error(error);
      // e.original = error;
      // e.stack =
      //   e.stack
      //     .split('\n')
      //     .slice(0, 2)
      //     .join('\n') +
      //   '\n' +
      //   error.stack;

      throw error;
    }
  };

module.exports = transactify;
