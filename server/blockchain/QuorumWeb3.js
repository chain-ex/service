import Web3 from "web3";
import numberToBN from "number-to-bn";
import Web3Base from "./Web3Base";
import { createLogger } from "../helpers/log";

const logger = createLogger("WEB3_QUORUM");

class QuorumWeb3 extends Web3Base {
  connect() {
    const that = this;

    return this.getNetworkDetail().then(async ({ ipAddress, port }) => {
      const connectionString = `ws://${ipAddress}:${port}`;
      logger.debug("connect start:", connectionString);

      const newWeb3 = new Web3(
        new Web3.providers.WebsocketProvider(connectionString)
      );
      that.web3 = newWeb3;
      await this.checkConnection();
      that.web3.extend({
        property: "eth",
        methods: [
          new that.web3.extend.Method({
            name: "getBlockByNumber",
            call: "eth_getBlockByNumber",
            params: 2,
            inputFormatter: [
              that.web3.extend.formatters.inputBlockNumberFormatter,
              (v) => !!v,
            ],
            outputFormatter: that.web3.extend.formatters.outputBlockFormatter,
          }),
        ],
      });
      that.web3.utils.hexToNumber = (v) => {
        if (!v) return v;
        try {
          return numberToBN(v).toNumber();
        } catch (e) {
          return numberToBN(v).toString();
        }
      };

      return newWeb3;
    });
  }
}

export default QuorumWeb3;
