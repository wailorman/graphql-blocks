const pick = require('lodash/pick');
const omit = require('lodash/omit');
const padStart = require('lodash/padStart');
const uniq = require('lodash/uniq');
const isUndefined = require('lodash/isUndefined');
const isNaN = require('lodash/isNaN');
const isNull = require('lodash/isNull');
const times = require('lodash/times');
const dateFns = require('date-fns');
const inflection = require('inflection');
const uuid = require('uuid/v4');

const mergeById = require('./merge-by-id');

const arrayToMap = (array, opts = {}) => {
  // key - if element in array is object
  const { key } = opts;

  return array.reduce((prev, cur) => {
    if (typeof cur === 'object') {
      if (typeof key === 'function') {
        prev[key(cur)] = cur;
      } else {
        prev[cur[key]] = cur;
      }
    } else {
      prev[cur] = true;
    }

    return prev;
  }, {});
};
exports.arrayToMap = arrayToMap;

/**
 * Aggregating array of objects w/ same `key` attribute and summing all
 * `attr` attributes if duplicates found
 *
 * @param  {Array<Object>}  arr       Input array of objects
 * @param  {String}         aggrKey   "Primary key" for each object to detect duplicates (i.e. ID)
 * @param  {String}         aggrAttr  Attribute for summing (i.e. qty)
 * @return {Array<Object>}
 */
const aggregateArray = (arr, aggrKey, aggrAttr) => {
  if (!aggrKey) {
    return arr;
  }

  if (!aggrAttr) {
    return arr;
  }

  if (!arr || arr.length === 0) {
    return [];
  }

  const itemMetaMap = arr.reduce((res, item, i) => {
    const itemMeta = res[item[aggrKey]] || { aggregatedValue: 0 };

    itemMeta.aggregatedValue += +item[aggrAttr];
    itemMeta.index = i;

    if (typeof item[aggrKey] === 'string') {
      itemMeta.keyTransformer = key => `${key}`;
    } else if (typeof item[aggrKey] === 'number') {
      itemMeta.keyTransformer = key => +key;
    } else {
      itemMeta.keyTransformer = key => key;
    }

    res[item[aggrKey]] = itemMeta;

    return res;
  }, {});

  return Object.keys(itemMetaMap)
    .map((_key) => {
      const itemMeta = itemMetaMap[_key];

      return {
        ...arr[itemMeta.index],
        [aggrAttr]: itemMeta.aggregatedValue,
        [aggrKey]: itemMetaMap[_key].keyTransformer(_key),
        __$sortIndex: itemMeta.index,
      };
    })
    .sort((a, b) => a.__$sortIndex - b.__$sortIndex)
    .map(obj => omit(obj, '__$sortIndex'));
};
exports.aggregateArray = aggregateArray;

/**
 * Converts complex object (not a prototype of Object, with own getters/setters)
 * to plain JS object. Should be used in graphql `args`, filtering sequelize
 * instances
 *
 * @param {any} obj Instance to convert to plain object
 * @return {Object}
 */
const toPlainObject = obj => (obj ? JSON.parse(JSON.stringify(obj)) : {});
exports.toPlainObject = toPlainObject;

/**
 * Keeps attributes after transformation.
 * Useful when accesscontrol.filter() removes significant data
 *
 * @param  {Object} obj                   Source object (before transformations)
 * @param  {Array<string>|string} _attrs  Attributes you want to keep after transform
 * @param  {Object} res                   Result of transformation
 * @return {Object}
 */
const keepAttrs = (obj, _attrs, res) => {
  const attrs = [].concat(_attrs);
  const keepingAttrs = pick(obj, attrs);
  return Object.assign(res, keepingAttrs);
};
exports.keepAttrs = keepAttrs;

exports.diffInSecs = (dateA, dateB) => Math.abs(dateFns.differenceInSeconds(dateA, dateB));

exports.crudMerge = mergeById;
exports.mergeById = mergeById;

exports.sequelizeWhereToString = (args = {}) => {
  const { where, db } = args;

  const str = db.sequelize.dialect.QueryGenerator.whereQuery(where);

  return str.replace('WHERE ', '');
};

exports.enchanceSquelWithSequelizeOrder = (args = {}, opts = {}) => {
  const { obj, order = [] } = args;
  const { quoteFields = true, groupOrderingFields = false } = opts;

  return order.reduce((squelObj, orderItem) => {
    const [field, sorting] = orderItem;

    const sortingMap = {
      DESC: false,
      ASC: true,
      _default: true,
    };

    const isASC = isUndefined(sortingMap[sorting]) ? sortingMap._default : sortingMap[sorting];

    const processedField = quoteFields ? `"${field}"` : field;

    squelObj.order(processedField, isASC);

    if (groupOrderingFields) {
      squelObj.group(processedField);
    }

    return squelObj;
  }, obj);
};

exports.graphqlOrderByToSequelize = (args = {}) => {
  const { orderBy } = args;

  if (!orderBy) {
    return undefined;
  }

  const [field, sorting] = orderBy.split('_');

  return [[field, sorting]];
};

exports.casesForEntity = (_entityName) => {
  const entityName = `${_entityName}`;

  const screamingCase = inflection.underscore(entityName).toUpperCase();
  const camelCase = inflection.camelize(entityName);
  const lowCamelCase = inflection.camelize(entityName, true);
  const lowCamelCaseId = `${lowCamelCase}Id`;
  const kebabCase = inflection.dasherize(inflection.underscore(entityName)).toLowerCase();

  return {
    screamingCase,
    screamingName: screamingCase,
    screaming: screamingCase,

    camelCase,
    camelName: camelCase,
    camel: camelCase,

    lowCamelCase,
    lowCamelName: lowCamelCase,
    lowCamel: lowCamelCase,
    lowCamelPlural: inflection.pluralize(lowCamelCase),

    lowCamelCaseId,
    lowCamelNameId: lowCamelCaseId,
    lowCamelId: lowCamelCaseId,

    kebabCase,
    kebabName: kebabCase,
    kebab: kebabCase,
    kebabPlural: inflection.pluralize(kebabCase),
  };
};

exports.cutId = (_id = '', length = 4) => {
  const id = `${_id}`;
  const isUUID = /\d+[-]/.test(id);
  const cuttedId = isUUID ? id.slice(0, length) : padStart(id.slice(length * -1), length, '0');

  return cuttedId;
};

exports.invertMap = (obj) => {
  if (typeof obj !== 'object') {
    return obj;
  }

  const values = Object.values(obj);
  if (uniq(values).length !== values.length) {
    throw new Error('Duplicates found in values');
  }

  return Object.entries(obj)
    .filter(([, value]) =>
      !(isUndefined(value) || isNaN(value) || isNull(value) || typeof value === 'boolean'))
    .reduce(
      (prev, [key, value]) => ({
        ...prev,
        [value]: key,
      }),
      {},
    );
};

exports.alternateArray = (array, opts = {}) => {
  const { parts = 2, extended = false, defaultWeight = 1 } = opts;

  const matrix = times(parts).map(() => []);

  let column = 0;
  let item = 0;

  const isFree = (_column, _item, weight) =>
    times(weight).reduce((prev, __, modif) => {
      if (prev === false) {
        return false;
      }

      if (!matrix[_column] || !matrix[column][_item + modif]) {
        return true;
      }
      return false;
    }, true);

  const getFreePlace = (weight) => {
    while (!isFree(column, item, weight)) {
      if (column === parts - 1) {
        column = 0;
        item++;
      } else {
        column++;
      }
    }

    return [column, item];
  };
  const push = (id, weight) => {
    const [_column, _item] = getFreePlace(weight);

    times(weight).forEach((__, modif) => {
      matrix[_column][_item + modif] = id;
    });
  };

  const items = (array || [])
    .map(elem => (extended ? elem : { value: elem, weight: defaultWeight }))
    .map(elem => ({ ...elem, id: uuid() }));

  const itemsMap = arrayToMap(items, { key: 'id' });

  items.forEach((cur) => {
    const { weight = 1, id } = cur;
    push(id, weight);
  });

  const res = matrix.map(columnItems => uniq(columnItems).map(id => itemsMap[id].value));

  return res;
};

exports.generateNames = (entityName) => {
  const lowerCamelCaseName = inflection.camelize(inflection.underscore(entityName), true);

  const gqlList = inflection.pluralize(lowerCamelCaseName);
  const gqlOne = lowerCamelCaseName;
  const entityForeignKey = `${lowerCamelCaseName}Id`;
  const createEntity = `create${entityName}`;
  const updateEntity = `update${entityName}`;
  const deleteEntity = `delete${entityName}`;

  return {
    lowerCamelCaseName,
    gqlList,
    gqlOne,
    entityForeignKey,
    createEntity,
    updateEntity,
    deleteEntity,
  };
};
