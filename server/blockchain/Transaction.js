/* eslint-disable camelcase */
import TransactionModel from "../models/transaction";

import { createLogger } from "../helpers/log";

const logger = createLogger("TX_BC");

class Transaction {
  constructor(
    { short_id, to_address, from_address, input = {} } = {},
    { afterTransactionHash } = {}
  ) {
    logger.debug("constructor start: ", short_id, to_address, from_address);
    this.input = input;
    this.short_id = short_id;
    this.to_address = to_address;
    this.from_address = from_address;
    this.afterTransactionHash = afterTransactionHash;
  }

  transactionHash(hash) {
    // Insert TransactionModel Status Pending
    this.hash = hash;

    if (
      this.afterTransactionHash &&
      typeof this.afterTransactionHash === "function"
    ) {
      try {
        this.afterTransactionHash(hash);
      } catch (err) {
        logger.error("transactionHash afterTransactionHash", err);
      }
    }

    return new TransactionModel({
      hash: this.hash,
      short_id: this.short_id,
      to_address: this.to_address,
      from_address: this.from_address,
      input: this.input,
    })
      .save()
      .catch((err) => {
        logger.error("transactionHash : ", err);
      });
  }

  error(errReceipt, secondReceipt) {
    if (!this.hash) {
      return null;
    }
    return TransactionModel.where({
      hash: this.hash,
    })
      .save(
        {
          block_number:
            errReceipt.blockNumber ||
            (secondReceipt && secondReceipt.blockNumber) ||
            0,
          block_hash:
            errReceipt.blockHash ||
            (secondReceipt && secondReceipt.blockHash) ||
            "",
          status: "failed",
          extra_data: {
            errorMessage:
              (secondReceipt && errReceipt) || "Transaction Reverted",
            cumulativeGasUsed:
              errReceipt.cumulativeGasUsed ||
              (secondReceipt && secondReceipt.cumulativeGasUsed) ||
              0,
            gasUsed:
              errReceipt.gasUsed ||
              (secondReceipt && secondReceipt.gasUsed) ||
              0,
          },
        },
        {
          method: "update",
        }
      )
      .catch((err) => {
        logger.error("error :", this.hash, err);
      });
  }
}

export default Transaction;
