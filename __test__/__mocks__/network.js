import faker from "faker";
import _ from "lodash";

const generate = (defaults) => {
  return {
    name: faker.lorem.word(),
    bctype: _.sample(["corda", "hyperledger", "quorum"]),
    version: faker.commerce.color(),
    consensus: faker.hacker.noun(),
    ip_address: faker.internet.ip(),
    ws_port: faker.random.number(65535),
    owner_id: faker.random.number(100000),
    ...defaults,
  };
};

export default generate;
