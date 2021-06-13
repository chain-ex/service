import request from "supertest";
import ganache from "ganache-core";
import NetworkMock from "../../__mocks__/network";
import NetworkModel from "../../../server/models/network";
import config from "../../../config";
import server from "../../../server";
import Network from "../../../server/models/network";

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

const ServicePath = `/${apiVersion}/network`;
const ServicePathWithId = `/${apiVersion}/network/:networkID`;

describe("Network Routes", () => {
  describe(`GET : /network`, () => {
    test("get the list of user-s networks and public networks with selectable fields", async (done) => {
      const insertPromises = [];

      for (let i = 0; i < 3; i += 1) {
        const newNetwork = NetworkMock();
        newNetwork.is_public = true;
        insertPromises.push(NetworkModel.forge(newNetwork).save());
      }
      for (let i = 0; i < 5; i += 1) {
        const newNetwork = NetworkMock();
        newNetwork.owner_id = 500000;
        insertPromises.push(NetworkModel.forge(newNetwork).save());
      }
      for (let i = 0; i < 10; i += 1) {
        insertPromises.push(NetworkModel.forge(NetworkMock()).save());
      }

      await Promise.all(insertPromises).then();

      request(server)
        .get(ServicePath)
        .set("Content-Type", "application/json")
        .set("_uid", 500000)
        .set("Accept", "application/json")
        .expect(CODE.OK)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          expect(res.body.pagination).toContainAllValues([8, 1, 1, 20]);
          expect(res.body.data).toHaveLength(8);
          done();
        });
    });
  });
  describe(`GET : /network/:id`, () => {
    let ganacheServer;
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
    test("get the network with the given id along default parameters", async (done) => {
      const insertedData = await NetworkModel.forge(
        NetworkMock({
          owner_id: 1000,
          ws_port: 8888,
          ip_address: "localhost",
        })
      ).save();

      request(server)
        .get(`${ServicePath}/${insertedData.id}`)
        .set("_uid", 1000)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          expect(res.body.data.id).toBe(insertedData.id);
          expect(res.body.data.chain).toHaveProperty("blockCount", 0);
          expect(res.body.data.chain).toHaveProperty("chainId");
          expect(res.body.data.chain).toHaveProperty("nodeInfo");
          done();
        });
    });
    test("do not get the network that does not exist", async (done) => {
      request(server)
        .get(`${ServicePath}/18912398`)
        .set("_uid", 1000)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("get the network with id but no connection into network", async (done) => {
      const insertedData = await NetworkModel.forge(
        NetworkMock({
          owner_id: 1000,
          ws_port: 1000,
          ip_address: "localhost",
        })
      ).save();

      request(server)
        .get(`${ServicePath}/${insertedData.id}`)
        .set("_uid", 1000)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          expect(res.body.data.id).toBe(insertedData.id);
          expect(res.body.data.chainError).toBeTruthy();
          expect(res.body.data.chain).toBeUndefined();
          done();
        });
    });
  });

  describe(`PUT : /network/:id`, () => {
    test("update user-s own network with id by the given parameters", async (done) => {
      const oldNetwork = NetworkMock();
      const insertedData = await NetworkModel.forge(oldNetwork).save();
      const updateData = NetworkMock();
      updateData.owner_id = oldNetwork.owner_id;
      request(server)
        .put(`${ServicePath}/${insertedData.id}`)
        .set("_uid", oldNetwork.owner_id)
        .send(updateData)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors, res.body.message).toBeNil();
          expect(res).toBeTruthy();
          const returnData = res.body.data;
          expect(returnData.ip_address).not.toBe(updateData.ip_address);
          expect(returnData.ws_port).not.toBe(updateData.ws_port);
          expect(res.body.data).toContainKeys(Object.keys(updateData));

          delete updateData.owner_id;
          delete updateData.ip_address;
          delete updateData.ws_port;
          expect(res.body.data).toContainValues(Object.values(updateData));
          done();
        });
    });
    // run after crud routes uid check fullified
    test("can not update a network that does not exist", async (done) => {
      const updateData = NetworkMock();
      request(server)
        .put(`${ServicePath}/1244351234`)
        .set("_uid", 500)
        .send(updateData)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          done();
        });
    });
  });
});
