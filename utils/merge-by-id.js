const mergeById = (exist, payload) => {
  const toCreate = [];
  const toUpdate = [];
  const toDelete = [];

  const existMap = exist.reduce((prev, cur) => {
    prev[cur] = true;
    return prev;
  }, {});

  const payloadMap = payload.reduce((prev, cur) => {
    prev[cur] = true;
    return prev;
  }, {});

  payload.forEach((pId) => {
    if (pId in existMap) {
      toUpdate.push(pId);
    } else {
      toCreate.push(pId);
    }
  });

  exist.forEach((eId) => {
    if (!(eId in payloadMap)) {
      toDelete.push(eId);
    }
  });

  return { toCreate, toUpdate, toDelete };
};

module.exports = mergeById;
