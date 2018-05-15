const validators = require('../validators');

exports.belongsTo = async (opts = {}, obj, args = {}, ctx, info, next) => {
  const { ra, hookier } = opts;

  if (!args.input[ra.gql.foreignAttr]) {
    return next();
  }

  // prettier-ignore
  const {
    isAlreadyAttahced,
    primaryObject,
  } = await exports._preUpdate(opts, obj, args, ctx, info);

  if (isAlreadyAttahced) {
    await hookier.call(`graphql/${ra.foreign.gql.updateResolver}`)(
      null,
      {
        id: primaryObject[ra.gql.foreignIdAttr],
        input: args.input[ra.gql.foreignAttr],
      },
      ctx,
      info,
    );
  } else {
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
  const { db, transaction } = ctx;

  if (!args.input[ra.gql.foreignAttr]) {
    return next();
  }

  // prettier-ignore
  const {
    isAlreadyAttahced,
    primaryObject,
  } = await exports._preUpdate(opts, obj, args, ctx, info);

  if (isAlreadyAttahced) {
    const foreignInstance = await db[ra.foreign.db.modelName].findOne({
      where: { [ra.primary.id]: primaryObject.id },
      transaction,
    });

    await hookier.call(`graphql/${ra.foreign.gql.updateResolver}`)(
      null,
      {
        id: foreignInstance.id,
        input: args.input[ra.gql.foreignAttr],
      },
      ctx,
      info,
    );
  } else {
    await hookier.call(`graphql/${ra.foreign.gql.createResolver}`)(
      null,
      {
        input: {
          ...args.input[ra.gql.foreignAttr],
          [ra.primary.id]: primaryObject.id,
        },
      },
      ctx,
      info,
    );
  }

  return next();
};

exports.hasMany = async (opts = {}, obj, args = {}, ctx, info, next) => {
  const { ra, hookier } = opts;

  if (args.input[ra.gql.foreignIdAttr]) {
    const primaryObject = await hookier.call(`graphql/${ra.primary.gql.getOneResolver}`)(
      null,
      {
        id: args.id,
      },
      ctx,
      info,
    );

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

  return next();
};

exports._preUpdate = async (opts = {}, obj, args = {}, ctx, info) => {
  const {
    hookier,
    ra,
    config: { relationType = 'belongsTo' },
  } = opts;
  const { db, transaction } = ctx;
  const primaryObject = await hookier.call(`graphql/${ra.primary.gql.getOneResolver}`)(
    null,
    {
      id: args.id,
    },
    ctx,
    info,
  );

  const foreignInstance =
    relationType === 'hasOne' &&
    (await db[ra.foreign.db.modelName].findOne({
      where: { [ra.primary.id]: primaryObject.id },
      transaction,
    }));

  const isAlreadyAttahcedMap = {
    belongsTo: () => primaryObject[ra.gql.foreignIdAttr],
    hasOne: () => !!foreignInstance,
  };

  const isAlreadyAttahced = isAlreadyAttahcedMap[relationType]();
  return { isAlreadyAttahced, primaryObject, foreignInstance };
};
