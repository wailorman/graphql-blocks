const compose = require('compose-function');
const transactify = require('../transactify');
// const hookier = require('../hookier');
const validators = require('../validators');
const { relationAttrs } = require('./foreign-utils');
const foreignUtils = require('./foreign-utils');
const fCreateFuncs = require('./foreign-create-funcs');
const fUpdateFuncs = require('./foreign-update-funcs');
const merge = require('lodash/merge');

exports.createHook = (config = {}) => {
  const { hookier, relationType = 'belongsTo' } = config;

  const ra = relationAttrs(config);

  const createHookName = `graphql/${ra.primary.gql.createResolver}`;
  const fFuncOpts = { ra, hookier, config };
  const decorator = compose(hookier.on(createHookName), transactify());

  return decorator(async (obj, args = {}, ctx, info, next) => {
    let res;

    if (relationType === 'belongsTo') {
      res = fCreateFuncs.belongsTo(fFuncOpts, obj, args, ctx, info, next);
    } else if (relationType === 'hasOne') {
      res = fCreateFuncs.hasOne(fFuncOpts, obj, args, ctx, info, next);
    } else if (relationType === 'hasMany') {
      res = fCreateFuncs.hasMany(fFuncOpts, obj, args, ctx, info, next);
    } else {
      throw new Error(`Unrecognized relationType: '${relationType}'`);
    }

    return res;
  });
};

exports.updateHook = (config = {}) => {
  const { hookier, relationType = 'belongsTo' } = config;

  const ra = relationAttrs(config);
  const fFuncOpts = { ra, hookier, config };
  const decorator = compose(hookier.on(`graphql/${ra.primary.gql.updateResolver}`), transactify());

  return decorator(async (obj, args = {}, ctx, info, next) => {
    let res;

    if (relationType === 'belongsTo') {
      res = fUpdateFuncs.belongsTo(fFuncOpts, obj, args, ctx, info, next);
    } else if (relationType === 'hasOne') {
      res = fUpdateFuncs.hasOne(fFuncOpts, obj, args, ctx, info, next);
    } else if (relationType === 'hasMany') {
      res = fUpdateFuncs.hasMany(fFuncOpts, obj, args, ctx, info, next);
    } else {
      throw new Error(`Unrecognized relationType: '${relationType}'`);
    }

    return res;
  });
};

exports.validateScalarHook = (config = {}) => {
  const { hookier, required = false, relationType = 'belongsTo' } = config;

  const ra = relationAttrs(config);
  const decorator = compose(
    hookier.on([
      `graphql/${ra.primary.gql.createResolver}`,
      `graphql/${ra.primary.gql.updateResolver}`,
    ]),
    transactify(),
  );

  return decorator(async (obj, args = {}, ctx, info, next) => {
    relationType === 'hasMany'
      ? await Promise.all(args.input[ra.gql.foreignIdAttr].map(async (id) => {
        await validators.isInstanceExist(
          { id },
          {
            modelName: ra.foreign.db.modelName,
            attr: 'id',
            required,
          },
          ctx,
        );
      }))
      : await validators.isInstanceExist(
        args.input,
        {
          modelName: ra.foreign.db.modelName,
          attr: ra.gql.foreignIdAttr,
          required,
        },
        ctx,
      );

    return next();
  });
};

exports.defineMultipleHooks = (configs = [], commonConfig = {}) =>
  configs.reduce(
    (prev, curConfig) => prev.concat(exports.defineHooks(merge(curConfig, commonConfig))),
    [],
  );

exports.defineHooks = (definerConf = {}) => {
  const {
    get, create, update, validate,
  } = definerConf.ops || {};
  const config = { ...definerConf };

  const e = {};

  get && (e.types = foreignUtils.defineForeignTypes(config));
  get && (e.resolvers = foreignUtils.defineForeignResolvers(config));

  e.middlewares = () => {
    create && exports.createHook(config);
    update && exports.updateHook(config);
    validate && exports.validateScalarHook(config);
  };

  return e;
};
