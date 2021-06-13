import faker from "faker";
import { v4 as uuidv4 } from "uuid";

const generate = (defaults) => {
  return {
    token: uuidv4(),
    created_by: faker.random.number(1, 100000),
    application_id: faker.random.number(1, 100000),
    ...defaults,
  };
};

export default generate;
