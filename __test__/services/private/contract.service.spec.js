import request from "supertest";
import ganache from "ganache-core";

// Mocks
import { generate, generateFull } from "../../__mocks__/contract";
import ApplicationMock from "../../__mocks__/application";
import NetworkMock from "../../__mocks__/network";
import ContractAccountMock from "../../__mocks__/contractAccount";
import ContractVersionMock from "../../__mocks__/contractVersion";
import UserMock from "../../__mocks__/user";

// Models
import ContractModel from "../../../server/models/contract";
import ContractAccountModel from "../../../server/models/contractAccount";
import ApplicationModel from "../../../server/models/application";
import NetworkModel from "../../../server/models/network";
import ContractVersionModel from "../../../server/models/contractVersion";
import UserModel from "../../../server/models/user";

import config from "../../../config";
import server from "../../../server";

const { CODE, apiVersion } = config;

// Unlock Authorization
jest.mock("../../../server/middleware/auth_middleware", () =>
  jest.fn((req, res, next) => {
    req.userData = {
      uid: req.headers._uid,
    };
    next();
  })
);

const ServicePathWithId = `/${apiVersion}/network/:networkID/contract/:shortID`;

function setTestURL(networkID, shortID = "") {
  return ServicePathWithId.replace(":networkID", networkID).replace(
    ":shortID",
    shortID
  );
}

let ganacheServer;

describe("Contract Routes", () => {
  let ownerUser;
  beforeEach(async (done) => {
    ownerUser = await new UserModel(UserMock()).save();
    done();
  });
  describe("Contract Base", () => {
    describe(`POST : /network/:networkID/contract`, () => {
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

      test("cannot deploy contract without files", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.expect(CODE.ERR).end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });
      test("cannot deploy contract with invalid files", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("file1", `${__dirname}/contracts/wrongFile.txt`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.expect(CODE.ERR).end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });
      test("create a new contract with required parameters on body and basic contract file with owner id", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("files", `${__dirname}/contracts/Basic.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();

          expect(res.body.data).toBeTruthy();

          const { contract, contractVersion } = res.body.data;

          expect(contractVersion.hash).toBeTruthy();
          expect(contract.short_id).toBe(contractVersion.short_id);
          expect(contract).toContainKeys(Object.keys(insertedData));
          expect(contract).toContainValues(Object.values(insertedData));

          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });
      test("create a new contract with required parameters on body and basic inheritance contract files with owner id", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("files", `${__dirname}/contracts/BasicInheritance.sol`)
          .attach("files", `${__dirname}/contracts/Inheritance.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.errors).toBeUndefined();

          const { contract, contractVersion } = res.body.data;

          expect(contractVersion.hash).toBeTruthy();
          expect(contract.short_id).toBe(contractVersion.short_id);

          expect(contract).toContainKeys(Object.keys(insertedData));
          expect(contract).toContainValues(Object.values(insertedData));

          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });
      test("v0.6.11 solidity contract deploy success", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();
        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("files", `${__dirname}/contracts/SoccerContract.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();

          const { contract, contractVersion } = res.body.data;

          expect(contractVersion.hash).toBeTruthy();
          expect(contract.short_id).toBe(contractVersion.short_id);

          expect(contract).toContainKeys(Object.keys(insertedData));
          expect(contract).toContainValues(Object.values(insertedData));

          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });

      test("v0.6.0 nested solidity contract deploy with parameters success", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();
        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("files", `${__dirname}/contracts/UniversityEmployee.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.field(
          "args",
          JSON.stringify([
            "Berk",
            32,
            [11, 6, 2020],
            3500,
            "Math",
            30,
            6700,
            "Algorithm",
            45,
            "Prof",
          ])
        );

        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();

          const { contract, contractVersion } = res.body.data;

          expect(contractVersion.hash).toBeTruthy();
          expect(contract.short_id).toBe(contractVersion.short_id);

          expect(contract).toContainKeys(Object.keys(insertedData));
          expect(contract).toContainValues(Object.values(insertedData));

          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });

      test("v0.6.0 nested solidity contract deploy double time with parameters success", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();
        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        // First Request
        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("files", `${__dirname}/contracts/UniversityEmployee.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }

        testRequest.field(
          "args",
          JSON.stringify([
            "Berk",
            32,
            [11, 6, 2020],
            3500,
            "Math",
            30,
            6700,
            "Algorithm",
            45,
            "Prof",
          ])
        );

        // Second Request
        const testRequest2 = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("files", `${__dirname}/contracts/UniversityEmployee.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest2.field(key, insertedData[key]);
        }

        testRequest2.field(
          "args",
          JSON.stringify([
            "Berk",
            32,
            [11, 6, 2020],
            3500,
            "Math",
            30,
            6700,
            "Algorithm",
            45,
            "Prof",
          ])
        );

        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();

          const { contract, contractVersion } = res.body.data;

          expect(contractVersion.hash).toBeTruthy();
          expect(contract.short_id).toBe(contractVersion.short_id);
          expect(contract).toContainKeys(Object.keys(insertedData));
          expect(contract).toContainValues(Object.values(insertedData));
          expect(err).toBeNil();
          expect(res).toBeTruthy();

          testRequest2.expect(CODE.CREATED).end((err2, res2) => {
            expect(err2).toBeNil();
            expect(res2).toBeTruthy();
            done();
          });
        });
      });
      test("dont deploy new version to a deleted contract", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();
        const insertedDeletedContract = await new ContractModel(
          generateFull({
            owner_id: ownerUser.id,
            application_id: insertedApplication.id,
            network_id: insertedNetwork.id,
            is_deleted: true,
          })
        );
        const insertedData = generate({
          owner_id: ownerUser.id,
          application_id: insertedApplication.id,
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("file1", `${__dirname}/contracts/wrongFile.txt`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedData)) {
          testRequest.field(key, insertedData[key]);
        }
        testRequest.field("short_id", insertedDeletedContract.get("short_id"));
        testRequest.expect(CODE.ERR).end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });
    });
    describe(`GET : /network/:networkID/contract`, () => {
      let insertedApp;
      beforeEach((done) => {
        ApplicationModel.forge(
          ApplicationMock({
            owner_id: ownerUser.id,
          })
        )
          .save()
          .then((savedApp) => {
            insertedApp = savedApp.toJSON();
            done();
          });
      });

      test("get owner-s all contract list by using default parameters", async (done) => {
        const ownerData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 888,
        });

        const otherData = generateFull({
          owner_id: 564,
          application_id: 43,
          network_id: 888,
        });

        const insertingPromises = [];
        for (let i = 0; i < 3; i += 1) {
          insertingPromises.push(ContractModel.forge(ownerData).save());
        }
        for (let i = 0; i < 5; i += 1) {
          insertingPromises.push(ContractModel.forge(otherData).save());
        }

        await Promise.all(insertingPromises);

        const testRequest = request(server)
          .get(setTestURL(888))
          .query({
            appID: insertedApp.id,
          })
          .set("_uid", ownerUser.id);

        testRequest.expect(CODE.OK).end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();

          expect(res.body.data).toHaveLength(3);
          expect(res.body.pagination).toContainAllValues([1, 3, 20, 1]);
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
      });
      test("don-t get contract list by using default parameters with incorrect owner", async (done) => {
        const insertedData = generateFull({
          owner_id: ownerUser.id,
          network_id: 900,
          application_id: insertedApp.id,
        });

        const insertingPromises = [];

        for (let i = 0; i < 10; i += 1) {
          insertingPromises.push(ContractModel.forge(insertedData).save());
        }

        await Promise.all(insertingPromises);

        const testRequest = request(server)
          .get(setTestURL(900))
          .query({
            appID: 600,
          })
          .set("_uid", 550);

        testRequest.expect(CODE.ERR).end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
      });
    });
    describe(`GET : /network/:networkID/contract/:shortID`, () => {
      let insertedApp;
      beforeEach((done) => {
        ApplicationModel.forge(
          ApplicationMock({
            owner_id: ownerUser.id,
          })
        )
          .save()
          .then((savedApp) => {
            insertedApp = savedApp.toJSON();
            done();
          });
      });

      test("get owner-s own or shared contracts with shortID", async (done) => {
        const insertedData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 500,
        });

        const otherData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 500,
        });

        await ContractModel.forge(otherData).save();

        const newContract = await ContractModel.forge(insertedData).save();

        await ContractVersionModel.forge(
          ContractVersionMock.generateFull({
            short_id: newContract.get("short_id"),
            tag: "tag1",
          })
        ).save();

        await ContractVersionModel.forge(
          ContractVersionMock.generateFull({
            short_id: newContract.get("short_id"),
            tag: "tag2",
          })
        ).save();

        await ContractVersionModel.forge(
          ContractVersionMock.generateFull({
            short_id: newContract.get("short_id"),
            tag: "latest",
          })
        ).save();

        request(server)
          .get(setTestURL(500, newContract.get("short_id")))
          .set("_uid", ownerUser.id)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toBeTruthy();

            const { contract, version, versionList } = res.body.data;

            expect(contract).toContainAllKeys([
              "short_id",
              "application_id",
              "name",
              "description",
            ]);
            expect(version).toContainAllKeys([
              "abi",
              "name",
              "description",
              "contract_address",
              "tag",
            ]);
            expect(version.tag).toBe("latest");
            expect(versionList).toHaveLength(3);
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            done();
          });
      });
      test("get owner-s a specific contract by using short id and tag", async (done) => {
        const insertedData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 500,
        });

        const otherData = generateFull({
          owner_id: ownerUser.id,
          application_id: 600,
          network_id: 500,
        });

        await ContractModel.forge(otherData).save();

        const newContract = await ContractModel.forge(insertedData).save();

        await ContractVersionModel.forge(
          ContractVersionMock.generateFull({
            short_id: newContract.get("short_id"),
            tag: "tag1",
          })
        ).save();

        await ContractVersionModel.forge(
          ContractVersionMock.generateFull({
            short_id: newContract.get("short_id"),
            tag: "tag2",
          })
        ).save();

        await ContractVersionModel.forge(
          ContractVersionMock.generateFull({
            short_id: newContract.get("short_id"),
            tag: "latest",
          })
        ).save();

        request(server)
          .get(setTestURL(500, newContract.get("short_id")))
          .set("_uid", ownerUser.id)
          .query({ tag: "tag2" })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data).toBeTruthy();

            const { contract, version, versionList } = res.body.data;

            expect(contract).toContainAllKeys([
              "short_id",
              "application_id",
              "name",
              "description",
            ]);
            expect(version).toContainAllKeys([
              "abi",
              "name",
              "description",
              "contract_address",
              "tag",
            ]);
            expect(version.tag).toBe("tag2");
            expect(versionList).toHaveLength(3);
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            done();
          });
      });
      test("dont get a contract while there are none", async (done) => {
        request(server)
          .get(setTestURL(500, "TUBU"))
          .set("_uid", ownerUser.id)
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res).toBeTruthy();
            expect(res.body.error, "error").toBeTruthy();
            expect(res.body.message, "message").toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      test("dont get a contract without version", async (done) => {
        const insertedData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 500,
        });

        await ContractModel.forge(insertedData).save();

        request(server)
          .get(setTestURL(500, insertedData.short_id))
          .set("_uid", ownerUser.id)
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res).toBeTruthy();
            expect(res.body.error, "error").toBeTruthy();
            expect(res.body.message, "message").toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      test("dont get a contract even with tag without version", async (done) => {
        const insertedData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 500,
        });

        await new ContractModel(insertedData).save();

        request(server)
          .get(setTestURL(500, insertedData.short_id))
          .set("_uid", ownerUser.id)
          .query({ tag: "TUBUTAG" })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res).toBeTruthy();
            expect(res.body.error, "error").toBeTruthy();
            expect(res.body.message, "message").toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      test("dont get a deleted contract", async (done) => {
        const insertedData = generateFull({
          owner_id: ownerUser.id,
          application_id: insertedApp.id,
          network_id: 500,
          is_deleted: true,
        });
        await new ContractModel(insertedData).save();
        request(server)
          .get(setTestURL(500, insertedData.short_id))
          .set("_uid", ownerUser.id)
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res).toBeTruthy();
            expect(res.body.error, "error").toBeTruthy();
            expect(res.body.message, "message").toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
    });
    describe(`PUT: /network/:networkID/contract/:shortID`, () => {
      test("update users contract details (name, description etc.)", async (done) => {
        const insertedNetwork = await new NetworkModel(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();
        const insertedApplication = await new ApplicationModel(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = await new ContractModel(
          generateFull({
            owner_id: ownerUser.id,
            application_id: insertedApplication.id,
            network_id: insertedNetwork.id,
          })
        ).save();

        await new ContractVersionModel(
          ContractVersionMock.generateFull({
            short_id: insertedData.get("short_id"),
          })
        ).save();

        const newData = generate();

        request(server)
          .put(setTestURL(insertedData.id, insertedData.get("short_id")))
          .set("_uid", ownerUser.id)
          .send(newData)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(res.body.data.name).toBe(newData.name);
            expect(res.body.data.description).toBe(newData.description);
            done();
          });
      });
      test("do not update users contract details while there are no contract", async (done) => {
        const newData = generate();
        request(server)
          .put(setTestURL(1, "TUBUTEST"))
          .set("_uid", ownerUser.id)
          .send(newData)
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            expect(res.body.error, res.body.message).toBeTruthy();
            done();
          });
      });
      test("do not update a deleted contract", async (done) => {
        const insertedNetwork = await new NetworkModel(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();
        const insertedApplication = await new ApplicationModel(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedData = await new ContractModel(
          generateFull({
            owner_id: ownerUser.id,
            application_id: insertedApplication.id,
            network_id: insertedNetwork.id,
            is_deleted: true,
          })
        ).save();
        const newData = generate();
        request(server)
          .put(setTestURL(1, insertedData.get("short_id")))
          .set("_uid", ownerUser.id)
          .send(newData)
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            expect(res.body.error, res.body.message).toBeTruthy();
            done();
          });
      });
    });
    describe(`DELETE: /network/:networkID/contract/:shortID`, () => {
      let insertedApp;
      beforeEach((done) => {
        ApplicationModel.forge(
          ApplicationMock({
            owner_id: ownerUser.id,
            network_id: 500,
          })
        )
          .save()
          .then((savedApp) => {
            insertedApp = savedApp.toJSON();
            done();
          });
      });
      test("delete the contract with given shortID", async (done) => {
        const insertedContract = await new ContractModel(
          generateFull({
            owner_id: ownerUser.id,
            network_id: insertedApp.network_id,
            application_id: insertedApp.id,
          })
        ).save();
        request(server)
          .delete(
            setTestURL(
              insertedContract.get("network_id"),
              insertedContract.get("short_id")
            )
          )
          .set("_uid", ownerUser.id)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            expect(res.body.error, res.body.message).toBeUndefined();
            done();
          });
      });
    });
  });

  describe("Contract Version", () => {
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

    describe("POST /network/:networkID/contract/", () => {
      test("add new version with basic contract", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedContract = await ContractModel.forge(
          generateFull({
            owner_id: ownerUser.id,
            application_id: insertedApplication.id,
            network_id: insertedNetwork.id,
          })
        ).save();

        const insertedVersion = ContractVersionMock.generate({
          short_id: insertedContract.get("short_id"),
        });
        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("file1", `${__dirname}/contracts/BasicInheritance.sol`)
          .attach("file2", `${__dirname}/contracts/Inheritance.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedVersion)) {
          testRequest.field(key, insertedVersion[key]);
        }

        testRequest.field.short_id = insertedContract.get("short_id");

        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          done();
        });
      });
      test("deploy new version with constructor parameters to a contract ", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedContract = await ContractModel.forge(
          generateFull({
            owner_id: ownerUser.id,
            application_id: insertedApplication.id,
            network_id: insertedNetwork.id,
          })
        ).save();

        const insertedVersion = ContractVersionMock.generate({
          short_id: insertedContract.get("short_id"),
        });

        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("file1", `${__dirname}/contracts/UniversityEmployee.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(insertedVersion)) {
          testRequest.field(key, insertedVersion[key]);
        }

        testRequest.field.short_id = insertedContract.get("short_id");
        testRequest.field(
          "args",
          JSON.stringify([
            "Berk",
            32,
            [11, 6, 2020],
            3500,
            "Math",
            30,
            6700,
            "Algorithm",
            45,
            "Prof",
          ])
        );
        testRequest.expect(CODE.CREATED).end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          done();
        });
      });
      test("will not deploy a new version to the contract with tag that contract versions already has", async (done) => {
        const insertedNetwork = await NetworkModel.forge(
          NetworkMock({
            ws_port: 8888,
            ip_address: "localhost",
          })
        ).save();

        const insertedApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: insertedNetwork.id,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedContract = await ContractModel.forge(
          generateFull({
            owner_id: ownerUser.id,
            application_id: insertedApplication.id,
            network_id: insertedNetwork.id,
          })
        ).save();
        const insertedVersion = await new ContractVersionModel(
          ContractVersionMock.generateFull({
            short_id: insertedContract.get("short_id"),
          })
        ).save();

        const newVersion = ContractVersionMock.generate({
          short_id: insertedVersion.get("short_id"),
          tag: insertedVersion.get("tag"),
        });
        const testRequest = request(server)
          .post(setTestURL(insertedNetwork.id))
          .attach("file1", `${__dirname}/contracts/BasicInheritance.sol`)
          .attach("file2", `${__dirname}/contracts/Inheritance.sol`)
          .set("_uid", ownerUser.id);

        for (const key of Object.keys(newVersion)) {
          testRequest.field(key, newVersion[key]);
        }

        testRequest.field.short_id = insertedContract.get("short_id");

        testRequest.expect(CODE.ERR).end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
      });
    });

    // describe("POST /network/:networkID/contract/:shortID/version", () => {
    //   test("add new version with basic contract", async (done) => {
    //     const insertedNetwork = await NetworkModel.forge(
    //       NetworkMock({
    //         ws_port: 8888,
    //         ip_address: "localhost",
    //       })
    //     ).save();

    //     const insertedApplication = await ApplicationModel.forge(
    //       ApplicationMock({
    //         network_id: insertedNetwork.id,
    //         owner_id: 500,
    //       })
    //     ).save();

    //     const insertedContract = await ContractModel.forge(
    //       generateFull({
    //         owner_id: 500,
    //         application_id: insertedApplication.id,
    //         network_id: insertedNetwork.id,
    //       })
    //     ).save();

    //     const insertedVersion = ContractVersionMock.generate({
    //       short_id: insertedContract.get("short_id"),
    //     });
    //     console.log(insertedVersion);

    //     const testRequest = request(server)
    //       .post(
    //         `${setTestURL(
    //           insertedNetwork.id,
    //           insertedContract.get("short_id")
    //         )}/version`
    //       )
    //       .attach("file1", `${__dirname}/contracts/BasicInheritance.sol`)
    //       .attach("file2", `${__dirname}/contracts/Inheritance.sol`)
    //       .set("_uid", 500);

    //     for (const key of Object.keys(insertedVersion)) {
    //       testRequest.field(key, insertedVersion[key]);
    //     }

    //     testRequest.expect(CODE.CREATED).end((err, res) => {
    //       expect(res.body.error, res.body.message).toBeUndefined();
    //       expect(err).toBeNil();
    //       done();
    //     });
    //   });
    //   test("Deploy new version with constructor parameters to a contract ", async (done) => {
    //     const insertedNetwork = await NetworkModel.forge(
    //       NetworkMock({
    //         ws_port: 8888,
    //         ip_address: "localhost",
    //       })
    //     ).save();

    //     const insertedApplication = await ApplicationModel.forge(
    //       ApplicationMock({
    //         network_id: insertedNetwork.id,
    //         owner_id: 500,
    //       })
    //     ).save();

    //     const insertedContract = await ContractModel.forge(
    //       generateFull({
    //         owner_id: 500,
    //         application_id: insertedApplication.id,
    //         network_id: insertedNetwork.id,
    //       })
    //     ).save();

    //     const insertedVersion = ContractVersionMock.generate({
    //       short_id: insertedContract.get("short_id"),
    //     });
    //     console.log(insertedVersion);

    //     const testRequest = request(server)
    //       .post(
    //         `${setTestURL(
    //           insertedNetwork.id,
    //           insertedContract.get("short_id")
    //         )}/version`
    //       )
    //       .attach("file1", `${__dirname}/contracts/UniversityEmployee.sol`)
    //       .set("_uid", 500);

    //     for (const key of Object.keys(insertedVersion)) {
    //       testRequest.field(key, insertedVersion[key]);
    //     }
    //     testRequest.field(
    //       "args",
    //       JSON.stringify([
    //         "Berk",
    //         32,
    //         [11, 6, 2020],
    //         3500,
    //         "Math",
    //         30,
    //         6700,
    //         "Algorithm",
    //         45,
    //         "Prof",
    //       ])
    //     );
    //     testRequest.expect(CODE.CREATED).end((err, res) => {
    //       expect(res.body.error, res.body.message).toBeUndefined();
    //       expect(err).toBeNil();
    //       done();
    //     });
    //   });
    // });
  });
});

const AccountServicePath = `/${apiVersion}/network/contract/:shortID/account`;
const AccountServicePathWithId = `/${apiVersion}/network/contract/:shortID/account/:id`;

function setTestAccountURL(shortID, id = "") {
  return AccountServicePathWithId.replace(":shortID", shortID).replace(
    ":id",
    id
  );
}

describe("Contract Account Routes", () => {
  let ownerUser;
  beforeEach(async (done) => {
    ownerUser = await new UserModel(UserMock()).save();
    done();
  });
  describe(`POST : /network/contract/:shortID/account`, () => {
    test("create a new contract account with required parameters on body with correct contract owner id", async (done) => {
      const ownedApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
        })
      ).save();

      await new ContractModel(
        generateFull({
          owner_id: ownerUser.id,
          short_id: "TUBUTEST",
          application_id: ownedApp.id,
          is_deleted: false,
        })
      ).save();

      const sampleAccount = ContractAccountMock({
        short_id: "TUBUTEST",
      });

      request(server)
        .post(setTestAccountURL("TUBUTEST"))
        .send(sampleAccount)
        .set("_uid", ownerUser.id)
        .expect(CODE.CREATED)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res).toBeTruthy();

          expect(res.body.data).toHaveProperty("name", sampleAccount.name);
          expect(res.body.data).toHaveProperty("address");
          done();
        });
    });
    test("do not create a new contract account for a contract that is deleted already", async (done) => {
      const ownedApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
        })
      ).save();

      await new ContractModel(
        generateFull({
          owner_id: ownerUser.id,
          short_id: "TUBUTEST",
          application_id: ownedApp.id,
          is_deleted: true,
        })
      ).save();
      const sampleAccount = ContractAccountMock();
      request(server)
        .post(setTestAccountURL("TUBUTEST"))
        .send(sampleAccount)
        .set("_uid", ownerUser.id)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
    });
  });
  describe(`GET :  /network/contract/:shortID/account`, () => {
    test("get owner-s all contract list by using default parameters", async (done) => {
      const insertingPromises = [];
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(
            ContractAccountMock({
              short_id: "TUBUTEST",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(
            ContractAccountMock({
              short_id: "TUBUTEST2",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(ContractAccountMock({})).save()
        );
      }

      const ownedApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
        })
      ).save();

      await ContractModel.forge(
        generateFull({
          owner_id: ownerUser.id,
          short_id: "TUBUTEST",
          application_id: ownedApp.id,
        })
      ).save();

      await ContractModel.forge(
        generateFull({
          short_id: "TUBUTEST2",
          owner_id: ownerUser.id,
        })
      ).save();

      await Promise.all(insertingPromises);

      request(server)
        .get(setTestAccountURL("TUBUTEST"))
        .set("_uid", ownerUser.id)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(res.body.data).toHaveLength(5);
          expect(res.body.pagination).toContainAllValues([1, 1, 20, 5]);
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
    });
    test("do not get the accounts of a deleted contract", async (done) => {
      const ownedApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
        })
      ).save();

      await new ContractModel(
        generateFull({
          owner_id: ownerUser.id,
          short_id: "TUBUTEST",
          application_id: ownedApp.id,
          is_deleted: true,
        })
      ).save();
      await new ContractAccountModel(
        ContractAccountMock({
          short_id: "TUBUTEST",
        })
      ).save();
      request(server)
        .get(setTestAccountURL("TUBUTEST"))
        .set("_uid", ownerUser.id)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
    });
  });
  describe(`GET : /network/contract/:shortID/account/:id`, () => {
    test("get contract account detail with id", async (done) => {
      await ContractModel.forge(
        generateFull({
          short_id: "TUBUTEST2",
          owner_id: ownerUser.id,
        })
      ).save();
      const ownedApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
        })
      ).save();

      const insertedContract = await ContractModel.forge(
        generateFull({
          owner_id: ownerUser.id,
          short_id: "TUBUTEST",
          application_id: ownedApp.id,
        })
      ).save();
      const insertingPromises = [];
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(
            ContractAccountMock({
              short_id: "TUBUTEST",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(
            ContractAccountMock({
              short_id: "TUBUTEST2",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(ContractAccountMock()).save()
        );
      }

      await Promise.all(insertingPromises);

      request(server)
        .get(setTestAccountURL("TUBUTEST", insertedContract.id))
        .set("_uid", ownerUser.id)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          expect(res.body.data).toHaveProperty("address");
          expect(res.body.data).toHaveProperty("private_key");
          done();
        });
    });
    test("do not get account detail of a deleted contract ", async (done) => {
      await ContractModel.forge(
        generateFull({
          short_id: "TUBUTEST2",
          owner_id: ownerUser.id,
        })
      ).save();
      const ownedApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
        })
      ).save();

      const insertedContract = await ContractModel.forge(
        generateFull({
          owner_id: ownerUser.id,
          short_id: "TUBUTEST",
          application_id: ownedApp.id,
          is_deleted: true,
        })
      ).save();
      const insertingPromises = [];
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(
            ContractAccountMock({
              short_id: "TUBUTEST",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(
            ContractAccountMock({
              short_id: "TUBUTEST2",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertingPromises.push(
          ContractAccountModel.forge(ContractAccountMock()).save()
        );
      }

      await Promise.all(insertingPromises);

      request(server)
        .get(setTestAccountURL("TUBUTEST", insertedContract.id))
        .set("_uid", ownerUser.id)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
    });
  });
});
