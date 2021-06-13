/* eslint-disable eqeqeq */
import Web3 from "web3";

import NetworkModel from "../models/network";
import cache from "../../db/cache";

import { createLogger } from "../helpers/log";

const logger = createLogger("WEB3_BASE");

class Web3Base {
  constructor(network) {
    if (typeof network === "object") {
      // eslint-disable-next-line camelcase
      const { ip_address, ws_port } = network;
      // eslint-disable-next-line camelcase
      this.ipAddress = ip_address;
      // eslint-disable-next-line camelcase
      this.port = ws_port;
    } else {
      this.id = network;
    }
    this.web3 = new Web3();
  }

  getNetworkDetail() {
    return new Promise((resolve, reject) => {
      if (this.ipAddress && this.port) {
        resolve({ ipAddress: this.ipAddress, port: this.port });
      }

      NetworkModel.where({ id: this.id })
        .fetch({
          columns: ["ip_address", "ws_port"],
        })
        .then((returnData) => {
          // eslint-disable-next-line camelcase
          const { ip_address, ws_port } = returnData.toJSON();

          resolve({ ipAddress: ip_address, port: ws_port });
        })
        .catch(reject);
    });
  }

  async checkConnection() {
    const listening = await this.web3.eth.net.isListening();
    if (!listening) {
      logger.error("Listening :", new Error("Connection failed"));
      throw new Error("Connection failed");
    }
  }

  connect() {
    const that = this;

    return this.getNetworkDetail().then(async ({ ipAddress, port }) => {
      const connectionString = `ws://${ipAddress}:${port}`;
      logger.debug("connect start:", connectionString);

      const newWeb3 = new Web3(
        // eslint-disable-next-line camelcase
        new Web3.providers.WebsocketProvider(connectionString)
      );
      that.web3 = newWeb3;
      await this.checkConnection();
    });
  }

  async deploy(args = [], accountAddress, bytecode, abi) {
    logger.debug("Deploy start:", bytecode, args, accountAddress);

    if (typeof args === "string") {
      args = JSON.parse(args || "[]");
    }

    return new this.web3.eth.Contract(abi)
      .deploy({
        data: bytecode,
        arguments: args,
      })
      .send(
        {
          from: accountAddress,
          gas: 700000000,
        },
        function (error) {
          if (error) {
            logger.error("Deploy Sending ", error.message);
            throw error;
          }
        }
      )
      .on("error", function (error) {
        logger.error("Deploy Error : ", error.message);
        throw error;
      })
      .then((result) => {
        return result._address;
      });
  }

  getNodeInfo() {
    return this.web3.eth.getNodeInfo().catch((err) => {
      logger.error("nodeInfo: ", err);
    });
  }

  getBlockNumber() {
    return this.web3.eth.getBlockNumber().catch((err) => {
      logger.error("getBlockNumber :", err);
    });
  }

  getChainId() {
    return this.web3.eth.getChainId().catch((err) => {
      logger.error("getChainID :", err);
    });
  }

  getContract(abi, contractAddress) {
    this.Contract.web3Contract = new this.web3.eth.Contract(
      abi,
      contractAddress
    );
    this.Contract.web3 = this.web3;
    this.Contract.contractAddress = contractAddress;
    return this.Contract;
  }

  async newAccount() {
    return this.web3.eth.accounts.create();
  }

  async addWallet(privateKey) {
    this.web3.eth.accounts.wallet.add(privateKey);
  }
}

Web3Base.prototype.Contract = {
  call(method, sender, args) {
    return this.web3Contract.methods[method].apply(this, args).call({
      from: sender,
    });
  },
  async send(method, sender, args, txObj) {
    let nonce = await cache.get(`nonce-${sender}`).catch((err) => {
      logger.error("send get :", err);
    });

    logger.debug("send cached nonce ", nonce);

    if (nonce == undefined) {
      nonce = await this.web3.eth.getTransactionCount(sender);
      logger.debug("send getTransactionCount cache", nonce);
      nonce = await cache
        .setIncr(`nonce-${sender}`, nonce - 1, 10)
        .catch((err) => {
          logger.error("send setIncr :", err);
        });

      logger.debug("send setIncr cache", nonce);
    } else {
      nonce = await cache.incr(`nonce-${sender}`, 3).catch((err) => {
        logger.error("send incr :", err);
      });
      logger.debug("nonce incr cache", nonce);
    }

    logger.debug("send start:", method, sender, args, nonce);

    this.web3Contract.methods[method]
      .apply(this, args)
      .send({
        from: sender,
        gas: 700000000,
        nonce,
      })
      .on("error", (errMsg) => {
        cache.del(`nonce-${sender}`).catch((err) => {
          logger.error("error delete :", err);
        });
        logger.debug("send error : ", errMsg);
        if (typeof txObj.error === "function") {
          txObj.error(errMsg);
        }
      })
      .on("transactionHash", (txHash) => {
        logger.debug("send transactionHash :", nonce, txHash);
        if (typeof txObj.transactionHash === "function") {
          txObj.transactionHash(txHash);
        }
      });
  },
};

export default Web3Base;
