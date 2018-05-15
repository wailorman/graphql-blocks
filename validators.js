exports.isInstanceExist = async (input = {}, opts = {}, ctx = {}) => {
  const { modelName, required = false, attr } = opts;
  const { db, transaction } = ctx;

  if (!modelName) {
    throw new Error(`Missing 'modelName' argument`);
  }

  if (!attr) {
    throw new Error(`Missing 'attr' argument`);
  }

  if (!input[attr] && required) {
    throw new Error(`Missing ${attr}`);
  }

  if (!input[attr]) {
    return input;
  }

  const instance = await db[modelName].findOne({
    where: { id: input[attr] },
    transaction,
  });

  if (!instance) {
    throw new Error(`${modelName}#${input[attr]} not found`);
  }

  return input;
};
