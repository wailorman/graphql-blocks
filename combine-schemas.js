// FROM: https://gist.github.com/voodooattack/b0484625a90191a4dde4aabae8884243

const {
  // parse,
  visit,
  // print,
} = require('graphql/language');

/**
 * Combine the fields of two or more AST nodes, does no error checking!
 * @param types An array with types to combine.
 * @returns {*}
 */
const combineASTTypes = types =>
  types.reduce((p, n) => Object.assign(p, n, { fields: n.fields.concat(p.fields || []) }), {});

exports.combineASTTypes = combineASTTypes;

/**
 * Combine multiple AST schemas into one. This will consolidate the Query,
 * Mutation, and Subscription types if found.
 * @param schemas An array with the schemas to combine.
 * @returns {*}
 */
const combineASTSchemas = (schemas) => {
  const result = { kind: 'Document', definitions: [] };

  const types = [];
  const typesMap = {};

  const withoutObjTypes = schemas.map(schema =>
    visit(schema, {
      enter(node /* , key, parent, path, ancestors */) {
        const ableToMerge =
          node.kind === 'ObjectTypeDefinition' || node.kind === 'InputObjectTypeDefinition';

        if (ableToMerge) {
          types.push(node);

          typesMap[node.name.value] = (typesMap[node.name.value] || []).concat(node);
          return null;
        }

        return undefined;
      },
    }));

  const mergedTypes = Object.keys(typesMap).reduce((_types, typeName) => {
    _types.push(combineASTTypes(typesMap[typeName]));
    return _types;
  }, []);

  if (mergedTypes.length) {
    result.definitions = mergedTypes;
  }

  withoutObjTypes.forEach((cleanedSchema) => {
    result.definitions = result.definitions.concat(cleanedSchema.definitions.filter(node => node.kind !== 'TypeExtensionDefinition'));
  });

  return result;
};
exports.combineASTSchemas = combineASTSchemas;

// const combined = combineASTSchemas([
//   parse(`
//     type User {
//       name: String!
//       hash: String
//       salt: String
//     }
//     type Query {
//       users: [User!]
//     }`
//   ),
//   parse(`
//     type Query {
//       viewer: User
//     }
//     type Mutation {
//       test: Boolean
//     }`
//   ),
//   parse(`
//     type Query {
//       findSomething(str: String): String
//     }`
//   )
// ]);
//
// console.log(print(combined));

/* Output:

 type Query {
   findSomething(str: String): String
   viewer: User
   users: [User!]
 }

 type Mutation {
  test: Boolean
 }

 type User {
   name: String!
   hash: String
   salt: String
 }

 */
