import faker from "faker";
import { v4 as uuidv4 } from "uuid";

const generate = (defaults) => {
  return {
    token: uuidv4(),
    is_used: false,
    expired_in: Date.now() + 3600 * 1000 * 24 * 15,
    type: "verification",
    user_id: faker.random.number(1, 100000),
    ...defaults,
  };
};

export default generate;
