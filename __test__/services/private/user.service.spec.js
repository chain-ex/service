import request from "supertest";
import UserMock from "../../__mocks__/user";
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

const ServicePath = `/${apiVersion}/user`;
const ServicePathWithId = `/${apiVersion}/user/:username`;
const UserMePath = `/${apiVersion}/user/me`;

describe("User Routes", () => {
  describe(`POST : /user`, () => {
    test("create a new user with required parameters on body", async (done) => {
      const insertData = UserMock();

      request(server)
        .post(ServicePath)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send(insertData)
        .expect(CODE.CREATED)
        .end((err, res) => {
          expect(res.body).toBeTruthy();
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toContainKeys(Object.keys(insertData));
          delete insertData.password;
          expect(res.body.data).toContainValues(Object.values(insertData));
          done();
        });
    });
  });
  describe(`GET : /user`, () => {
    test("get list of users with default parameters", async (done) => {
      const insertPromises = [];
      for (let i = 0; i < 24; i += 1) {
        insertPromises.push(UserModel.forge(UserMock()).save());
      }

      await Promise.all(insertPromises);

      request(server)
        .get(ServicePath)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .expect(CODE.OK)
        .end((err, res) => {
          expect(err).toBeNil();

          expect(res).toBeTruthy();
          expect(res.body.data).toHaveLength(20);
          done();
        });
    });
  });
  describe(`PUT : /user/:username}`, () => {
    test("update users with different parameters", async (done) => {
      const insertedData = await UserModel.forge(UserMock()).save();

      const updatedData = UserMock();

      request(server)
        .put(`${ServicePath}/${insertedData.get("username")}`)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .send(updatedData)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveProperty("name", updatedData.name);
          expect(res.body.data).toHaveProperty("surname", updatedData.surname);
          expect(res.body.data).toHaveProperty(
            "username",
            updatedData.username
          );
          done();
        });
    });
  });
  describe(`GET : /user/me`, () => {
    test("get logged user data", async (done) => {
      const sampleData = await UserModel.forge(UserMock()).save();

      const insertedUser = sampleData.toJSON();

      request(server)
        .get(UserMePath)
        .set("Content-Type", "application/json")
        .set("Accept", "application/json")
        .set("_uid", sampleData.id)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body).toBeTruthy();
          expect(res.body.errors, res.body.message).toBeUndefined();
          expect(res.body.data).toHaveProperty("name", insertedUser.name);
          expect(res.body.data).toHaveProperty("surname", insertedUser.surname);
          expect(res.body.data).toHaveProperty(
            "username",
            insertedUser.username
          );
          expect(res.body.data).toHaveProperty("role", insertedUser.role);
          done();
        });
    });
  });
});
