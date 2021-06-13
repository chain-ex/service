// Models
import TransactionModel from "../../server/models/transaction";

import Transaction from "../../server/blockchain/Transaction";

describe("Transaction", () => {
  test("should create Transaction Object", () => {
    const transaction = new Transaction({
      afterTransactionHash: () => {},
    });
    expect(transaction.transactionHash).toBeFunction();
    expect(transaction.error).toBeFunction();
  });

  describe("#transactionHash", () => {
    test("should create Transaction Model Instance", async (done) => {
      const transaction = new Transaction({
        short_id: "test",
        to_address: "toAddress",
        from_address: "fromAddress",
        input: {
          args: [123],
        },
      });

      await transaction.transactionHash("testHash");

      TransactionModel.where({
        hash: "testHash",
      })
        .fetch()
        .then((result) => {
          expect(result.get("hash")).toBe("testHash");
          expect(result.get("short_id")).toBe("test");
          expect(result.get("to_address")).toBe("toAddress");
          expect(result.get("from_address")).toBe("fromAddress");
          expect(result.get("status")).toBe("pending");
          expect(result.get("input")).toEqual({
            args: [123],
          });
          done();
        })
        .catch(done);
    });

    test("should call afterTransactionHash if exists", () => {
      const afterTransactionHash = jest.fn(() => {});
      const transaction = new Transaction(
        {},
        {
          afterTransactionHash,
        }
      );

      transaction.transactionHash("testHash");

      expect(afterTransactionHash).toBeCalledTimes(1);
      expect(afterTransactionHash).toBeCalledWith("testHash");
    });

    test("should call afterTransactionHash and handle error", () => {
      const afterTransactionHash = jest.fn(() => {
        throw new Error();
      });

      const transaction = new Transaction(
        {},
        {
          afterTransactionHash,
        }
      );

      transaction.transactionHash("testHash");

      expect(afterTransactionHash).toBeCalledTimes(1);
    });
  });

  describe("#error", () => {
    const testTx = {
      blockNumber: 100,
      blockHash: "testBlockHash",
      cumulativeGasUsed: 200,
      gasUsed: 300,
    };
    test("should not update non-exists transaction hash", async (done) => {
      const wrongTransaction = new Transaction();

      await wrongTransaction.transactionHash("wrongTestHash");

      await wrongTransaction.error(testTx).then(done);

      done();
    });
    test("should update transaction hash as failed with receipt", async (done) => {
      const transaction = new Transaction({
        short_id: "test",
        to_address: "toAddress",
        from_address: "fromAddress",
      });

      await transaction.transactionHash("testHash");

      transaction.error(testTx).then(() => {
        TransactionModel.where({ hash: "testHash" })
          .fetch()
          .then((result) => {
            expect(result.get("status")).toBe("failed");
            expect(result.get("block_number")).toBe(testTx.blockNumber);
            expect(result.get("block_hash")).toBe(testTx.blockHash);
            expect(result.get("extra_data").cumulativeGasUsed).toBe(
              testTx.cumulativeGasUsed
            );
            expect(result.get("extra_data").gasUsed).toBe(testTx.gasUsed);
            expect(result.get("extra_data").errorMessage).toBe(
              "Transaction Reverted"
            );
            done();
          });
      });
    });

    test("should update transaction hash as failed with receipt and message", async (done) => {
      const transaction = new Transaction({
        short_id: "test",
        to_address: "toAddress",
        from_address: "fromAddress",
      });

      await transaction.transactionHash("testHash");

      transaction.error("Error Message", testTx).then(() => {
        TransactionModel.where({ hash: "testHash" })
          .fetch()
          .then((result) => {
            expect(result.get("status")).toBe("failed");
            expect(result.get("block_number")).toBe(testTx.blockNumber);
            expect(result.get("block_hash")).toBe(testTx.blockHash);
            expect(result.get("extra_data").cumulativeGasUsed).toBe(
              testTx.cumulativeGasUsed
            );
            expect(result.get("extra_data").gasUsed).toBe(testTx.gasUsed);
            expect(result.get("extra_data").errorMessage).toBe("Error Message");
            done();
          });
      });
    });
  });
});
