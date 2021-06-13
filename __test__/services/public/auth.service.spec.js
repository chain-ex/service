import request from "supertest";
import config from "../../../config";
import server from "../../../server";
import emailHelper from "../../../server/helpers/email";

// Models
import UserModel from "../../../server/models/user";
import EmailTokenModel from "../../../server/models/emailToken";

// Mocks
import UserMock from "../../__mocks__/user";
import EmailTokenMock from "../../__mocks__/emailToken";

const { CODE } = config;

const ServicePath = "/auth";
const LoginPath = `${ServicePath}/login`;
const RegisterPath = `${ServicePath}/register`;
const VerifyPath = `${ServicePath}/verify`;
const ForgotPath = `${ServicePath}/forgot`;
const ResetPath = `${ServicePath}/reset`;
const CheckPath = `${ServicePath}/check`;

const getTokenVerifyPath = (token) => {
  return `${VerifyPath}/?token=${token}`;
};

const emailFunc = (sampleEmail) => {
  return ({ sendTo = "to", template }) => {
    return new Promise((resolve, reject) => {
      if (sampleEmail.toEmail !== sendTo)
        reject(
          new Error(
            `Incorrect Email ${sendTo}!=${sampleEmail.toEmail}`,
            sampleEmail
          )
        );

      if (template.id !== sampleEmail.template.id)
        reject(new Error("Incorrect Template ID"));

      if (sampleEmail.template && sampleEmail.template.data) {
        for (const key of Object.keys(sampleEmail.template.data)) {
          if (template.data[key] !== sampleEmail.template.data[key])
            reject(
              new Error(
                `Incorrect Template Data ${sampleEmail.data[key]} !==${template.data[key]}`
              )
            );
        }
      }

      resolve();
    });
  };
};

describe("Auth Routes", () => {
  describe(`POST : /auth/login`, () => {
    test("Login successfully with correct username and password and return token with username and role", async (done) => {
      const sampleUser = UserMock();

      await UserModel.forge(sampleUser).save();

      request(server)
        .post(LoginPath)
        .send({
          username: sampleUser.username,
          password: sampleUser.password,
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveProperty("username", sampleUser.username);
          expect(res.body.data).toHaveProperty("role", "user");
          expect(res.body.data).toHaveProperty("token");
          done();
        });
    });
    test("Incorrect login with wrong username or password, return error", async (done) => {
      const sampleUser = UserMock();
      await UserModel.forge(sampleUser).save();

      request(server)
        .post(LoginPath)
        .send({
          username: sampleUser.username,
          password: `${sampleUser.password}asd`,
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.message).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          done();
        });
    });
    test("Incorrect login with unregistered username or password, return error", async (done) => {
      const wrongUser = UserMock();

      request(server)
        .post(LoginPath)
        .send({
          username: wrongUser.username,
          password: wrongUser.password,
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.message).toBeTruthy();
          expect(res.body.error).toBeTruthy();
          done();
        });
    });
  });

  describe(`POST : /auth/register`, () => {
    test("Register successfully with correct name, surname, username, password and email", async (done) => {
      const sampleUser = UserMock();
      emailHelper.sendMail = jest.fn(
        emailFunc({
          toEmail: sampleUser.email,
          template: {
            id: "register",
            data: {
              name: `${sampleUser.name} ${sampleUser.surname}`,
            },
          },
        })
      );
      request(server)
        .post(RegisterPath)
        .send(sampleUser)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveProperty("username", sampleUser.username);
          expect(res.body.data).toHaveProperty("role", "user");
          expect(res.body.data.token).toBeTruthy();
          done();
        });
    });
    test("Register successfully, then send email one time", async (done) => {
      await UserModel.forge(UserMock()).save();
      await UserModel.forge(UserMock()).save();
      await UserModel.forge(UserMock()).save();

      const sampleUser = UserMock();

      emailHelper.sendMail = jest.fn(
        emailFunc({
          toEmail: sampleUser.email,
          template: {
            id: "register",
            data: {
              name: `${sampleUser.name} ${sampleUser.surname}`,
            },
          },
        })
      );

      request(server)
        .post(RegisterPath)
        .send(sampleUser)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveProperty("username", sampleUser.username);
          expect(res.body.data).toHaveProperty("role", "user");
          expect(res.body.data.token).toBeTruthy();
          expect(emailHelper.sendMail).toBeCalledTimes(1);
          done();
        });
    });
    test("Register unsuccessfully with used username", async (done) => {
      const sampleUser = UserMock({
        username: "tubutest",
      });
      await UserModel.forge(sampleUser).save();

      request(server)
        .post(RegisterPath)
        .send(sampleUser)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBe("Username or Email is already using");
          done();
        });
    });
  });

  describe(`POST : /auth/verify`, () => {
    test("Successfully verify email token of existing user", async (done) => {
      const sampleUser = UserMock();
      const insertedData = await UserModel.forge(sampleUser).save();

      const currentUser = insertedData.toJSON();
      const sampleEmailToken = EmailTokenMock({
        user_id: currentUser.id,
      });

      await EmailTokenModel.create(sampleEmailToken);
      await EmailTokenModel.create(EmailTokenMock());
      await EmailTokenModel.create(EmailTokenMock());

      request(server)
        .post(getTokenVerifyPath(sampleEmailToken.token))
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeFalsy();
          expect(err).toBeNil();
          UserModel.where({ id: currentUser.id })
            .fetch()
            .then((updatedUser) => {
              expect(updatedUser.get("is_verified")).toBeTrue();
              done();
            });
        });
    });
  });

  describe(`POST : /auth/forgot`, () => {
    test("Successfully sending forgot password email", async (done) => {
      const sampleUser = UserMock();
      await UserModel.forge(sampleUser).save();

      emailHelper.sendMail = jest.fn(
        emailFunc({
          toEmail: sampleUser.email,
          template: {
            id: "reset",
          },
        })
      );

      request(server)
        .post(ForgotPath)
        .send({
          email: sampleUser.email,
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeFalsy();
          expect(err).toBeNil();
          done();
        });
    });
    test("Error occurs with unused email and email does not be sent", async (done) => {
      const sampleUser = UserMock();

      emailHelper.sendMail = jest.fn(
        emailFunc({
          toEmail: sampleUser.email,
          template: {
            id: "reset",
          },
        })
      );

      request(server)
        .post(ForgotPath)
        .send({
          email: sampleUser.email,
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error).toBeTruthy();
          expect(res.body.message).toBe("Unused email address");
          expect(err).toBeNil();
          done();
        });
    });
  });

  describe(`POST : /auth/reset`, () => {
    test("Successfully reset user password by using forgot email token", async (done) => {
      const sampleUser = UserMock();
      const currentUser = await UserModel.forge(sampleUser).save();

      const sampleEmailToken = EmailTokenMock({
        user_id: currentUser.id,
        type: "forgot",
      });

      await EmailTokenModel.create(sampleEmailToken);

      request(server)
        .post(ResetPath)
        .send({
          newPassword: "123456",
          newPasswordSame: "123456",
          resetToken: sampleEmailToken.token,
        })
        .expect(CODE.OK)
        .end(async (err, res) => {
          expect(res.body.error, res.body.message).toBeFalsy();
          expect(err).toBeNil();
          await UserModel.verify(sampleUser.username, "123456");
          done();
        });
    });
  });

  describe(`POST : /auth/check`, () => {
    test("Successfully check valid token : true", async (done) => {
      const sampleEmailToken = EmailTokenMock();
      await EmailTokenModel.create(sampleEmailToken);

      request(server)
        .post(CheckPath)
        .send({
          token: sampleEmailToken.token,
        })
        .expect(CODE.OK)
        .end(async (err, res) => {
          expect(res.body.error, res.body.message).toBeFalsy();
          expect(err).toBeNil();
          expect(res.body.data.status, res.body.data.message).toBeTrue();
          done();
        });
    });
    test("Successfully check invalid token, Token not exists", async (done) => {
      const sampleEmailToken = EmailTokenMock();

      request(server)
        .post(CheckPath)
        .send({
          token: sampleEmailToken.token,
        })
        .expect(CODE.OK)
        .end(async (err, res) => {
          expect(res.body.errors, res.body.message).toBeFalsy();
          expect(err).toBeNil();
          expect(res.body.data.status).toBeFalse();
          expect(res.body.data.message).toBe("Token not exists");
          done();
        });
    });
    test("Successfully check invalid token, Expired Tokens", async (done) => {
      const sampleEmailToken = EmailTokenMock({
        expired_in: Date.now(),
      });
      await EmailTokenModel.create(sampleEmailToken);

      request(server)
        .post(CheckPath)
        .send({
          token: sampleEmailToken.token,
        })
        .expect(CODE.OK)
        .end(async (err, res) => {
          expect(res.body.errors, res.body.message).toBeFalsy();
          expect(err).toBeNil();
          expect(res.body.data.status).toBeFalse();
          expect(res.body.data.message).toBe("Expired Token");
          done();
        });
    });
  });
});
