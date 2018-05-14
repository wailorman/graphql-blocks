const koaCompose = require('koa-compose');
const transactify = require('./transactify');

const chains = {};

const define = hookName => (func) => {
  const chainedFunc = function (context) {
    return func.apply(this, context);
  };

  const chain = [chainedFunc];

  chains[hookName] = koaCompose(chain);
  chains[hookName].__hchain = chain;

  return function (...args) {
    const isGraphqlMutation = /graphql\/(create|update|delete)/.test(hookName);

    return isGraphqlMutation
      ? transactify({ type: 'hookier' })(chains[hookName]).apply(this, [args])
      : chains[hookName].apply(this, [args]);
  };
};
exports.define = define;

const on = _hookNames => (callback) => {
  const hookNames = [].concat(_hookNames);

  hookNames.forEach((hookName) => {
    const chainedCallback = function (context, next) {
      return callback.apply(this, [].concat(context).concat(next));
    };

    const chain = chains[hookName].__hchain;
    const last = chain.pop();
    chain.push(chainedCallback);
    chain.push(last);

    chains[hookName] = koaCompose(chain);
    chains[hookName].__hchain = chain;
  });
};
exports.on = on;

const call = hookName =>
  async function (...args) {
    return chains[hookName].apply(this, [args]);
  };
exports.call = call;
