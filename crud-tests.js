// const models = require('../../models');
const chai = require('chai');
const { generateNames } = require('./utils');
const ballFixtures = require('ball-fixtures');

const { assert } = chai;

module.exports = (conf = {}) => {
  const { queryFactory, db } = conf;
  const E = {};

  const query = queryFactory({ db });
  const fixtures = ballFixtures({ db });

  const getExamplePayloads = (exampleData) => {
    const splittedPayload = exampleData.payload && exampleData.expected;
    return splittedPayload
      ? exampleData
      : {
        payload: exampleData,
        expected: exampleData,
      };
  };

  E.gqlCrudTest = ({ entityName, examples }) => {
    const {
      gqlList: getEntityList,
      gqlOne: getEntity,
      // entityForeignKey,
      createEntity,
      updateEntity,
      deleteEntity,
    } = generateNames(entityName);

    beforeAll(async () => fixtures.truncateAll());
    afterAll(async () => fixtures.truncateAll());

    Object.keys(examples).forEach((caseName) => {
      const example = examples[caseName];

      const { fragment: fragmentDefinition, data: payloads, fixtures: _fixtures } = example;
      const fragmentName = '...Frag';

      const createPayload = getExamplePayloads(payloads[0]);
      const updatePayloads = payloads.slice(1);

      let instanceId;

      if (_fixtures) {
        beforeAll(async () => {
          await fixtures.load(_fixtures);
        });
      }

      describe(`> ${caseName}`, () => {
        it(`at first list should be empty`, async () => {
          const { getListRes } = await query(`{
            getListRes: ${getEntityList} {
              ${fragmentName}
            }
          } ${fragmentDefinition}`);

          assert.isArray(getListRes);
          assert.lengthOf(getListRes, 0);
        });

        it(`should create instance & receive correct response`, async () => {
          const { createRes } = await query(
            `mutation M ($input: ${entityName}Input) {
              createRes: ${createEntity}(input: $input) {
                ${fragmentName}
              }
            } ${fragmentDefinition}`,
            {
              input: createPayload.payload,
            },
          );

          instanceId = createRes.id;

          assert.isDefined(instanceId, 'instanceId');

          assert.deepInclude(createRes, createPayload.expected, 'data from response');
        });

        it(`should get instance & receive correct response`, async () => {
          const { getRes } = await query(
            `query Q ($id: ID!) {
              getRes: ${getEntity}(id: $id) {
                ${fragmentName}
              }
            } ${fragmentDefinition}`,
            {
              id: instanceId,
            },
          );

          assert.deepInclude(getRes, createPayload.expected, 'data from get');
        });

        it(`should get find instance in list query`, async () => {
          const { getListRes } = await query(`{
            getListRes: ${getEntityList} {
              ${fragmentName}
            }
          } ${fragmentDefinition}`);

          assert.isArray(getListRes);
          assert.lengthOf(getListRes, 1);

          assert.deepInclude(getListRes[0], createPayload.expected, 'data from get');
        });

        updatePayloads.forEach((_updatePayload, i) => {
          const updatePayload = getExamplePayloads(_updatePayload);

          it(`update #${i}: should update & receive correct response`, async () => {
            const { updRes } = await query(
              `mutation M ($id: ID!, $input: ${entityName}Input) {
                updRes: ${updateEntity}(id: $id, input: $input) {
                  ${fragmentName}
                }
              } ${fragmentDefinition}`,
              {
                id: instanceId,
                input: updatePayload.payload,
              },
            );

            assert.deepInclude(updRes, updatePayload.expected, 'data from response');
          });

          it(`update #${i}: should get & receive correct response`, async () => {
            const { getRes } = await query(
              `query Q ($id: ID!) {
                getRes: ${getEntity}(id: $id) {
                  ${fragmentName}
                }
              } ${fragmentDefinition}`,
              {
                id: instanceId,
              },
            );

            assert.deepInclude(getRes, updatePayload.expected, 'data from get');
          });
        });

        it(`should delete entity`, async () => {
          await query(
            `mutation M ($id: ID!) {
              result: ${deleteEntity}(id: $id) {
                __typename
              }
            }`,
            {
              id: instanceId,
            },
          );
        });

        it(`should not find deleted entity`, async () => {
          const { getRes } = await query(
            `query Q ($id: ID!) {
              getRes: ${getEntity}(id: $id) {
                ${fragmentName}
              }
            } ${fragmentDefinition}`,
            {
              id: instanceId,
            },
          );

          assert.isNull(getRes);
        });

        it(`should not find deleted entity in list query`, async () => {
          const { getListRes } = await query(`{
            getListRes: ${getEntityList} {
              ${fragmentName}
            }
          } ${fragmentDefinition}`);

          assert.isArray(getListRes);
          assert.lengthOf(getListRes, 0);
        });
      });
    });
  };

  return E;
};
