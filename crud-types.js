const gql = require('graphql-tag');
const utils = require('./utils');

module.exports = (conf = {}) => {
  const { entityName } = conf;

  const cases = utils.casesForEntity(entityName);

  return gql`

    type Query {
      ${cases.lowCamel}(id: ID!): ${cases.camel}
      ${cases.lowCamelPlural}: [${cases.camel}]
    }

    type Mutation {
      create${cases.camel}(input: ${cases.camel}Input): ${cases.camel}
      update${cases.camel}(id: ID!, input: ${cases.camel}Input): ${cases.camel}
      delete${cases.camel}(id: ID!): ${cases.camel}
    }

  `;
};
