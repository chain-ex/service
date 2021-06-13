import faker from "faker";

export const generateBazaar = (defaults) => {
  return {
    abi: faker.lorem.sentences(),
    bytecode: faker.lorem.sentence(),
    metadata: faker.lorem.sentences(),
    name: faker.commerce.productName(),
    owner_id: faker.random.number(100000),
    is_public: faker.random.boolean(),
    description: faker.lorem.words(5),
    bazaar_version: faker.lorem.word(),
    ...defaults,
  };
};

export const generateFullBazaar = (defaults) => {
  return {
    abi: faker.lorem.sentences(),
    bytecode: faker.lorem.sentence(),
    metadata: faker.lorem.sentences(),
    name: faker.commerce.productName(),
    owner_id: faker.random.number(100000),
    is_public: faker.random.boolean(),
    description: faker.lorem.words(5),
    bazaar_version: faker.lorem.word(),
    applicationID: faker.random.number(10000),
    networkID: faker.random.number(10000),
    ...defaults,
  };
};
export default generateBazaar;
