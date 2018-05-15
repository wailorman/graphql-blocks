const { graphql, print } = require('graphql');
const merge = require('lodash/merge');

module.exports = (conf = {}) => {
  const { schema, modifyContext } = conf;

  return ({ db } = {}) => async (_query, args, _context) => {
    const contextWithDb = merge({ db }, _context);
    const context =
      typeof modifyContext === 'function' ? modifyContext(contextWithDb) : contextWithDb;

    let query;
    if (typeof _query === 'string') {
      query = _query;
    } else {
      query = print(_query);
    }

    const result = await graphql(schema, query, {}, context, args);

    if (result.errors) {
      const error = result.errors[0];
      const originalError = error.originalError || error;

      let errorStr = originalError;

      if (originalError.message.indexOf('Validation error') > -1) {
        errorStr = originalError.errors.map(obj => JSON.stringify(obj)).join('\n');
      } else {
        errorStr = originalError.message;
      }

      const e = new Error(errorStr);
      e.original = error;
      e.stack = `${e.stack
        .split('\n')
        .slice(0, 2)
        .join('\n')}\n${error.stack}`;

      throw e;
    }

    return Object.assign({}, result, result.data);
  };
};
