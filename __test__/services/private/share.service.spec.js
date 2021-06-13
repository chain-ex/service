import request from "supertest";

import config from "../../../config";
import server from "../../../server";

// Models
import ApplicationModel from "../../../server/models/application";
import ApplicationUserModel from "../../../server/models/applicationUser";
import UserModel from "../../../server/models/user";

// Mocks
import ApplicationMock from "../../__mocks__/application";
import UserMock from "../../__mocks__/user";
import ApplicationUser from "../../../server/models/applicationUser";

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

const ServiceSharePath = `/${apiVersion}/sharing`;

describe("Share Application", () => {
  describe("GET: /sharing", () => {
    let currentUser = {};
    beforeEach(async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();
      const anotherUser = await UserModel.forge(UserMock()).save();
      currentUser = sampleUser.toJSON();
      const insertedApp1 = await new ApplicationModel(
        ApplicationMock({
          owner_id: anotherUser.id,
          network_id: 4000,
        })
      ).save();

      const insertedApp2 = await new ApplicationModel(
        ApplicationMock({
          owner_id: anotherUser.id,
          network_id: 4000,
        })
      ).save();

      const insertedApp3 = await new ApplicationModel(
        ApplicationMock({
          owner_id: anotherUser.id,
          network_id: 3000,
        })
      ).save();

      const insertedApp4 = await new ApplicationModel(
        ApplicationMock({
          owner_id: sampleUser.id,
          network_id: 4000,
        })
      ).save();
      await new ApplicationUserModel({
        application_id: insertedApp1.id,
        user_id: sampleUser.id,
      }).save();
      await new ApplicationUserModel({
        application_id: insertedApp2.id,
        user_id: sampleUser.id,
      }).save();
      await new ApplicationUserModel({
        application_id: insertedApp3.id,
        user_id: sampleUser.id,
      }).save();
      await new ApplicationUserModel({
        application_id: insertedApp4.id,
        user_id: anotherUser.id,
      }).save();

      done();
    });
    test("List current users shared applications", async (done) => {
      request(server)
        .get(ServiceSharePath)
        .set("_uid", currentUser.id)
        .query({
          networkID: 4000,
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
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
            rowCount: 2,
          });
          expect(err).toBeNil();
          done();
        });
    });
    test("Do not list current users shared applications without networkID", async (done) => {
      request(server)
        .get(ServiceSharePath)
        .set("_uid", currentUser.id)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });
  });

  describe("POST: /sharing", () => {
    test("Successfully share a user with another user by using email", async (done) => {
      const ownerUser = await UserModel.forge(UserMock()).save();
      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: ownerUser.id,
        })
      ).save();

      const newUser = await UserModel.forge(UserMock()).save();

      request(server)
        .post(ServiceSharePath)
        .set("_uid", ownerUser.id)
        .send({
          application_id: insertedApplication.id,
          email: newUser.get("email"),
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully share a user with owner user by using email", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();

      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: sampleUser.id,
        })
      ).save();

      request(server)
        .post(ServiceSharePath)
        .set("_uid", 500)
        .send({
          application_id: insertedApplication.id,
          email: sampleUser.get("email"),
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully share already shared application", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();
      const anotherUser = await UserModel.forge(UserMock()).save();

      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: sampleUser.id,
        })
      ).save();

      await ApplicationUserModel.forge({
        user_id: anotherUser.id,
        application_id: insertedApplication.id,
      }).save();

      request(server)
        .post(ServiceSharePath)
        .set("_uid", 500)
        .send({
          application_id: insertedApplication.id,
          email: anotherUser.get("email"),
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully share does not exists application", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();

      request(server)
        .post(ServiceSharePath)
        .set("_uid", 500)
        .send({ email: sampleUser.get("email") })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully share an application with current user", async (done) => {
      const ownerUser = await UserModel.forge(UserMock()).save();
      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: ownerUser.id,
        })
      ).save();

      const newUser = await UserModel.forge(
        UserMock({ id: ownerUser.id })
      ).save();

      request(server)
        .post(ServiceSharePath)
        .set("_uid", ownerUser.id)
        .send({
          application_id: insertedApplication.id,
          email: newUser.get("email"),
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(res.body.message).toBe(
            "Sharing with current user is not allowed"
          );
          expect(err).toBeNil();
          done();
        });
    });
  });

  describe("DELETE: /sharing", () => {
    test("Successfully revoke shared user from an app by using email", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();
      const anotherUser = await UserModel.forge(UserMock()).save();

      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: sampleUser.id,
        })
      ).save();

      await ApplicationUserModel.forge({
        user_id: anotherUser.id,
        application_id: insertedApplication.id,
      }).save();

      request(server)
        .delete(ServiceSharePath)
        .set("_uid", sampleUser.id)
        .send({
          application_id: insertedApplication.id,
          email: anotherUser.get("email"),
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(res).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully revoke shared application with invalid email", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();

      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: sampleUser.id,
        })
      ).save();

      request(server)
        .delete(ServiceSharePath)
        .set("_uid", 500)
        .send({
          application_id: insertedApplication.id,
          email: UserMock().email,
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully revoke shared app with already revoked", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();
      const insertedApplication = await ApplicationModel.forge(
        ApplicationMock({
          network_id: 4000,
          owner_id: sampleUser.id,
        })
      ).save();

      const anotherUser = await UserModel.forge(UserMock()).save();

      request(server)
        .delete(ServiceSharePath)
        .set("_uid", 500)
        .send({
          application_id: insertedApplication.id,
          email: anotherUser.get("email"),
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });

    test("Unsuccessfully revoke shared app with non-exists app", async (done) => {
      const sampleUser = await UserModel.forge(UserMock()).save();

      request(server)
        .delete(ServiceSharePath)
        .set("_uid", 500)
        .send({
          application_id: ApplicationMock().id,
          email: sampleUser.get("email"),
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });
  });
});
describe("Search User", () => {
  describe("GET: /sharing/search", () => {
    beforeEach(async (done) => {
      const user1 = await UserModel.forge(
        UserMock({ username: "asdqwe" })
      ).save();
      const user2 = await UserModel.forge(
        UserMock({ username: "asdasd" })
      ).save();
      const user3 = await UserModel.forge(
        UserMock({ username: "oooooo" })
      ).save();
      const user4 = await UserModel.forge(UserMock({ email: "asdas" })).save();
      const user5 = await UserModel.forge(UserMock({ email: "asdqwe" })).save();
      const user6 = await UserModel.forge(UserMock({ email: "oooooo" })).save();

      done();
    });
    test("Get the users with matching username", async (done) => {
      request(server)
        .get(`${ServiceSharePath}/search`)
        .set("_uid", 500)
        .query({
          username: "asd",
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(2);
          done();
        });
    });
    test("Get the users with matching email", async (done) => {
      request(server)
        .get(`${ServiceSharePath}/search`)
        .set("_uid", 500)
        .query({
          email: "asd",
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(2);
          done();
        });
    });
    test("Do not get the users with no email or username", async (done) => {
      request(server)
        .get(`${ServiceSharePath}/search`)
        .set("_uid", 500)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(err).toBeNil();
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(res.body.message).toBe("No query parameters given");
          done();
        });
    });
    test("Get user with the username priority", async (done) => {
      const user7 = await UserModel.forge(
        UserMock({ username: "asde", email: "qweq" })
      ).save();
      request(server)
        .get(`${ServiceSharePath}/search`)
        .set("_uid", 500)
        .query({
          username: "asd",
          email: "qweq",
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(3);
          done();
        });
    });
  });
});
