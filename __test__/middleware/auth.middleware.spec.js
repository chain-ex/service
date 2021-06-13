import request from "supertest";
import UserMock from "../__mocks__/user";

import server from "../../server";
import UserModel from "../../server/models/user";
import AuthController from "../../server/services/auth/auth_controller";
import config from "../../config";

const { CODE } = config;

const UserApiRoute = "/v0/user";

describe("Auth Middleware", () => {
  describe("Private Routes", () => {
    test("Pass with Correct Authorization Token in Headers", async (done) => {
      const sampleUser = UserMock();
      await UserModel.forge(sampleUser).save();

      const token = AuthController.createToken(sampleUser);

      request(server)
        .get(UserApiRoute)
        .set("Authorization", token)
        .expect(CODE.OK)
        .end((err) => {
          expect(err).toBeNil();
          done();
        });
    });
    test("Don't Pass with Incorrect Authorization Token in Headers", async (done) => {
      request(server)
        .get(UserApiRoute)
        .set("Authorization", "token")
        .expect(CODE.UNAUTHORIZED)
        .end((err) => {
          expect(err).toBeNil();
          done();
        });
    });
  });
});
