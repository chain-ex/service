import faker from "faker";

const generate = (defaults) => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.words(5),
    network_id: faker.random.number(1, 100000),
    owner_id: faker.random.number(1, 100000),
    is_deleted: false,
    ...defaults,
  };
};

export default generate;
