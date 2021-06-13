import faker from "faker";

const generate = (defaults) => {
  return {
    name: faker.lorem.word(),
    description: faker.lorem.words(10),
    url: faker.internet.url(),
    authorization: { token: faker.lorem.word() },
    short_id: faker.lorem.word(),
    ...defaults,
  };
};

export default generate;
