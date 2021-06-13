import faker from "faker";

export const generate = (defaults) => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.words(5),
    owner_id: faker.random.number(100000),
    application_id: faker.random.number(100000),
    is_deleted: false,
    ...defaults,
  };
};

export const generateFull = (defaults) => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.words(5),
    owner_id: faker.random.number(100000),
    network_id: faker.random.number(100000),
    application_id: faker.random.number(100000),
    short_id: faker.lorem.word(),
    is_deleted: false,
    owner_address: "0x92bC46b77F93fA717964E659cf1455c9Fc194016",
    owner_privatekey:
      "0xa1912c74eabff3f9533d8c1d1116f725408905db31cc738e785999aff701c950",
    ...defaults,
  };
};

export default generate;
