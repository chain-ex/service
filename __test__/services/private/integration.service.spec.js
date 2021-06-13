import request from "supertest";
import ganache from "ganache-core";
import axios from "axios";

// Compiled Contract
import CompiledContracts from "./contracts/compiledContracts.json";

// Mocks
import { generate } from "../../__mocks__/contract";
import ContractVersionMock from "../../__mocks__/contractVersion";
import ContractAccountMock from "../../__mocks__/contractAccount";
import ApplicationMock from "../../__mocks__/application";
import NetworkMock from "../../__mocks__/network";
import WebhookMock from "../../__mocks__/webhook";
import ApiKeyMock from "../../__mocks__/apiKey";
import UserMock from "../../__mocks__/user";

// Models
import ContractModel from "../../../server/models/contract";
import ContractVersionModel from "../../../server/models/contractVersion";
import ContractAccountModel from "../../../server/models/contractAccount";
import ApplicationModel from "../../../server/models/application";
import NetworkModel from "../../../server/models/network";
import WebhookModel from "../../../server/models/webhook";
import ApiKeyModel from "../../../server/models/apiKey";
import UserModel from "../../../server/models/user";

import config from "../../../config";
import server from "../../../server";

// Blockchain
import QuorumWeb3 from "../../../server/blockchain/QuorumWeb3";

const { CODE } = config;

// Fix the date
jest.mock("moment", () => {
  return () => jest.requireActual("moment")("2020-08-07T00:00:00.000Z");
});

const ServicePath = `/int/:shortID/:method`;
const ServicePathWithTag = `/int/:shortID/:tag/:method`;

function setTestURL(shortID, method) {
  return ServicePath.replace(":shortID", shortID).replace(":method", method);
}

function setTestTagURL(shortID, tag, method) {
  return ServicePathWithTag.replace(":shortID", shortID)
    .replace(":tag", tag)
    .replace(":method", method);
}

let ganacheServer;

async function DeployContract(testBytecode, testABI, args) {
  const ownerUser = await new UserModel(UserMock()).save();
  const insertedNetwork = await NetworkModel.forge(
    NetworkMock({
      ws_port: 8888,
      ip_address: "localhost",
    })
  ).save();
  const insertedApplication = await new ApplicationModel(
    ApplicationMock({
      owner_id: ownerUser.id,
      network_id: insertedNetwork.id,
    })
  ).save();

  const insertedApiKey = await new ApiKeyModel(
    ApiKeyMock({
      application_id: insertedApplication.id,
    })
  ).save();

  const networkID = insertedNetwork.id;
  const currentWeb3 = new QuorumWeb3(networkID);

  await currentWeb3.connect();

  const ownerAccount = await currentWeb3.newAccount();
  const otherAccount = await currentWeb3.newAccount();

  currentWeb3.addWallet(ownerAccount.privateKey);
  currentWeb3.addWallet(otherAccount.privateKey);

  const contractAddress = await currentWeb3.deploy(
    args,
    ownerAccount.address,
    testBytecode,
    testABI
  );

  const insertedData = generate({
    owner_id: 500,
    application_id: insertedApplication.id,
    network_id: networkID,
    short_id: "TUBUTEST",
    owner_address: ownerAccount.address,
    owner_privatekey: ownerAccount.privateKey,
  });

  const insertedVersion = ContractVersionMock.generateFull({
    abi: JSON.stringify(testABI),
    bytecode: testBytecode,
    metadata:
      '{"compiler":{"version":"0.6.11+commit.5ef660b1"},"language":"Solidity","output":{"abi":[{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"uint256","name":"_quantity","type":"uint256"},{"internalType":"bool","name":"_isSolid","type":"bool"}],"name":"addItem","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getItems","outputs":[{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"quantity","type":"uint256"},{"internalType":"bool","name":"isSolid","type":"bool"}],"internalType":"struct Stack.Item[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getLastItem","outputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"uint256","name":"quantity","type":"uint256"},{"internalType":"bool","name":"isSolid","type":"bool"}],"stateMutability":"view","type":"function"}],"devdoc":{"kind":"dev","methods":{},"version":1},"userdoc":{"kind":"user","methods":{},"version":1}},"settings":{"compilationTarget":{"Basic.sol":"Stack"},"evmVersion":"istanbul","libraries":{},"metadata":{"bytecodeHash":"ipfs"},"optimizer":{"enabled":false,"runs":200},"remappings":[]},"sources":{"Basic.sol":{"keccak256":"0xcc7a0478cedaa54928f7022858b9b7c679a54b4af802146672ba64a588bd7e63","urls":["bzz-raw://54472187b21f1979a5e0e3b7f07823cef1201fd8d05d6bea558bba5380bbf591","dweb:/ipfs/QmYuyRPQtWRwgojexRDh4DBegfqRySgqNnZ4jRZ68cHYrr"]}},"version":1}',
    contract_address: contractAddress,
    short_id: "TUBUTEST",
  });

  await new ContractModel(insertedData).save();

  await new ContractAccountModel(
    ContractAccountMock({
      short_id: insertedData.short_id,
      address: otherAccount.address,
      private_key: otherAccount.privateKey,
    })
  ).save();

  const savedVersion = await new ContractVersionModel(insertedVersion).save();

  return {
    otherAddr: otherAccount.address,
    ownerAddr: ownerAccount.address,
    tag: savedVersion.get("tag"),
    apiKey: insertedApiKey.get("token"),
  };
}

describe("Contract Integration Routes", () => {
  beforeEach((done) => {
    ganacheServer = ganache.server({
      ws: true,
      gasPrice: "0x0",
      gasLimit: "0xffffffffff",
    });
    ganacheServer.listen(8888, (err) => {
      done(err);
    });
  });
  afterEach((done) => {
    ganacheServer.close((err) => {
      done(err);
    });
  });

  let apiKey = "";
  describe(`POST : /int/:shortID/:method`, () => {
    let ownerAddr = "";
    let otherAddr = "";
    describe("invoke a basic deployed contract function(v0.6.0)", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["BasicSOLV0.6.0"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );

        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        done();
      });
      // gg
      test("success call without address", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEST", "addItem"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
      // gg
      test("success call with other address", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEST", "addItem"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
            account: otherAddr,
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
      // gg
      test("error call with wrong shortID", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEEST", "addItem"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
          })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      // gg
      test("error call with wrong method", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEST", "addItemxxxxx"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
          })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      // gg
      test("dont invoke a deleted contract", async (done) => {
        await ContractModel.where({ short_id: "TUBUTEST" }).save(
          { is_deleted: true },
          { method: "update" }
        );

        request(server)
          .post(setTestURL("TUBUTEST", "addItem"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
          })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
    });

    describe("invoke a basic deployed contract function(v0.6.11)", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["BasicSOLV0.6.11"];

        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );

        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        done();
      });

      test("success call without acddresss", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEST", "addTeam"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["başakşehir", "şafak öksüzer"],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            expect(err).toBeNil();
            done();
          });
      });

      test("success call with other address", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEST", "addTeam"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["başakşehir", "şafak öksüzer"],
            account: otherAddr,
          })
          .expect(CODE.OK)
          .end((err, res) => {
            // TODO: RESPONSE DOES NOT INCLUDE DECODED OUTPUT
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
    });

    describe("invoke a function of a contract with inheritance(v0.6.8)", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["InheritanceSOLv0.6.8"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        done();
      });

      test("invoke a add method from contract v(0.6.8)", async (done) => {
        request(server)
          .post(setTestURL("TUBUTEST", "add"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: [13],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });

      test("invoke add method(v0.6.0) with event and webhook", async (done) => {
        await WebhookModel.forge(
          WebhookMock({
            short_id: "TUBUTEST",
            url: "tubu.io/webhook",
          })
        ).save();

        axios.post = jest.fn().mockImplementationOnce((url, data) =>
          Promise.resolve({
            status: 200,
            data,
          })
        );

        request(server)
          .post(setTestURL("TUBUTEST", "add"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: [123],
          })
          .expect(CODE.OK)
          .end(async (err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
    });
  });
  describe(`GET : /int/:shortID/:method`, () => {
    let ownerAddr = "";
    let otherAddr = "";

    describe("call a function of a contract with inheritance after local function invoke(v0.6.8)", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["InheritanceSOLv0.6.8"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        done();
      });

      test("call a function of a contract with inheritance after local function invoke(v0.6.8)", async (done) => {
        request(server)
          .get(setTestURL("TUBUTEST", "total"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            done();
          });
      });
      test("do not call a function of a contract with inheritance after local function invoke(v0.6.8) in unauthorized app", async (done) => {
        request(server)
          .get(setTestURL("TUBUTEST", "total"))
          .set("_uid", 500)
          .set("ApiKey", "asdkljfakdgshjlawkejhg")
          .expect(CODE.UNAUTHORIZED)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      test("do not call a function from deleted contract", async (done) => {
        await ContractModel.where({ short_id: "TUBUTEST" }).save(
          { is_deleted: true },
          { method: "update" }
        );
        request(server)
          .get(setTestURL("TUBUTEST", "total"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
    });

    describe("call a function of a contract with inheritance after inherited function invoke(v0.6.8)", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["InheritanceSOLv0.6.8"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        done();
      });

      test("call total function function from a contract with inheritance after inherited function invoke(v0.6.8)", async (done) => {
        request(server)
          .get(setTestURL("TUBUTEST", "total"))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            done();
          });
      });
      test("do not call total function function from a contract with inheritance after inherited function invoke(v0.6.8) in unauthorized app", async (done) => {
        request(server)
          .get(setTestURL("TUBUTEST", "total"))
          .set("_uid", 500)
          .set("ApiKey", "asdklfalkgdsjlakhjsgelujh")
          .expect(CODE.UNAUTHORIZED)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
    });
  });
  describe(`POST : /int/:shortID/:method/:tag?`, () => {
    let ownerAddr = "";
    let otherAddr = "";
    let tag = "";

    describe("invoke a basic deployed contract function(v0.6.0) with tag", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["BasicSOLV0.6.0"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        apiKey = returnDeploy.apiKey;
        tag = returnDeploy.tag;
        done();
      });

      test("invoke addItem contract method with simple parameters", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "addItem", tag))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
      test("do not invoke addItem contract method with simple parameters in unauthorized app", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "addItem", tag))
          .set("_uid", 500)
          .set("ApiKey", "asdasdfawe")
          .send({
            args: ["test", 123, true],
          })
          .expect(CODE.UNAUTHORIZED)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });

      test("invoke addItem contract method with simple parameters via other account", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "addItem", tag))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["test", 123, true],
            account: otherAddr,
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
    });

    describe("invoke a basic deployed contract function(v0.6.11) with tag", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["BasicSOLV0.6.11"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        tag = returnDeploy.tag;
        done();
      });
      test("invoke addTeam contract method with simple parameters with owner", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "addTeam", tag))
          .set("_uid", 500)
          .set("ApiKey", apiKey)
          .send({
            args: ["başakşehir", "şafak öksüzer"],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
      test("invoke addTeam contract method with simple parameters via other account", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "addTeam", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .send({
            args: ["başakşehir", "şafak öksüzer"],
            account: otherAddr,
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
    });

    describe("invoke a function of a contract with inheritance(v0.6.8) with tag", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["InheritanceSOLv0.6.8"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        tag = returnDeploy.tag;
        done();
      });

      test("invoke add contract method with simple parameters", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "add", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .send({
            args: [13],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });

      test("invoke add contract method with simple parameters via other account", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "add", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .send({
            args: [13],
            account: otherAddr,
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });

      test("invoke remove contract method with simple parameters", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "remove", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .send({
            args: [32],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });

      test("invoke remove contract method with simple parameters via other account", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "remove", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .send({
            args: [123],
            account: otherAddr,
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
    });

    describe("invoke a basic deployed contract function(v0.6.0) with event and webhook with tag", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["BasicEventSolV0.6.0"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi,
          [200]
        );
        apiKey = returnDeploy.apiKey;
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        tag = returnDeploy.tag;
        done();
      });
      test("invoke add method with simple parameters", async (done) => {
        request(server)
          .post(setTestTagURL("TUBUTEST", "add", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .send({
            args: [123],
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(66);
            done();
          });
      });
    });
  });
  describe(`GET : /int/:shortID/:method/:tag?`, () => {
    let ownerAddr = "";
    let otherAddr = "";
    let tag = "";
    describe("call a function of a contract with inheritance after local function invoke(v0.6.8) with tag", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["InheritanceSOLv0.6.8"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        ownerAddr = returnDeploy.ownerAddr;
        otherAddr = returnDeploy.otherAddr;
        apiKey = returnDeploy.apiKey;
        tag = returnDeploy.tag;
        done();
      });
      test("call total function", async (done) => {
        request(server)
          .get(setTestTagURL("TUBUTEST", "total", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            done();
          });
      });
    });

    describe("call a function of a contract with inheritance after inherited function invoke(v0.6.8) with tag", () => {
      beforeEach(async (done) => {
        const compiledContract = CompiledContracts["InheritanceSOLv0.6.8"];
        const returnDeploy = await DeployContract(
          compiledContract.bytecode,
          compiledContract.abi
        );
        apiKey = returnDeploy.apiKey;
        tag = returnDeploy.tag;
        done();
      });
      test("call total function", async (done) => {
        request(server)
          .get(setTestTagURL("TUBUTEST", "total", tag))
          .set("ApiKey", apiKey)
          .set("_uid", 500)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            done();
          });
      });
    });
  });
});
