// const utils = require('../index');
const validators = require('../validators');

exports.belongsTo = async (opts = {}, obj, args = {}, ctx, info, next) => {
  const { ra, hookier } = opts;

  if (args.input[ra.gql.foreignAttr]) {
    const createdForeignInstance = await hookier.call(`graphql/${ra.foreign.gql.createResolver}`)(
      null,
      {
        input: args.input[ra.gql.foreignAttr],
      },
      ctx,
      info,
    );
    args.input[ra.gql.foreignIdAttr] = createdForeignInstance.id;
  }

  return next();
};

exports.hasOne = async (opts = {}, obj, args = {}, ctx, info, next) => {
  const { ra, hookier } = opts;

  if (args.input[ra.gql.foreignIdAttr]) {
    const createdPrimaryInstance = await next();

    await hookier.call(`graphql/${ra.foreign.gql.updateResolver}`)(
      null,
      {
        id: args.input[ra.gql.foreignIdAttr],
        input: {
          [ra.primary.id]: createdPrimaryInstance.id,
        },
      },
      ctx,
      info,
    );

    return createdPrimaryInstance;
  } else if (args.input[ra.gql.foreignAttr]) {
    const createdPrimaryInstance = await next();

    await hookier.call(`graphql/${ra.foreign.gql.createResolver}`)(
      null,
      {
        input: {
          ...args.input[ra.gql.foreignAttr],
          [ra.primary.id]: createdPrimaryInstance.id,
        },
      },
      ctx,
      info,
    );

    return createdPrimaryInstance;
  }
  return next();
};

exports.hasMany = async (opts = {}, obj, args = {}, ctx, info, next) => {
  const { ra, hookier } = opts;

  const primaryObject = await next();

  if (args.input[ra.gql.foreignIdAttr]) {
    await Promise.all(args.input[ra.gql.foreignIdAttr].map(async () => {
      await validators.isInstanceExist(
        { id: args.input[ra.gql.foreignIdAttr] },
        {
          modelName: ra.foreign.db.modelName,
          attr: 'id',
          required: true,
        },
        ctx,
      );
    }));

    await Promise.all(args.input[ra.gql.foreignIdAttr].map(async (id) => {
      await hookier.call(`graphql/${ra.foreign.gql.updateResolver}`)(
        null,
        {
          id,
          input: {
            [ra.primary.id]: primaryObject.id,
          },
        },
        ctx,
        info,
      );
    }));
  }

  return primaryObject;
};
