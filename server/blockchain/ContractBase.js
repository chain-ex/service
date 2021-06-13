/**
 * Web3?
 *
 * --- Deploy
 * Account
 * ABI
 * ByteCode
 *
 * -- Interaction
 * Account Control!
 * ABI
 * Args
 *
 */

/**
 * 0- Pull Network
 * 1- Web3 Oluştur
 * 2- Compile Et !!!
 * 3- Account oluştur !!!
 * 4- Account Add Wallet !!!
 * 5- Contract Oluştur
 * 6- ContractBase Oluştur
 * 7- Deploy
 */

import { createLogger } from "../helpers/log";

const logger = createLogger("CONT_BASE");

class ContractBase {
  constructor(web3, contract, bytecode) {
    this.contract = contract;
    this.bytecode = bytecode;
    this.web3 = web3;
    this.defaultAccount = null;
  }

  // eslint-disable-next-line class-methods-use-this
  deploy(args = [], accountAddress, bytecode) {
    if (!bytecode) bytecode = this.bytecode;

    logger.debug("Deploy start:", bytecode, args, accountAddress);

    if (typeof args === "string") {
      args = JSON.parse(args || "[]");
    }

    return this.contract
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
      });
  }

  // eslint-disable-next-line class-methods-use-this
  async send(method, args, sender) {
    if (!sender) sender = this.defaultAccount;
    return this.contract.methods[method].apply(this, args).send({
      gas: 800007000000000000,
      from: sender,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  async call(method, args, sender) {
    return this.contract.methods[method].apply(this, args).call({
      from: sender,
    });
  }
}

export default ContractBase;
