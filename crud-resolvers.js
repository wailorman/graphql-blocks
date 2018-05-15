const compose = require('compose-function');
const transactify = require('./transactify');
const utils = require('./utils');

module.exports = (conf = {}) => {
  const { entityName, hookier } = conf;

  const cases = utils.casesForEntity(entityName);

  return {
    Query: {
      [cases.lowCamel]: compose(hookier.define(`graphql/${cases.lowCamel}`))(async (obj, args, { db }) => {
        const Model = db[cases.camel];
        return Model.findOne({
          where: { id: args.id },
        });
      }),
      [cases.lowCamelPlural]: compose(hookier.define(`graphql/${cases.lowCamelPlural}`))(async (obj, args, { db }) => {
        const Model = db[cases.camel];
        return Model.findAll({});
      }),
    },
    Mutation: {
      [`create${cases.camel}`]: compose(
        hookier.define(`graphql/create${cases.camel}`),
        transactify(),
      )(async (obj, args, { db, transaction }) => {
        const Model = db[cases.camel];
        return Model.create(args.input, { transaction });
      }),

      [`update${cases.camel}`]: compose(
        hookier.define(`graphql/update${cases.camel}`),
        transactify(),
      )(async (obj, args, { db, transaction }) => {
        const Model = db[cases.camel];
        const instance = await Model.findOne({
          where: { id: args.id },
          transaction,
        });

        if (!instance) {
          throw new Error('Not found');
        }

        Object.assign(instance, args.input);
        return instance.save({ transaction });
      }),

      [`delete${cases.camel}`]: compose(
        hookier.define(`graphql/delete${cases.camel}`),
        transactify(),
      )(async (obj, args, { db, transaction }) => {
        const Model = db[cases.camel];
        const instance = await Model.findOne({
          where: { id: args.id },
          transaction,
        });

        if (!instance) {
          throw new Error('Not found');
        }

        return instance.destroy({ transaction });
      }),
    },
  };
};
