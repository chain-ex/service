import request from "supertest";

// Mocks
import generate from "../../__mocks__/transaction";
import NetworkMock from "../../__mocks__/network";
import ApplicationMock from "../../__mocks__/application";
import { generateFull } from "../../__mocks__/contract";
import UserMock from "../../__mocks__/user";
// Models
import TransactionModel from "../../../server/models/transaction";
import NetworkModel from "../../../server/models/network";
import ContractModel from "../../../server/models/contract";
import ApplicationModel from "../../../server/models/application";
import UserModel from "../../../server/models/user";

import config from "../../../config";
import server from "../../../server";

const { CODE, apiVersion } = config;

jest.mock("../../../server/middleware/auth_middleware", () =>
  jest.fn((req, res, next) => {
    req.userData = {
      uid: req.headers._uid,
    };
    next();
  })
);
const ServicePath = `/${apiVersion}/transactions`;

describe("Transaction Routes", () => {
  describe("GET: /transactions", () => {
    let firstShortID;
    let secondShortID;
    let thirdShortID;
    let firstNetwork;
    let secondNetwork;
    let applicationID;
    let ownerUser;
    let anotherUser;
    beforeEach(async (done) => {
      const insertedNetwork = await new NetworkModel(NetworkMock()).save();
      ownerUser = await new UserModel(UserMock()).save();
      anotherUser = await new UserModel(UserMock()).save();
      firstNetwork = insertedNetwork.id;
      const firstNetworkOwnerApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUser.id,
          network_id: firstNetwork,
        })
      ).save();

      const anotherInsertedNetwork = await new NetworkModel(
        NetworkMock()
      ).save();
      secondNetwork = anotherInsertedNetwork.id;

      const secondNetworkOtherApp = await new ApplicationModel(
        ApplicationMock({
          owner_id: anotherUser.id,
          network_id: secondNetwork,
        })
      ).save();
      applicationID = secondNetworkOtherApp.id;
      const insertedContract = await new ContractModel(
        generateFull({
          application_id: firstNetworkOwnerApp.id,
          network_id: firstNetwork,
        })
      ).save();
      // Network 1, Owner App
      firstShortID = insertedContract.get("short_id");

      const anotherInsertedContract = await new ContractModel(
        generateFull({
          network_id: firstNetwork,
          application_id: firstNetworkOwnerApp.id,
        })
      ).save();
      // Network 1 Owner App
      secondShortID = anotherInsertedContract.get("short_id");
      const anotherInsertedNetworkContract = await new ContractModel(
        generateFull({
          network_id: secondNetwork,
          application_id: secondNetworkOtherApp.id,
        })
      ).save();
      // Network 2, Other App
      thirdShortID = anotherInsertedNetworkContract.get("short_id");

      await Promise.all([
        new TransactionModel(
          generate({
            short_id: firstShortID,
          })
        ).save(),
        new TransactionModel(
          generate({
            short_id: firstShortID,
          })
        ).save(),
        new TransactionModel(
          generate({
            short_id: secondShortID,
          })
        ).save(),
        new TransactionModel(
          generate({
            short_id: firstShortID,
          })
        ).save(),
        new TransactionModel(
          generate({
            short_id: secondShortID,
          })
        ).save(),
        new TransactionModel(
          generate({
            short_id: thirdShortID,
          })
        ).save(),
        new TransactionModel(
          generate({
            short_id: thirdShortID,
          })
        ).save(),
      ]).then();

      done();
    });

    test("should return the networks transactions", (done) => {
      request(server)
        .get(ServicePath)
        .expect(CODE.OK)
        .set("_uid", ownerUser.id)
        .query({ networkID: firstNetwork })
        .end((err, res) => {
          const returnData = res.body;
          expect(returnData.data).toHaveLength(5);
          expect(returnData.pagination).toContainAllValues([1, 1, 20, 5]);
          expect(err).toBeNil();
          done();
        });
    });

    test("should return the application-s transactions", (done) => {
      request(server)
        .get(ServicePath)
        .expect(CODE.OK)
        .set("_uid", anotherUser.id)
        .query({ appID: applicationID })
        .end((err, res) => {
          const returnData = res.body;
          expect(returnData.data).toHaveLength(2);
          expect(returnData.pagination).toContainAllValues([1, 1, 20, 2]);
          expect(err).toBeNil();
          done();
        });
    });

    test("should return the contract-s transactions", (done) => {
      request(server)
        .get(ServicePath)
        .expect(CODE.OK)
        .set("_uid", ownerUser.id)
        .query({ shortID: firstShortID })
        .end((err, res) => {
          const returnData = res.body;
          expect(returnData.data).toHaveLength(3);
          expect(returnData.pagination).toContainAllValues([1, 1, 20, 3]);
          expect(err).toBeNil();
          done();
        });
    });
  });
});
