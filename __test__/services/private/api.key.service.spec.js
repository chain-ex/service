import request from "supertest";
import server from "../../../server";
import config from "../../../config";

// Models
import ApplicationModel from "../../../server/models/application";
import ApplicationUserModel from "../../../server/models/applicationUser";
import ApiKeyModel from "../../../server/models/apiKey";
import UserModel from "../../../server/models/user";

// Mocks
import ApplicationMock from "../../__mocks__/application";
import UserMock from "../../__mocks__/user";
import ApiKeyMock from "../../__mocks__/apiKey";

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

const ServicePath = `/${apiVersion}/apikey`;

describe("Api Key Routes", () => {
  describe("POST : /apikey", () => {
    let newApp;
    let ownerUsrID;
    let otherUsrID;

    beforeEach(async (done) => {
      const insertedOwnerUsr = await UserModel.forge(UserMock()).save();
      const insertedOtherUsr = await UserModel.forge(UserMock()).save();
      ownerUsrID = insertedOwnerUsr.id;
      otherUsrID = insertedOtherUsr.id;

      newApp = await ApplicationModel.forge(
        ApplicationMock({
          owner_id: ownerUsrID,
        })
      ).save();

      await ApplicationUserModel.forge({
        user_id: otherUsrID,
        application_id: newApp.id,
      }).save();

      done();
    });

    test("should generate api key for an app", (done) => {
      request(server)
        .post(ServicePath)
        .expect(CODE.CREATED)
        .set("_uid", ownerUsrID)
        .send({
          application_id: newApp.id,
        })
        .end((err, res) => {
          const returnData = res.body.data;
          expect(returnData.token).toHaveLength(36);
          expect(returnData).toHaveProperty("application_id", newApp.id);
          expect(returnData).toHaveProperty("created_by", ownerUsrID);
          expect(err).toBeNil();
          done();
        });
    });

    test("should generate different api key for an app", (done) => {
      request(server)
        .post(ServicePath)
        .expect(CODE.CREATED)
        .set("_uid", ownerUsrID)
        .send({
          application_id: newApp.id,
        })
        .end((err, res) => {
          const returnData = res.body.data;
          expect(returnData.token).toHaveLength(36);
          expect(returnData).toHaveProperty("application_id", newApp.id);
          expect(returnData).toHaveProperty("created_by", ownerUsrID);
          expect(err).toBeNil();
          request(server)
            .post(ServicePath)
            .expect(CODE.CREATED)
            .set("_uid", ownerUsrID)
            .send({
              application_id: newApp.id,
            })
            .end((err2, res2) => {
              const returnData2 = res2.body.data;
              expect(returnData2.token).not.toBe(returnData.token);
              expect(returnData2).toHaveProperty("application_id", newApp.id);
              expect(returnData2).toHaveProperty("created_by", ownerUsrID);
              expect(err2).toBeNil();
              done();
            });
        });
    });

    test("should insert apiKey model", (done) => {
      request(server)
        .post(ServicePath)
        .expect(CODE.CREATED)
        .set("_uid", ownerUsrID)
        .send({
          application_id: newApp.id,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          const returnData = res.body.data;
          ApiKeyModel.where({
            token: returnData.token,
          })
            .fetch({ require: false })
            .then((fetchedApiKey) => {
              const result = fetchedApiKey.toJSON();
              expect(result).toBeTruthy();
              expect(result).toHaveProperty("token", returnData.token);
              expect(result).toHaveProperty("application_id", newApp.id);
              expect(result).toHaveProperty("created_by", ownerUsrID);
              done();
            });
        });
    });

    test("should insert apiKey model into shared app", (done) => {
      request(server)
        .post(ServicePath)
        .expect(CODE.CREATED)
        .set("_uid", otherUsrID)
        .send({
          application_id: newApp.id,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          const returnData = res.body.data;
          ApiKeyModel.where({
            token: returnData.token,
          })
            .fetch({ require: false })
            .then((fetchedApiKey) => {
              const result = fetchedApiKey.toJSON();
              expect(result).toBeTruthy();
              expect(result).toHaveProperty("token", returnData.token);
              expect(result).toHaveProperty("application_id", newApp.id);
              expect(result).toHaveProperty("created_by", otherUsrID);
              done();
            });
        });
    });

    test("should not insert apiKey model into others app", (done) => {
      request(server)
        .post(ServicePath)
        .expect(CODE.ERR)
        .set("_uid", 999)
        .send({
          application_id: newApp.id,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          expect(res.error).toBeTruthy();
          const returnData = res.body.data;
          expect(returnData).toBeFalsy();
          done();
        });
    });

    test("should not insert apiKey model into non-exists", (done) => {
      request(server)
        .post(ServicePath)
        .expect(CODE.ERR)
        .set("_uid", 999)
        .send({
          application_id: 999,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res).toBeTruthy();
          expect(res.error).toBeTruthy();
          const returnData = res.body.data;
          expect(returnData).toBeFalsy();
          done();
        });
    });
  });
  describe("GET : /apikey", () => {
    let newApp;
    let newOtherApp;
    let ownerUsrID;
    let otherUsrID;

    beforeEach(async (done) => {
      const insertedOwnerUsr = await UserModel.forge(UserMock()).save();
      const insertedOtherUsr = await UserModel.forge(UserMock()).save();
      const OtherUsr = await UserModel.forge(UserMock()).save();

      ownerUsrID = insertedOwnerUsr.id;
      otherUsrID = insertedOtherUsr.id;

      newApp = await ApplicationModel.forge(
        ApplicationMock({
          owner_id: ownerUsrID,
        })
      ).save();
      newOtherApp = await ApplicationModel.forge(
        ApplicationMock({
          owner_id: OtherUsr.id,
        })
      ).save();

      await ApplicationUserModel.forge({
        user_id: otherUsrID,
        application_id: newApp.id,
      }).save();

      await Promise.all(
        [
          ApiKeyMock({
            application_id: newApp.id,
          }),
          ApiKeyMock({
            application_id: newApp.id,
          }),
          ApiKeyMock({
            application_id: newApp.id,
          }),
          ApiKeyMock({
            application_id: newApp.id,
          }),
        ].map((apiKey) => ApiKeyModel.forge(apiKey).save())
      );

      await Promise.all(
        [
          ApiKeyMock({
            application_id: 99,
          }),
          ApiKeyMock({
            application_id: 123,
          }),
          ApiKeyMock({
            application_id: 32,
          }),
          ApiKeyMock({
            application_id: 123,
          }),
        ].map((apiKey) => ApiKeyModel.forge(apiKey).save())
      );

      done();
    });

    function checkFields(app) {
      expect(app).toHaveProperty("id");
      expect(app.token).toHaveLength(36);
      expect(app).toHaveProperty("application_id", newApp.id);
      expect(app).toHaveProperty("created_by");
      return true;
    }
    test("should get api keys of an application", (done) => {
      request(server)
        .get(ServicePath)
        .expect(CODE.OK)
        .set("_uid", ownerUsrID)
        .query({
          appID: newApp.id,
        })
        .end((err, res) => {
          const returnData = res.body.data;
          expect(returnData).toSatisfyAll(checkFields);
          expect(returnData).toHaveLength(4);
          expect(err).toBeNil();
          done();
        });
    });
    test("should get api keys of shared application", (done) => {
      request(server)
        .get(ServicePath)
        .expect(CODE.OK)
        .set("_uid", otherUsrID)
        .query({
          appID: newApp.id,
        })
        .end((err, res) => {
          const returnData = res.body.data;
          expect(returnData).toSatisfyAll(checkFields);
          expect(returnData).toHaveLength(4);
          expect(err).toBeNil();
          done();
        });
    });
    test("should not get api keys of other application", (done) => {
      request(server)
        .get(ServicePath)
        .expect(CODE.UNAUTHORIZED)
        .set("_uid", otherUsrID)
        .query({
          appID: newOtherApp.id,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.error).toBeTruthy();
          done();
        });
    });
  });
  describe("DELETE : /apikey", () => {
    let newApp;
    let newOtherApp;
    let ownerUsrID;
    let otherUsrID;
    let apiKey;
    let otherApiKey;
    beforeEach(async (done) => {
      const insertedOwnerUsr = await UserModel.forge(UserMock()).save();
      const insertedOtherUsr = await UserModel.forge(UserMock()).save();
      const OtherUsr = await UserModel.forge(UserMock()).save();

      ownerUsrID = insertedOwnerUsr.id;
      otherUsrID = insertedOtherUsr.id;

      newApp = await ApplicationModel.forge(
        ApplicationMock({
          owner_id: ownerUsrID,
        })
      ).save();
      newOtherApp = await ApplicationModel.forge(
        ApplicationMock({
          owner_id: otherUsrID,
        })
      ).save();

      await ApplicationUserModel.forge({
        user_id: otherUsrID,
        application_id: newApp.id,
      }).save();

      await ApiKeyModel.forge(
        ApiKeyMock({
          application_id: newApp.id,
        })
      )
        .save()
        .then((savedApiKey) => {
          apiKey = savedApiKey.get("token");
        });
      await ApiKeyModel.forge(
        ApiKeyMock({
          application_id: newOtherApp.id,
        })
      )
        .save()
        .then((savedApiKey) => {
          otherApiKey = savedApiKey.get("token");
        });

      done();
    });

    test("should delete the apikey from own application", (done) => {
      request(server)
        .delete(ServicePath)
        .expect(CODE.OK)
        .set("_uid", ownerUsrID)
        .send({
          api_key: apiKey,
          application_id: newApp.id,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.error, res.body.message).toBeUndefined();
          done();
        });
    });
    test("should delete the apikey from shared application", (done) => {
      request(server)
        .delete(ServicePath)
        .expect(CODE.OK)
        .set("_uid", otherUsrID)
        .send({
          api_key: apiKey,
          application_id: newApp.id,
        })
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          done();
        });
    });
    test("should not delete an application of other user", (done) => {
      request(server)
        .delete(ServicePath)
        .expect(CODE.ERR)
        .set("_uid", 999)
        .send({
          api_key: otherApiKey,
          application_id: newOtherApp.id,
        })
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.error).toBeTruthy();
          done();
        });
    });
  });
});
