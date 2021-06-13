import faker from "faker";

const generate = (defaults) => {
  return {
    name: faker.lorem.word(),
    address: faker.lorem.word(),
    private_key: faker.lorem.word(),
    short_id: faker.lorem.word(),
    ...defaults,
  };
};

export default generate;
