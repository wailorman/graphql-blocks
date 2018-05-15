const utils = require('../utils');
const inflection = require('inflection');
const gql = require('graphql-tag');

exports.defineForeignTypes = (config = {}) => {
  const { relationType = 'belongsTo' } = config;

  const ra = exports.relationAttrs(config);

  return relationType === 'hasMany'
    ? gql`
        type ${ra.primary.gql.typeName} {
          ${ra.gql.foreignAttr}: [${ra.foreign.gql.typeName}]
          ${ra.gql.foreignIdAttr}: [ID]
        }

        input ${ra.primary.gql.inputTypeName} {
          # ${ra.gql.foreignAttr}: [${ra.foreign.gql.inputTypeName}]
          ${ra.gql.foreignIdAttr}: [ID]
        }
      `
    : gql`
        type ${ra.primary.gql.typeName} {
          ${ra.gql.foreignAttr}: ${ra.foreign.gql.typeName}
          ${ra.gql.foreignIdAttr}: ID
        }

        input ${ra.primary.gql.inputTypeName} {
          ${ra.gql.foreignAttr}: ${ra.foreign.gql.inputTypeName}
          ${ra.gql.foreignIdAttr}: ID
        }
      `;
};

exports.defineForeignResolvers = (config = {}) => {
  const { relationType = 'belongsTo' } = config;

  const ra = exports.relationAttrs(config);

  const getForeignInstance = async obj =>
    obj && typeof obj[ra.db.getForeignFunc] === 'function' && (obj[ra.db.getForeignFunc]());

  const foreignIdAttrGetter = {
    belongsTo: obj => obj && obj[ra.gql.foreignIdAttr],
    hasOne: async (obj) => {
      const instance = await getForeignInstance(obj);
      return (instance && instance.id) || null;
    },
    hasMany: async (obj) => {
      const instances = await getForeignInstance(obj);
      return (instances && instances.length && instances.map(i => i.id)) || null;
    },
  };

  return {
    [ra.primary.gql.typeName]: {
      [ra.gql.foreignAttr]: getForeignInstance,
      [ra.gql.foreignIdAttr]: foreignIdAttrGetter[relationType],
    },
  };
};

exports.relationAttrs = (config = {}) => {
  const {
    foreignEntityName,
    primaryEntityName,
    relationType = 'belongsTo',
    foreignAttr: _foreignAttr,
    primaryAttr: _primaryAttr,
  } = config;

  const pNames = utils.casesForEntity(primaryEntityName);
  const fNames = utils.casesForEntity(foreignEntityName);

  const hasMany = relationType === 'hasMany';

  const foreignAttrSingular = _foreignAttr || fNames.lowCamel;
  const foreignAttrPlural = inflection.pluralize(foreignAttrSingular);

  const foreignIdAttrSingular = `${foreignAttrSingular}Id`;
  const foreignIdAttrPlural = `${foreignAttrPlural}Ids`;

  const primaryAttrSingular = _primaryAttr || pNames.lowCamel;
  // const primaryAttrPlural = inflection.pluralize(primaryAttrSingular);

  const primaryIdAttrSingular = `${primaryAttrSingular}Id`;
  // const primaryIdAttrPlural = primaryAttrPlural + 'Ids';

  const getForeignFuncSingular = `get${utils.casesForEntity(foreignAttrSingular).camelCase}`;
  const getForeignFuncPlural = `get${utils.casesForEntity(foreignAttrPlural).camelCase}`;

  return {
    foreignAttr: hasMany ? foreignAttrPlural : foreignAttrSingular,
    foreignIdAttr: foreignIdAttrSingular,
    getForeignFunc: hasMany ? getForeignFuncPlural : getForeignFuncSingular,
    gql: {
      foreignAttr: hasMany ? foreignAttrPlural : foreignAttrSingular,
      foreignIdAttr: hasMany ? foreignIdAttrPlural : foreignIdAttrSingular,
    },
    db: {
      foreignIdAttr: foreignIdAttrSingular,
      primaryIdAttr: primaryIdAttrSingular,
      getForeignFunc: hasMany ? getForeignFuncPlural : getForeignFuncSingular,
    },
    primary: {
      ...pNames,
      id: pNames.lowCamelId,
      gql: {
        getOneResolver: pNames.lowCamel,
        getAllResolver: `${pNames.lowCamel}s`,
        createResolver: `create${pNames.camel}`,
        updateResolver: `update${pNames.camel}`,
        deleteResolver: `delete${pNames.camel}`,
        typeName: pNames.camel,
        inputTypeName: `${pNames.camel}Input`,
      },
      db: {
        modelName: pNames.camel,
      },
    },
    foreign: {
      ...fNames,
      id: fNames.lowCamelId,
      gql: {
        getOneResolver: fNames.lowCamel,
        getAllResolver: `${fNames.lowCamel}s`,
        createResolver: `create${fNames.camel}`,
        updateResolver: `update${fNames.camel}`,
        deleteResolver: `delete${fNames.camel}`,
        typeName: fNames.camel,
        inputTypeName: `${fNames.camel}Input`,
      },
      db: {
        modelName: fNames.camel,
      },
    },
  };
};
