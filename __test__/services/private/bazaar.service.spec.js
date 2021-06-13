import request from "supertest";
import ganache from "ganache-core";

// Mocks
import { generate, generateFull } from "../../__mocks__/contract";
import { generateBazaar, generateFullBazaar } from "../../__mocks__/bazaar";
import ApplicationMock from "../../__mocks__/application";
import NetworkMock from "../../__mocks__/network";
import UserMock from "../../__mocks__/user";

// Models
import ContractModel from "../../../server/models/contract";
import ApplicationModel from "../../../server/models/application";
import NetworkModel from "../../../server/models/network";
import BazaarModel from "../../../server/models/bazaar";
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

const ServicePath = `/${apiVersion}/market`;
const ServicePathWithId = `/${apiVersion}/market/:id`;

function setTestURL(id = "") {
  return ServicePathWithId.replace(":id", id);
}

let ganacheServer;

describe("Bazaar Routes", () => {
  describe(`POST: /market`, () => {
    describe("Deploy contract into bazaar", () => {
      let insertedBazaarInstance = {};

      beforeEach(async (done) => {
        insertedBazaarInstance = generateFullBazaar({
          owner_id: 500,
          abi: `[{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x1003e2d2"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x4cc82215"},{"inputs":[],"name":"total","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x2ddbd13a"}]`,
          bytecode: `0x608060405234801561001057600080fd5b50610113806100206000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80631003e2d21460415780632ddbd13a14606c5780634cc82215146088575b600080fd5b606a60048036036020811015605557600080fd5b810190808035906020019092919050505060b3565b005b607260c5565b6040518082815260200191505060405180910390f35b60b160048036036020811015609c57600080fd5b810190808035906020019092919050505060cb565b005b80600080828254019250508190555050565b60005481565b8060008082825403925050819055505056fea26469706673582212209365a02aee877eef66b8cc8079314ee909da97f4055d4c8dee5500e75b8ab46264736f6c634300060c0033`,
        });
        done();
      });

      test("deploy a new contract to the marketplace and to an application in a network", async (done) => {
        request(server)
          .post(ServicePath)
          .send(insertedBazaarInstance)
          .set("_uid", 500)
          .expect(CODE.CREATED)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            done();
          });
      });
    });
  });
  describe(`GET: /market`, () => {
    beforeEach(async (done) => {
      const publicData = generateBazaar({
        abi: `[{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x1003e2d2"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x4cc82215"},{"inputs":[],"name":"total","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x2ddbd13a"}]`,
        bytecode: `0x608060405234801561001057600080fd5b50610113806100206000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80631003e2d21460415780632ddbd13a14606c5780634cc82215146088575b600080fd5b606a60048036036020811015605557600080fd5b810190808035906020019092919050505060b3565b005b607260c5565b6040518082815260200191505060405180910390f35b60b160048036036020811015609c57600080fd5b810190808035906020019092919050505060cb565b005b80600080828254019250508190555050565b60005481565b8060008082825403925050819055505056fea26469706673582212209365a02aee877eef66b8cc8079314ee909da97f4055d4c8dee5500e75b8ab46264736f6c634300060c0033`,
        is_public: true,
      });
      const privateUserData = generateBazaar({
        owner_id: 500,
        abi: `[{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x1003e2d2"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x4cc82215"},{"inputs":[],"name":"total","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x2ddbd13a"}]`,
        bytecode: `0x608060405234801561001057600080fd5b50610113806100206000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80631003e2d21460415780632ddbd13a14606c5780634cc82215146088575b600080fd5b606a60048036036020811015605557600080fd5b810190808035906020019092919050505060b3565b005b607260c5565b6040518082815260200191505060405180910390f35b60b160048036036020811015609c57600080fd5b810190808035906020019092919050505060cb565b005b80600080828254019250508190555050565b60005481565b8060008082825403925050819055505056fea26469706673582212209365a02aee877eef66b8cc8079314ee909da97f4055d4c8dee5500e75b8ab46264736f6c634300060c0033`,
        is_public: false,
      });
      const privateOtherData = generateBazaar({
        owner_id: 501,
        abi: `[{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x1003e2d2"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x4cc82215"},{"inputs":[],"name":"total","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x2ddbd13a"}]`,
        bytecode: `0x608060405234801561001057600080fd5b50610113806100206000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80631003e2d21460415780632ddbd13a14606c5780634cc82215146088575b600080fd5b606a60048036036020811015605557600080fd5b810190808035906020019092919050505060b3565b005b607260c5565b6040518082815260200191505060405180910390f35b60b160048036036020811015609c57600080fd5b810190808035906020019092919050505060cb565b005b80600080828254019250508190555050565b60005481565b8060008082825403925050819055505056fea26469706673582212209365a02aee877eef66b8cc8079314ee909da97f4055d4c8dee5500e75b8ab46264736f6c634300060c0033`,
        is_public: false,
      });

      const insertingPromises = [];

      for (let i = 0; i < 10; i += 1) {
        insertingPromises.push(BazaarModel.forge(publicData).save());
      }

      for (let i = 0; i < 2; i += 1) {
        insertingPromises.push(BazaarModel.forge(privateUserData).save());
      }

      for (let i = 0; i < 3; i += 1) {
        insertingPromises.push(BazaarModel.forge(privateOtherData).save());
      }

      await Promise.all(insertingPromises);
      done();
    });

    test("get the public and user-s contracts in the marketplace", async (done) => {
      request(server)
        .get(ServicePath)
        .set("_uid", 500)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(15);
          done();
        });
    });
  });
  describe(`GET: /market:id`, () => {
    let insertedBazaarContract = {};
    beforeEach(async (done) => {
      const insertedData = generateBazaar({
        owner_id: 500,
        abi: `[{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x1003e2d2"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x4cc82215"},{"inputs":[],"name":"total","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x2ddbd13a"}]`,
        bytecode: `0x608060405234801561001057600080fd5b50610113806100206000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80631003e2d21460415780632ddbd13a14606c5780634cc82215146088575b600080fd5b606a60048036036020811015605557600080fd5b810190808035906020019092919050505060b3565b005b607260c5565b6040518082815260200191505060405180910390f35b60b160048036036020811015609c57600080fd5b810190808035906020019092919050505060cb565b005b80600080828254019250508190555050565b60005481565b8060008082825403925050819055505056fea26469706673582212209365a02aee877eef66b8cc8079314ee909da97f4055d4c8dee5500e75b8ab46264736f6c634300060c0033`,
      });
      const contract = await BazaarModel.forge(insertedData).save();
      insertedBazaarContract = contract.toJSON();
      done();
    });
    test("get the contract with given id from the marketplace", async (done) => {
      request(server)
        .get(setTestURL(insertedBazaarContract.id))
        .set("_uid", 500)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(res.body.message).toBeTruthy();
          expect(res.body.data.id).toBe(insertedBazaarContract.id);
          expect(res.body.data.name).toBe(insertedBazaarContract.name);
          done();
        });
    });
  });
  describe(`POST: /market:id`, () => {
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
    test("deploy from market without any arguments for constructor", async (done) => {
      // Bazaar Data
      const insertedData = generateBazaar({
        owner_id: 500,
        abi: `[{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x1003e2d2"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"remove","outputs":[],"stateMutability":"nonpayable","type":"function","signature":"0x4cc82215"},{"inputs":[],"name":"total","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true,"signature":"0x2ddbd13a"}]`,
        bytecode: `0x608060405234801561001057600080fd5b50610113806100206000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80631003e2d21460415780632ddbd13a14606c5780634cc82215146088575b600080fd5b606a60048036036020811015605557600080fd5b810190808035906020019092919050505060b3565b005b607260c5565b6040518082815260200191505060405180910390f35b60b160048036036020811015609c57600080fd5b810190808035906020019092919050505060cb565b005b80600080828254019250508190555050565b60005481565b8060008082825403925050819055505056fea26469706673582212209365a02aee877eef66b8cc8079314ee909da97f4055d4c8dee5500e75b8ab46264736f6c634300060c0033`,
      });

      const insertedBazaarContract = await BazaarModel.forge(
        insertedData
      ).save();

      // Ganache Network Information
      const insertedNetwork = await NetworkModel.forge(
        NetworkMock({
          ip_address: "localhost",
          ws_port: "8888",
        })
      ).save();

      const ownerUser = await new UserModel(UserMock()).save();
      // Application Information
      const insertedApp = await ApplicationModel.forge(
        ApplicationMock({
          owner_id: ownerUser.id,
          network_id: insertedNetwork.id,
        })
      ).save();

      request(server)
        .post(setTestURL(insertedBazaarContract.id))
        .set("_uid", 500)
        .send({
          name: "Test",
          description: "Test desc",
          network_id: insertedNetwork.id,
          application_id: insertedApp.id,
        })
        .expect(CODE.CREATED)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          done();
        });
    });
  });
});
