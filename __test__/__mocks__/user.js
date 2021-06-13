import faker from "faker";

const generate = (defaults) => {
  return {
    name: faker.name.firstName(),
    surname: faker.name.lastName(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    password: faker.internet.password(),
    ...defaults,
  };
};

export default generate;
