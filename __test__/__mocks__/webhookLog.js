import faker from "faker";
import moment from "moment";

const generate = (defaults) => {
  return {
    url: faker.internet.url(),
    authorization: { token: faker.lorem.word() },
    short_id: faker.lorem.word(),
    request_at: moment(),
    request: {
      text: faker.lorem.word(),
    },
    webhook_id: faker.random.number(10, 500),
    ...defaults,
  };
};

export default generate;
