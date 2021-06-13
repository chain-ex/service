import faker from "faker";

const generate = (defaults) => {
  return {
    type: faker.random.arrayElement(["call", "send"]),
    method: faker.lorem.word(),
    status: faker.random.arrayElement([true, false]),
    short_id: faker.lorem.word(),
    ...defaults,
  };
};

export default generate;
