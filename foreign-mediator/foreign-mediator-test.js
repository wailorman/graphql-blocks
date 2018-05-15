const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
// const _ = require('lodash');
const gql = require('graphql-tag');

const utils = require('../utils');
const ballFixtures = require('ball-fixtures');
const { relationAttrs } = require('./foreign-utils');

const { assert } = chai;
chai.use(chaiAsPromised);

exports.foreignMediatorTest = (config = {}) => {
  const {
    foreignEntityName = '',
    primaryEntityName = '',
    // foreignAttr,
    testCases = {},
    payloads = {},
    pkTypes = {},
    fields = {},
    relationType = 'belongsTo',

    shouldCascadeDelete,

    db,
    query,
  } = config;

  const fixtures = ballFixtures({ db });
  const { gu } = fixtures;

  const fNames = utils.casesForEntity(foreignEntityName);
  const pNames = utils.casesForEntity(primaryEntityName);
  const ra = relationAttrs(config);

  const primaryFields =
    fields.primary ||
    Object.keys(payloads.primary[0])
      .concat('id')
      .join(', ');

  const fFields =
    fields.foreign ||
    Object.keys(payloads.foreign[0])
      .concat('id')
      .join(', ');

  const pid = x => (pkTypes.primary === 'uuid' ? gu(x, 1) : `1${x}`);
  const fid = x => (pkTypes.foreign === 'uuid' ? gu(x, 2) : `2${x}`);

  const foreignDataMap = {
    primary: {
      belongsTo: {
        [ra.gql.foreignIdAttr]: fid(1),
      },
      hasOne: {},
      hasMany: {},
    },
    foreign: {
      belongsTo: {},
      hasOne: {
        [pNames.lowCamelId]: pid(1),
      },
      hasMany: {
        [pNames.lowCamelId]: pid(1),
      },
    },
  };

  const primaryRelations = foreignDataMap.primary[relationType];
  const foreignRelations = foreignDataMap.foreign[relationType];

  testCases.get &&
    describe(`# get`, () => {
      fixtures.jest({
        [pNames.camel]: [
          {
            ...payloads.primary[0],
            ...primaryRelations,
            id: pid(1),
          },
        ],
        [fNames.camel]: [
          {
            ...payloads.foreign[0],
            ...foreignRelations,
            id: fid(1),
          },
        ],
      });

      relationType === 'hasMany'
        ? it(`should resolve fields (many)`, async () => {
          const { res } = await query(
            gql`
                query Q($id: ID!) {
                  res: ${pNames.lowCamel}(id: $id) {
                    __typename
                    ${ra.gql.foreignIdAttr}
                    ${primaryFields}
                    ${ra.gql.foreignAttr} {
                      __typename
                      ${fFields}
                    }
                  }
                }
              `,
            {
              id: pid(1),
            },
          );

          assert.isNotNull(res);

          assert.isArray(res[ra.gql.foreignIdAttr], `foreignIds`);
          assert.isArray(res[ra.gql.foreignAttr], `foreignObjects`);

          assert.lengthOf(res[ra.gql.foreignIdAttr], 1, `foreignIds count`);
          assert.lengthOf(res[ra.gql.foreignAttr], 1, `foreignObjects count`);

          assert.deepEqual(res[ra.gql.foreignIdAttr], [fid(1)], `foreignIdAttr array`);

          assert.deepInclude(
            res[ra.gql.foreignAttr][0],
            {
              __typename: fNames.camel,
              ...payloads.foreign[0],
              id: fid(1),
            },
            `foreignObjects[0] object`,
          );
        })
        : it(`should resolve fields (one)`, async () => {
          const { res } = await query(
            gql`
                query Q($id: ID!) {
                  res: ${pNames.lowCamel}(id: $id) {
                    __typename
                    ${ra.gql.foreignIdAttr}
                    ${primaryFields}
                    ${ra.gql.foreignAttr} {
                      __typename
                      ${fFields}
                    }
                  }
                }
              `,
            {
              id: pid(1),
            },
          );

          assert.isNotNull(res);
          assert.deepInclude(res, {
            [ra.gql.foreignIdAttr]: fid(1),
          });

          assert.deepInclude(res[ra.gql.foreignAttr], {
            __typename: fNames.camel,
            ...payloads.foreign[0],
            id: fid(1),
          });
        });
    });

  // ---------------------------------------------------------------------------

  testCases.create &&
    describe(`# create`, () => {
      fixtures.jest({
        [fNames.camel]: [
          {
            ...payloads.foreign[0],
            id: fid(1),
          },
        ],
      });

      relationType === 'hasMany'
        ? it(`should attach foreign entities (many)`, async () => {
          const { res } = await query(
            gql`
                mutation M($input: ${pNames.camel}Input) {
                  res: create${pNames.camel}(input: $input) {
                    __typename
                    ${ra.gql.foreignIdAttr}
                    ${primaryFields}
                    ${ra.gql.foreignAttr} {
                      __typename
                      ${fFields}
                    }
                  }
                }
              `,
            {
              input: {
                [ra.gql.foreignIdAttr]: [fid(1)],
              },
            },
          );

          assert.isNotNull(res);

          assert.isArray(res[ra.gql.foreignIdAttr], `foreignIds`);
          assert.isArray(res[ra.gql.foreignAttr], `foreignObjects`);

          assert.lengthOf(res[ra.gql.foreignIdAttr], 1, `foreignIds count`);
          assert.lengthOf(res[ra.gql.foreignAttr], 1, `foreignObjects count`);

          assert.deepEqual(res[ra.gql.foreignIdAttr], [fid(1)], `foreignIdAttr array`);

          assert.deepInclude(
            res[ra.gql.foreignAttr][0],
            {
              __typename: fNames.camel,
              ...payloads.foreign[0],
              id: fid(1),
            },
            `foreignObjects[0] object`,
          );
        })
        : it(`should attach foreign entity (one)`, async () => {
          const { res } = await query(
            gql`
                mutation M($input: ${pNames.camel}Input) {
                  res: create${pNames.camel}(input: $input) {
                    __typename
                    ${ra.gql.foreignIdAttr}
                    ${primaryFields}
                    ${ra.gql.foreignAttr} {
                      __typename
                      ${fFields}
                    }
                  }
                }
              `,
            {
              input: {
                [ra.gql.foreignIdAttr]: fid(1),
              },
            },
          );

          assert.isNotNull(res);
          assert.deepInclude(res, {
            [ra.gql.foreignIdAttr]: fid(1),
          });

          assert.deepInclude(res[ra.gql.foreignAttr], {
            __typename: fNames.camel,
            ...payloads.foreign[0],
            id: fid(1),
          });
        });

      relationType !== 'hasMany' &&
        it(`should create & attach foreign entity`, async () => {
          const { res } = await query(
            gql`
              mutation M($input: ${pNames.camel}Input) {
                res: create${pNames.camel}(input: $input) {
                  __typename
                  ${ra.gql.foreignIdAttr}
                  ${primaryFields}
                  ${ra.gql.foreignAttr} {
                    __typename
                    ${fFields}
                  }
                }
              }
            `,
            {
              input: {
                [ra.gql.foreignAttr]: {
                  ...payloads.foreign[1],
                },
              },
            },
          );

          assert.isNotNull(res);
          assert.deepInclude(res[ra.gql.foreignAttr], {
            __typename: fNames.camel,
            ...payloads.foreign[1],
          });

          assert.notEqual(res[ra.gql.foreignAttr].id, fid(1), `${[ra.gql.foreignAttr]}.id`);
        });

      it(`should reject if foreign entity instance n/exist`, async () => {
        await assert.isRejected(
          query(
            gql`
              mutation M($input: ${pNames.camel}Input) {
                res: create${pNames.camel}(input: $input) {
                  __typename
                  ${ra.gql.foreignAttr} {
                    __typename
                  }
                }
              }
            `,
            {
              input: {
                [ra.gql.foreignIdAttr]: relationType === 'hasMany' ? [fid(999)] : fid(999),
              },
            },
          ),
          /not.+found/i,
        );
      });
    });

  // ---------------------------------------------------------------------------

  testCases.update &&
    describe(`# update`, () => {
      fixtures.jest({
        [pNames.camel]: [
          {
            ...payloads.primary[0],
            ...primaryRelations,
            id: pid(1),
          },
        ],
        [fNames.camel]: [
          {
            ...foreignRelations,
            ...payloads.foreign[0],
            id: fid(1),
          },
        ],
      });

      relationType === 'hasMany'
        ? describe(`> instanceId (many)`, () => {
          it(`should just change foreignId (many)`, async () => {
            const { res } = await query(
              gql`
                  mutation M($id: ID!, $input: ${pNames.camel}Input) {
                    res: update${pNames.camel}(id: $id, input: $input) {
                      __typename
                      ${ra.gql.foreignIdAttr}
                    }
                  }
                `,
              {
                id: pid(1),
                input: {
                  [ra.gql.foreignIdAttr]: [fid(1)],
                },
              },
            );

            assert.deepInclude(res, {
              [ra.gql.foreignIdAttr]: [fid(1)],
            });
          });

          it(`should reject if foreign entity instances (many) n/exist`, async () => {
            await assert.isRejected(
              query(
                gql`
                    mutation M($id: ID!, $input: ${pNames.camel}Input) {
                      res: update${pNames.camel}(id: $id, input: $input) {
                        __typename
                        ${ra.gql.foreignIdAttr}
                      }
                    }
                  `,
                {
                  id: pid(1),
                  input: {
                    [ra.gql.foreignIdAttr]: [fid(999)],
                  },
                },
              ),
              /not.+found/i,
            );
          });
        })
        : describe(`> instanceId`, () => {
          it(`should just change foreignId`, async () => {
            const { res } = await query(
              gql`
              mutation M($id: ID!, $input: ${pNames.camel}Input) {
                res: update${pNames.camel}(id: $id, input: $input) {
                  __typename
                  ${ra.gql.foreignIdAttr}
                }
              }
            `,
              {
                id: pid(1),
                input: {
                  [ra.gql.foreignIdAttr]: fid(1),
                },
              },
            );

            assert.deepInclude(res, {
              [ra.gql.foreignIdAttr]: fid(1),
            });
          });

          it(`should reject if foreign entity instance n/exist`, async () => {
            await assert.isRejected(
              query(
                gql`
                mutation M($id: ID!, $input: ${pNames.camel}Input) {
                  res: update${pNames.camel}(id: $id, input: $input) {
                    __typename
                    ${ra.gql.foreignIdAttr}
                  }
                }
              `,
                {
                  id: pid(1),
                  input: {
                    [ra.gql.foreignIdAttr]: fid(999),
                  },
                },
              ),
              /not.+found/i,
            );
          });
        });

      relationType !== 'hasMany' &&
        describe(`> instance`, () => {
          it(`should change instance attrs if already attached`, async () => {
            const { res } = await query(
              gql`
              mutation M($id: ID!, $input: ${pNames.camel}Input) {
                res: update${pNames.camel}(id: $id, input: $input) {
                  __typename
                  ${ra.gql.foreignAttr} {
                    __typename
                    ${fFields}
                  }
                }
              }
            `,
              {
                id: pid(1),
                input: {
                  [ra.gql.foreignAttr]: {
                    ...payloads.foreign[1],
                  },
                },
              },
            );

            assert.deepInclude(res[ra.gql.foreignAttr], {
              id: fid(1),
              ...payloads.foreign[1],
            });
          });

          it(`should create LE if not attached`, async () => {
            await fixtures.load({
              [pNames.camel]: [
                {
                  ...payloads.primary[0],
                  id: pid(1),
                },
              ],
              [fNames.camel]: [
                {
                  ...payloads.foreign[0],
                  id: fid(5),
                },
              ],
            });

            const { res } = await query(
              gql`
              mutation M($id: ID!, $input: ${pNames.camel}Input) {
                res: update${pNames.camel}(id: $id, input: $input) {
                  __typename
                  ${ra.gql.foreignAttr} {
                    __typename
                    ${fFields}
                  }
                }
              }
            `,
              {
                id: pid(1),
                input: {
                  [ra.gql.foreignAttr]: {
                    ...payloads.foreign[1],
                  },
                },
              },
            );

            assert.deepInclude(res[ra.gql.foreignAttr], {
              ...payloads.foreign[1],
            });

            assert.notEqual(res[ra.gql.foreignAttr].id, fid(1));
          });
        });
    });

  // ---------------------------------------------------------------------------

  testCases.delete &&
    describe(`# delete`, () => {
      fixtures.jest({
        [pNames.camel]: [
          {
            ...payloads.primary[0],
            ...primaryRelations,
            id: pid(1),
          },
        ],
        [fNames.camel]: [
          {
            ...payloads.foreign[0],
            ...foreignRelations,
            id: fid(1),
          },
        ],
      });

      it(`should ${shouldCascadeDelete ? 'cascade' : 'not cascade'} delete ${
        ra.foreign.camel
      }`, async () => {
        await query(
          gql`
            mutation M($id: ID!) {
              res: delete${pNames.camel}(id: $id) {
                __typename
              }
            }
          `,
          {
            id: pid(1),
          },
        );

        const foreignInstance = await db[fNames.camel].findById(fid(1));

        shouldCascadeDelete
          ? assert.isNull(foreignInstance, fNames.camel)
          : assert.isNotNull(foreignInstance, fNames.camel);
      });
    });
};
