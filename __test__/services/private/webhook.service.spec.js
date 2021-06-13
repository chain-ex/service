import request from "supertest";

// Mocks
import { generateFull } from "../../__mocks__/contract";
import WebhookMock from "../../__mocks__/webhook";
import WebhookLogMock from "../../__mocks__/webhookLog";
import ApplicationMock from "../../__mocks__/application";
import UserMock from "../../__mocks__/user";

// Models
import ContractModel from "../../../server/models/contract";
import WebhookModel from "../../../server/models/webhook";
import WebhookLogModel from "../../../server/models/webhookLog";
import ApplicationModel from "../../../server/models/application";
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

const ServicePath = `/${apiVersion}/webhook`;
const ServiceRequestPath = `/${apiVersion}/webhook/:id`;
const LogServicePath = `/${apiVersion}/webhook/:id/log`;
const LogServiceRequestPath = `/${apiVersion}/webhook/:id/log/:webhookID`;

function setTestURL(id) {
  return ServiceRequestPath.replace(":id", id || "");
}

function setLogTestURL(id, webhookID = "") {
  return LogServiceRequestPath.replace(":id", id || "").replace(
    ":webhookID",
    webhookID
  );
}

describe("Webhook Routes", () => {
  let ownerUser;
  beforeEach(async (done) => {
    ownerUser = await new UserModel(UserMock()).save();
    done();
  });
  describe(`POST : /webhook`, () => {
    test("create a new webhook within existing contract", async (done) => {
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

      const sampleData = WebhookMock({
        short_id: "TUBUTEST",
      });

      request(server)
        .post(setTestURL())
        .set("_uid", ownerUser.id)
        .send(sampleData)
        .expect(CODE.CREATED)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();

          const returnData = res.body.data;
          expect(returnData).toHaveProperty("name", sampleData.name);
          expect(returnData).toHaveProperty(
            "description",
            sampleData.description
          );
          expect(returnData).toHaveProperty("url", sampleData.url);
          done();
        });
    });
  });
  describe(`GET : /webhook`, () => {
    describe("List webhooks", () => {
      beforeEach(async (done) => {
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
            owner_id: ownerUser.id,
            short_id: "TUBUTEST2",
            application_id: ownedApp.id,
          })
        ).save();

        const insertPromises = [];

        for (let i = 0; i < 5; i += 1) {
          insertPromises.push(
            WebhookModel.forge(
              WebhookMock({
                short_id: "TUBUTEST",
              })
            ).save()
          );
        }

        for (let i = 0; i < 5; i += 1) {
          insertPromises.push(
            WebhookModel.forge(
              WebhookMock({
                short_id: "TETE",
              })
            ).save()
          );
        }

        for (let i = 0; i < 3; i += 1) {
          insertPromises.push(
            WebhookModel.forge(
              WebhookMock({
                short_id: "TUBUTEST2",
              })
            ).save()
          );
        }

        await Promise.all(insertPromises);
        done();
      });
      test("do not get other-s specific contract-s webhooks", async (done) => {
        request(server)
          .get(setTestURL())
          .set("_uid", ownerUser.id)
          .query({
            shortID: "TUBUTEEST",
          })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
      test("get specific contract-s webhooks", async (done) => {
        request(server)
          .get(setTestURL())
          .set("_uid", ownerUser.id)
          .query({
            shortID: "TUBUTEST",
          })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.errors, res.body.message).toBeUndefined();
            expect(res.body.data).toHaveLength(5);

            done();
          });
      });
    });
  });
  describe(`GET : /webhook/:id`, () => {
    test("get specific webhook detail", async (done) => {
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

      const insertPromises = [];
      for (let i = 0; i < 5; i += 1) {
        insertPromises.push(
          WebhookModel.forge(
            WebhookMock({
              short_id: "TUBUTEST",
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertPromises.push(
          WebhookModel.forge(
            WebhookMock({
              short_id: "TETE",
            })
          ).save()
        );
      }
      await Promise.all(insertPromises);

      const sampleData = await WebhookModel.forge(
        WebhookMock({
          short_id: "TUBUTEST",
        })
      ).save();
      request(server)
        .get(setTestURL(sampleData.id))
        .set("_uid", ownerUser.id)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();

          const returnData = res.body.data;

          expect(returnData).toHaveProperty("name", sampleData.get("name"));
          expect(returnData).toHaveProperty(
            "description",
            sampleData.get("description")
          );
          expect(returnData).toHaveProperty("url", sampleData.get("url"));
          done();
        });
    });
  });
  describe(`GET : /webhook/:id/log`, () => {
    test("get all webhook logs", async (done) => {
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

      const sampleData = await WebhookModel.forge(
        WebhookMock({
          short_id: "TUBUTEST",
        })
      ).save();

      const insertPromises = [];
      for (let i = 0; i < 5; i += 1) {
        insertPromises.push(
          WebhookLogModel.forge(
            WebhookLogMock({
              short_id: "TUBUTEST",
              webhook_id: sampleData.id,
            })
          ).save()
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertPromises.push(
          WebhookLogModel.forge(
            WebhookLogMock({
              short_id: "TUBUTEST2",
              webhook_id: sampleData.id + 1,
            })
          ).save()
        );
      }

      await Promise.all(insertPromises);

      request(server)
        .get(setLogTestURL(sampleData.id))
        .set("_uid", ownerUser.id)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();

          const returnData = res.body.data;

          expect(returnData).toHaveLength(5);

          done();
        });
    });
  });
  describe(`GET : /webhook/:id/log/:logID`, () => {
    test("get a specific webhook logs by using id", async (done) => {
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

      const insertPromises = [];
      for (let i = 0; i < 5; i += 1) {
        insertPromises.push(
          WebhookLogModel.forge(
            WebhookLogMock({
              short_id: "TUBUTEST",
            })
          ).save
        );
      }
      for (let i = 0; i < 5; i += 1) {
        insertPromises.push(
          WebhookLogModel.forge(
            WebhookLogMock({
              short_id: "TUBUTEST2",
            })
          ).save()
        );
      }

      await Promise.all(insertPromises);
      const sampleData = await WebhookModel.forge(
        WebhookMock({
          short_id: "TUBUTEST",
        })
      ).save();

      const sampleWebhookLog = await WebhookLogModel.forge(
        WebhookLogMock({
          short_id: "TUBUTEST",
          webhook_id: sampleData.id,
        })
      ).save();

      request(server)
        .get(setLogTestURL(sampleData.id, sampleWebhookLog.id))
        .set("_uid", ownerUser.id)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();

          const returnData = res.body.data;

          expect(returnData).toHaveProperty("url");

          done();
        });
    });
  });
});
