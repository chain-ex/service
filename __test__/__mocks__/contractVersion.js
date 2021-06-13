import faker from "faker";

const generate = (defaults) => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.words(5),
    short_id: faker.lorem.word(),
    contract_address: faker.lorem.word(),
    hash: faker.lorem.word(),
    tag: faker.commerce.color(),

    ...defaults,
  };
};

const generateFull = (defaults) => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.words(5),
    short_id: faker.lorem.word(),
    contract_address: faker.lorem.word(),
    hash: faker.lorem.word(),
    tag: faker.commerce.color(),
    abi: [],
    metadata: {},
    bytecode: faker.lorem.words(10),
    ...defaults,
  };
};

export default {
  generate,
  generateFull,
};
