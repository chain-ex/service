import request from "supertest";

import config from "../../../config";
import server from "../../../server";

// Models
import ApplicationModel from "../../../server/models/application";
import ContractModel from "../../../server/models/contract";
import UserModel from "../../../server/models/user";
// Mocks
import ApplicationMock from "../../__mocks__/application";
import { generate, generateFull } from "../../__mocks__/contract";
import UserMock from "../../__mocks__/user";

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

const ServicePath = `/${apiVersion}/network/:networkID/apps`;
const ServicePathWithId = `/${apiVersion}/network/:networkID/apps/:id`;

function setTestURL(networkID, id = "") {
  return ServicePathWithId.replace(":networkID", networkID).replace(":id", id);
}

describe("Application Routes", () => {
  let ownerUser;
  beforeEach(async (done) => {
    ownerUser = await new UserModel(UserMock()).save();
    done();
  });
  describe("Main Services", () => {
    describe("POST : /network/:networkID/apps/", () => {
      test("create a new application with required parameters on body with owner id", async (done) => {
        const insertedData = ApplicationMock({
          network_id: 500,
          owner_id: ownerUser.id,
        });

        request(server)
          .post(setTestURL(500))
          .set("_uid", ownerUser.id)
          .send(insertedData)
          .expect(CODE.CREATED)
          .end((err, res) => {
            expect(res).toBeTruthy();
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            const returnData = res.body.data;
            expect(returnData).toHaveProperty("id");
            expect(returnData).toHaveProperty("name", insertedData.name);
            expect(returnData).toHaveProperty(
              "description",
              insertedData.description
            );
            expect(returnData).toHaveProperty("created_at");
            done();
          });
      });
      test("create a new application with required parameters by using path params", async (done) => {
        const insertedData = ApplicationMock({ owner_id: ownerUser.id });

        request(server)
          .post(setTestURL(500))
          .set("_uid", ownerUser.id)
          .send(insertedData)
          .expect(CODE.CREATED)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();
            const returnData = res.body.data;
            expect(returnData).toHaveProperty("id");
            expect(returnData).toHaveProperty("name", insertedData.name);
            expect(returnData).toHaveProperty(
              "description",
              insertedData.description
            );
            expect(returnData).toHaveProperty("created_at");
            done();
          });
      });
    });

    describe("GET : /network/:networkID/apps/", () => {
      test("get the list of users  selected network applications with selectable fields", async (done) => {
        const notOwner = await new UserModel(UserMock()).save();
        const insertPromises = [];
        for (let i = 0; i < 5; i += 1) {
          const newApp = ApplicationMock({ owner_id: notOwner.id });
          insertPromises.push(ApplicationModel.forge(newApp).save());
        }
        for (let i = 0; i < 3; i += 1) {
          const newApp = ApplicationMock();
          newApp.owner_id = ownerUser.id;
          newApp.network_id = 600000;
          insertPromises.push(ApplicationModel.forge(newApp).save());
        }

        for (let i = 0; i < 6; i += 1) {
          const newApp = ApplicationMock({ owner_id: notOwner.id });
          newApp.network_id = 600000;
          insertPromises.push(ApplicationModel.forge(newApp).save());
        }
        await Promise.all(insertPromises).then();

        request(server)
          .get(ServicePath.replace(":networkID", "600000"))
          .set("Content-Type", "application/json")
          .set("_uid", ownerUser.id)
          .set("Accept", "application/json")
          .expect(CODE.OK)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();

            function checkFields(app) {
              expect(app).toHaveProperty("id");
              expect(app).toHaveProperty("name");
              expect(app).toHaveProperty("description");
              expect(app).toHaveProperty("sharedWith");
              expect(app).not.toHaveProperty("created_at");
              return true;
            }
            expect(res.body.data).toSatisfyAll(checkFields);
            expect(res.body.pagination).toStrictEqual({
              page: 1,
              pageCount: 1,
              pageSize: 20,
              rowCount: 3,
            });
            expect(res.body.data).toHaveLength(3);
            done();
          });
      });
      test("do not get the deleted applications", async (done) => {
        const insertPromises = [];

        for (let i = 0; i < 3; i += 1) {
          const newApp = ApplicationMock();
          newApp.owner_id = ownerUser.id;
          newApp.network_id = 600000;
          insertPromises.push(ApplicationModel.forge(newApp).save());
        }
        for (let i = 0; i < 3; i += 1) {
          const newApp = ApplicationMock();
          newApp.owner_id = ownerUser.id;
          newApp.network_id = 600000;
          newApp.is_deleted = true;
          insertPromises.push(ApplicationModel.forge(newApp).save());
        }
        await Promise.all(insertPromises).then();
        request(server)
          .get(ServicePath.replace(":networkID", "600000"))
          .set("Content-Type", "application/json")
          .set("_uid", ownerUser.id)
          .set("Accept", "application/json")
          .expect(CODE.OK)
          .end((err, res) => {
            expect(err).toBeNil();
            expect(res).toBeTruthy();

            function checkFields(app) {
              expect(app).toHaveProperty("id");
              expect(app).toHaveProperty("name");
              expect(app).toHaveProperty("description");
              expect(app).toHaveProperty("sharedWith");
              expect(app).not.toHaveProperty("created_at");
              return true;
            }
            expect(res.body.data).toSatisfyAll(checkFields);
            expect(res.body.pagination).toStrictEqual({
              page: 1,
              pageCount: 1,
              pageSize: 20,
              rowCount: 3,
            });
            expect(res.body.data).toHaveLength(3);
            done();
          });
      });
    });

    describe("GET : /network/:networkID/apps/:id", () => {
      test("get the application with the given id along default parameters", async (done) => {
        const insertedData = await ApplicationModel.forge(
          ApplicationMock({
            network_id: 500,
            owner_id: ownerUser.id,
          })
        ).save();

        const insertedApp = insertedData.toJSON();

        request(server)
          .get(setTestURL(500, insertedApp.id))
          .set("_uid", ownerUser.id)
          .set("Content-Type", "application/json")
          .set("Accept", "application/json")
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeFalsy();
            expect(err).toBeNil();
            expect(res).toBeTruthy();

            const returnData = res.body.data;

            expect(returnData).toHaveProperty("id");
            expect(returnData).toHaveProperty("updated_at");
            expect(returnData).toHaveProperty("created_at");
            expect(returnData).toHaveProperty("owner");
            expect(returnData).toHaveProperty("name", insertedApp.name);
            expect(returnData).toHaveProperty(
              "description",
              insertedApp.description
            );
            done();
          });
      });
    });

    describe("DELETE : /network/:networkID/apps/:id", () => {
      test("delete the own application with the given id", async (done) => {
        const insertedData = await ApplicationModel.forge(
          ApplicationMock({
            owner_id: ownerUser.id,
            network_id: 500,
          })
        ).save();

        request(server)
          .delete(setTestURL(500, insertedData.id))
          .set("_uid", ownerUser.id)
          .expect(CODE.OK)
          .end((err) => {
            expect(err).toBeNil();
            done();
          });
      });
      test("can not delete a new application with another owner id", async (done) => {
        const newApplication = ApplicationMock({
          owner_id: ownerUser.id,
          network_id: 500,
        });
        const insertedData = await ApplicationModel.forge(
          newApplication
        ).save();

        request(server)
          .delete(setTestURL(500, insertedData.id))
          .set("_uid", 100)
          .expect(CODE.ERR)
          .end((err) => {
            expect(err).toBeNil();
            done();
          });
      });
      test("deletes the contracts in the app", async (done) => {
        const insertedData = await new ApplicationModel(
          ApplicationMock({
            owner_id: ownerUser.id,
            network_id: 500,
          })
        ).save();
        const insertedContract = await new ContractModel(
          generateFull({
            application_id: insertedData.id,
          })
        ).save();
        request(server)
          .delete(setTestURL(500, insertedData.id))
          .set("_uid", ownerUser.id)
          .expect(CODE.OK)
          .end(async (err) => {
            let deletedContract = await ContractModel.where({
              short_id: insertedContract.get("short_id"),
            }).fetch();
            deletedContract = deletedContract.toJSON();
            expect(deletedContract).toMatchObject({ is_deleted: true });
            expect(err).toBeNil();
            done();
          });
      });
    });

    describe("PUT : /network/:networkID/apps/:id", () => {
      test("update users own application with id by the given parameters", async (done) => {
        const newApplication = await ApplicationModel.forge(
          ApplicationMock({
            network_id: 500,
            owner_id: ownerUser.id,
          })
        ).save();

        const updateData = ApplicationMock({
          owner_id: ownerUser.id,
          network_id: 500,
        });

        request(server)
          .put(setTestURL(500, newApplication.id))
          .set("_uid", ownerUser.id)
          .send(updateData)
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeNil();
            expect(res).toBeTruthy();
            expect(res.body.data).toContainKeys(Object.keys(updateData));
            expect(res.body.data).toContainValues(Object.values(updateData));
            done();
          });
      });
      test("can not update an application with another owner id", async (done) => {
        const insertedData = await ApplicationModel.forge(
          ApplicationMock({
            owner_id: ownerUser.id,
            network_id: 500,
          })
        ).save();

        const updateData = ApplicationMock({ owner_id: ownerUser.id });

        request(server)
          .put(setTestURL(500, insertedData.id))
          .set("_uid", 1001)
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
});
