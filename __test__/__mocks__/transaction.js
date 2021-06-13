import faker from "faker";

const generate = (defaults) => {
  return {
    short_id: faker.lorem.word(),
    block_hash: faker.lorem.sentence(),
    block_number: faker.random.number(),
    from_address: faker.lorem.sentence(),
    hash: faker.lorem.sentence(),
    input: {},
    status: "pending",
    to_address: faker.lorem.sentence(),
    extra_data: {},
    ...defaults,
  };
};

export default generate;
