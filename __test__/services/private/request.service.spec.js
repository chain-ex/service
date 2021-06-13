import request from "supertest";
import moment from "moment";

// Compiled Contract

// Mocks
import { generateFull } from "../../__mocks__/contract";
import ApplicationMock from "../../__mocks__/application";
import UserMock from "../../__mocks__/user";

import IntegrationRequestMock from "../../__mocks__/integrationRequest";

// Models
import UserModel from "../../../server/models/user";
import ContractModel from "../../../server/models/contract";
import ApplicationModel from "../../../server/models/application";
import ApplicationUserModel from "../../../server/models/applicationUser";

import IntegrationRequestModel from "../../../server/models/integrationRequest";

import server from "../../../server";
import config from "../../../config";

// Unlock Authorization
jest.mock("../../../server/middleware/auth_middleware", () =>
  jest.fn((req, res, next) => {
    req.userData = {
      uid: req.headers._uid,
    };
    next();
  })
);
// Fix the date
jest.mock("moment", () => {
  return () => jest.requireActual("moment")("2020-08-07T00:00:00.000Z");
});
const { CODE, apiVersion } = config;

const ServiceRequestPath = `/${apiVersion}/integration/requests/`;
const ServiceRequestPathWithID = `/${apiVersion}/integration/requests/:id`;
const ServiceStatsPath = `/${apiVersion}/integration/stats/`;

function setReqTestURL(id) {
  return ServiceRequestPathWithID.replace(":id", id);
}

describe("Contract Request Logs", () => {
  let ownerUserID;
  let otherUserID;
  let ownerAppID;
  let ownerSecondAppID;
  let sharedAppID;
  let otherAppID;
  let ownerEmptyAppID;

  /*
    Contracts
    Owner APP
    TUBUTEST 

    Owner APP 2
    TUBUTEST2 
    TUBUTEST3 
  
    Shared APP
    TUBUTEST4
  
    Other APP
    TUBUTEST5
  */
  beforeEach(async (done) => {
    await Promise.all([
      new UserModel(UserMock()).save().then((savedUser) => {
        ownerUserID = savedUser.id;
      }),
      new UserModel(UserMock()).save().then((savedUser) => {
        otherUserID = savedUser.id;
      }),
    ]).then();

    // Insert Applications
    await Promise.all([
      new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUserID,
          network_id: 999,
        })
      )
        .save()
        .then((savedApp) => {
          ownerEmptyAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUserID,
          network_id: 999,
        })
      )
        .save()
        .then((savedApp) => {
          ownerAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUserID,
        })
      )
        .save()
        .then((savedApp) => {
          ownerSecondAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: otherUserID,
          network_id: 999,
        })
      )
        .save()
        .then((savedApp) => {
          sharedAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: otherUserID,
        })
      )
        .save()
        .then((savedApp) => {
          otherAppID = savedApp.id;
        }),
    ]);

    // Share Applications
    await new ApplicationUserModel({
      application_id: sharedAppID,
      user_id: ownerUserID,
    }).save();

    // Insert Applications
    await Promise.all([
      new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUserID,
          network_id: 999,
        })
      )
        .save()
        .then((savedApp) => {
          ownerAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: ownerUserID,
        })
      )
        .save()
        .then((savedApp) => {
          ownerSecondAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: otherUserID,
          network_id: 999,
        })
      )
        .save()
        .then((savedApp) => {
          sharedAppID = savedApp.id;
        }),
      new ApplicationModel(
        ApplicationMock({
          owner_id: otherUserID,
        })
      )
        .save()
        .then((savedApp) => {
          otherAppID = savedApp.id;
        }),
    ]);

    // Share Applications
    await new ApplicationUserModel({
      application_id: sharedAppID,
      user_id: ownerUserID,
    }).save();

    // Contracts Added
    await Promise.all([
      new ContractModel(
        generateFull({
          short_id: "TUBUTEST",
          application_id: ownerAppID,
          network_id: 100,
        })
      ).save(),
      new ContractModel(
        generateFull({
          short_id: "TUBUTEST2",
          application_id: ownerSecondAppID,
          network_id: 999,
        })
      ).save(),
      new ContractModel(
        generateFull({
          short_id: "TUBUTEST3",
          application_id: ownerSecondAppID,
          network_id: 999,
        })
      ).save(),
      new ContractModel(
        generateFull({
          short_id: "TUBUTEST4",
          application_id: sharedAppID,
          network_id: 999,
        })
      ).save(),
      new ContractModel(
        generateFull({
          short_id: "TUBUTEST5",
          application_id: otherAppID,
        })
      ).save(),
    ]);

    done();
  });
  describe(`GET : /integration/request`, () => {
    beforeEach(async (done) => {
      const intReqCreatePromises = [];
      // Owner 10
      for (let i = 0; i < 10; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST",
            })
          ).save()
        );
      }

      // Owner Second App -> 7 + 8 -> 15
      for (let i = 0; i < 7; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST2",
            })
          ).save()
        );
      }
      for (let i = 0; i < 8; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST3",
            })
          ).save()
        );
      }

      // Shared 5
      for (let i = 0; i < 5; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST4",
            })
          ).save()
        );
      }

      // Other 9
      for (let i = 0; i < 9; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST5",
            })
          ).save()
        );
      }
      await Promise.all(intReqCreatePromises);

      done();
    });

    test("get all contract requests by using short id ", async (done) => {
      request(server)
        .get(ServiceRequestPath)
        .set("_uid", ownerUserID)
        .query({
          shortID: "TUBUTEST",
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(10);
          expect(res.body.pagination).toContainValues([1, 1, 10, 10]);
          done();
        });
    });
    test("should not get others all contract requests", async (done) => {
      request(server)
        .get(ServiceRequestPath)
        .set("_uid", ownerUserID)
        .query({
          shortID: "TUBUTEST5",
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeTruthy();
          expect(err).toBeNil();
          done();
        });
    });
    test("get all contract requests by using application id ", async (done) => {
      request(server)
        .get(ServiceRequestPath)
        .set("_uid", ownerUserID)
        .query({
          applicationID: ownerSecondAppID,
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(15);
          expect(res.body.pagination).toContainValues([1, 1, 15, 15]);
          done();
        });
    });
    test("get all contract requests by using shared application id ", async (done) => {
      request(server)
        .get(ServiceRequestPath)
        .set("_uid", ownerUserID)
        .query({
          applicationID: sharedAppID,
        })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(5);
          expect(res.body.pagination).toContainValues([1, 1, 5, 5]);
          done();
        });
    });
    test("can not get all contract requests by using other application id ", async (done) => {
      request(server)
        .get(ServiceRequestPath)
        .set("_uid", ownerUserID)
        .query({
          applicationID: otherAppID,
        })
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.error, res.body.message).toBeTruthy();
          done();
        });
    });
    test("get all contract requests by using network id ", async (done) => {
      request(server)
        .get(ServiceRequestPath)
        .set("_uid", ownerUserID)
        .query({ networkID: 999 })
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.errors, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveLength(20);
          expect(res.body.pagination).toContainValues([1, 1, 20, 20]);
          done();
        });
    });
  });
  describe(`GET : /integration/request/:id`, () => {
    let ownReqID;
    let sharedReqID;
    let otherReqID;
    beforeEach(async () => {
      await Promise.all([
        new IntegrationRequestModel(
          IntegrationRequestMock({
            short_id: "TUBUTEST",
          })
        )
          .save()
          .then((req) => {
            ownReqID = req.id;
          }),
        new IntegrationRequestModel(
          IntegrationRequestMock({
            short_id: "TUBUTEST4",
          })
        )
          .save()
          .then((req) => {
            sharedReqID = req.id;
          }),
        new IntegrationRequestModel(
          IntegrationRequestMock({
            short_id: "TUBUTEST5",
          })
        )
          .save()
          .then((req) => {
            otherReqID = req.id;
          }),
      ]);
    });
    test("get a specific own contract requests by using short id ", async (done) => {
      request(server)
        .get(setReqTestURL(ownReqID))
        .set("_uid", ownerUserID)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveProperty("short_id", "TUBUTEST");
          done();
        });
    });
    test("get a specific shared contract requests by using short id ", async (done) => {
      request(server)
        .get(setReqTestURL(sharedReqID))
        .set("_uid", ownerUserID)
        .expect(CODE.OK)
        .end((err, res) => {
          expect(res.body.error, res.body.message).toBeUndefined();
          expect(err).toBeNil();
          expect(res.body.data).toHaveProperty("short_id", "TUBUTEST4");
          done();
        });
    });
    test("get a specific other contract requests by using short id ", async (done) => {
      request(server)
        .get(setReqTestURL(otherReqID))
        .set("_uid", ownerUserID)
        .expect(CODE.ERR)
        .end((err, res) => {
          expect(err).toBeNil();
          expect(res.body.error, res.body.message).toBeTruthy();
          done();
        });
    });
  });
  describe(`GET : /integration/stats`, () => {
    /*
      NETWORK 999 -> Owner APP / Shared APP
      
      OWN APP     -> TUBUTEST
      OWN APP2    -> TUBUTEST2 TUBUTEST3
      SHARED APP  -> TUBUTEST4


      TODAY/WEEK/MONTH/QUARTER/YEAR

      OWN-SHARED NETWORK(999)       9/7/7/7/9   (9/16/23/30/39)

      OWN APP                       2/3/4/5/6   (2/5/9/14/20)
      OWN SHORTID/TUBUTEST)         2/3/4/5/6   (2/5/9/14/20)

      OWN APP2                      5/3/4/5/8   (5/8/12/17/25)
      OWN SHORTID/TUBUTEST2)        3/2/2/3/2   (3/5/7/10/12)
      OWN SHORTID/TUBUTEST3)        2/1/2/2/6   (2/3/5/7/13)

      SHARED APP                    7/4/3/2/3   (7/11/14/16/19)
      SHARED SHORTID(TUBUTEST4)     7/4/3/2/3   (7/11/14/16/19)

      OTHER APP                      FAILED
      OTHER SHORTID(TUBUTEST5)       FAILED
      
    */
    beforeEach(async (done) => {
      const intReqCreatePromises = [];

      // ------ TODAY ------
      // OWN
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST",
              created_at: moment().format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OWN 2-3
      for (let i = 0; i < 3; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST2",
              created_at: moment().format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST3",
              created_at: moment().format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // SHARED 4
      for (let i = 0; i < 7; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST4",
              created_at: moment().format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OTHER 4
      for (let i = 0; i < 3; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST5",
              created_at: moment().format("YYYY-MM-DD"),
            })
          ).save()
        );
      }

      // ------ WEEK ------
      // OWN
      for (let i = 0; i < 3; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST",
              created_at: moment()
                .startOf("week")
                .add(1, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OWN 2-3
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST2",
              created_at: moment()
                .startOf("week")
                .add(1, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      for (let i = 0; i < 1; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST3",
              created_at: moment()
                .startOf("week")
                .add(1, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // SHARED 4
      for (let i = 0; i < 4; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST4",
              created_at: moment()
                .startOf("week")
                .add(1, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OTHER 4
      for (let i = 0; i < 6; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST5",
              created_at: moment()
                .startOf("week")
                .add(1, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }

      // ------ MONTH ------
      // OWN
      for (let i = 0; i < 4; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST",
              created_at: moment().startOf("month").format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OWN 2-3
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST2",
              created_at: moment().startOf("month").format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST3",
              created_at: moment().startOf("month").format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // SHARED 4
      for (let i = 0; i < 3; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST4",
              created_at: moment().startOf("month").format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OTHER 4
      for (let i = 0; i < 6; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST5",
              created_at: moment().startOf("month").format("YYYY-MM-DD"),
            })
          ).save()
        );
      }

      // ------ Quarter ------
      // OWN
      for (let i = 0; i < 5; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST",
              created_at: moment()
                .startOf("quarter")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OWN 2-3
      for (let i = 0; i < 3; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST2",
              created_at: moment()
                .startOf("quarter")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST3",
              created_at: moment()
                .startOf("quarter")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // SHARED 4
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST4",
              created_at: moment()
                .startOf("quarter")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OTHER 4
      for (let i = 0; i < 1; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST5",
              created_at: moment()
                .startOf("quarter")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }

      // ------ Year ------
      // OWN
      for (let i = 0; i < 6; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST",
              created_at: moment()
                .startOf("year")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OWN 2-3
      for (let i = 0; i < 2; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST2",
              created_at: moment()
                .startOf("year")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      for (let i = 0; i < 6; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST3",
              created_at: moment()
                .startOf("year")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // SHARED 4
      for (let i = 0; i < 3; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST4",
              created_at: moment()
                .startOf("year")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }
      // OTHER 4
      for (let i = 0; i < 4; i += 1) {
        intReqCreatePromises.push(
          new IntegrationRequestModel(
            IntegrationRequestMock({
              short_id: "TUBUTEST5",
              created_at: moment()
                .startOf("year")
                .add(2, "d")
                .format("YYYY-MM-DD"),
            })
          ).save()
        );
      }

      await Promise.all(intReqCreatePromises);
      done();
    });

    describe("#shortID", () => {
      test("get a specific contract request stats by using short id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ shortID: "TUBUTEST" })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 2);
            expect(res.body.data).toHaveProperty("weekTotal", 5);
            expect(res.body.data).toHaveProperty("monthTotal", 9);
            expect(res.body.data).toHaveProperty("quarterTotal", 14);
            expect(res.body.data).toHaveProperty("yearTotal", 20);
            done();
          });
      });

      test("get a specific own different contract request stats by using short id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ shortID: "TUBUTEST2" })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 3);
            expect(res.body.data).toHaveProperty("weekTotal", 5);
            expect(res.body.data).toHaveProperty("monthTotal", 7);
            expect(res.body.data).toHaveProperty("quarterTotal", 10);
            expect(res.body.data).toHaveProperty("yearTotal", 12);
            done();
          });
      });

      test("get a specific own different second contract request stats by using short id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ shortID: "TUBUTEST3" })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 2);
            expect(res.body.data).toHaveProperty("weekTotal", 3);
            expect(res.body.data).toHaveProperty("monthTotal", 5);
            expect(res.body.data).toHaveProperty("quarterTotal", 7);
            expect(res.body.data).toHaveProperty("yearTotal", 13);
            done();
          });
      });

      test("get a specific shared contract request stats by using short id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ shortID: "TUBUTEST4" })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 7);
            expect(res.body.data).toHaveProperty("weekTotal", 11);
            expect(res.body.data).toHaveProperty("monthTotal", 14);
            expect(res.body.data).toHaveProperty("quarterTotal", 16);
            expect(res.body.data).toHaveProperty("yearTotal", 19);
            done();
          });
      });

      test("should not get a specific others contract request stats by using short id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ shortID: "TUBUTEST5" })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
    });

    describe("#applicationID", () => {
      test("get contract request stats by own application id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ applicationID: ownerAppID })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 2);
            expect(res.body.data).toHaveProperty("weekTotal", 5);
            expect(res.body.data).toHaveProperty("monthTotal", 9);
            expect(res.body.data).toHaveProperty("quarterTotal", 14);
            expect(res.body.data).toHaveProperty("yearTotal", 20);
            done();
          });
      });

      test("get contract request stats by own second application id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ applicationID: ownerSecondAppID })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 5);
            expect(res.body.data).toHaveProperty("weekTotal", 8);
            expect(res.body.data).toHaveProperty("monthTotal", 12);
            expect(res.body.data).toHaveProperty("quarterTotal", 17);
            expect(res.body.data).toHaveProperty("yearTotal", 25);
            done();
          });
      });

      test("get contract request stats by own shared application id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ applicationID: sharedAppID })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 7);
            expect(res.body.data).toHaveProperty("weekTotal", 11);
            expect(res.body.data).toHaveProperty("monthTotal", 14);
            expect(res.body.data).toHaveProperty("quarterTotal", 16);
            expect(res.body.data).toHaveProperty("yearTotal", 19);
            done();
          });
      });

      test("get contract request stats by own empty application id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ applicationID: ownerEmptyAppID })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 0);
            expect(res.body.data).toHaveProperty("weekTotal", 0);
            expect(res.body.data).toHaveProperty("monthTotal", 0);
            expect(res.body.data).toHaveProperty("quarterTotal", 0);
            expect(res.body.data).toHaveProperty("yearTotal", 0);
            done();
          });
      });

      test("get contract request stats by other application id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ applicationID: otherAppID })
          .expect(CODE.ERR)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeTruthy();
            expect(err).toBeNil();
            done();
          });
      });
    });

    describe("#networkID", () => {
      test("get contract request stats by network id", async (done) => {
        request(server)
          .get(ServiceStatsPath)
          .set("_uid", ownerUserID)
          .query({ networkID: 999 })
          .expect(CODE.OK)
          .end((err, res) => {
            expect(res.body.error, res.body.message).toBeUndefined();
            expect(err).toBeNil();
            expect(res.body.data).toHaveProperty("todayTotal", 12);
            expect(res.body.data).toHaveProperty("weekTotal", 19);
            expect(res.body.data).toHaveProperty("monthTotal", 26);
            expect(res.body.data).toHaveProperty("quarterTotal", 33);
            expect(res.body.data).toHaveProperty("yearTotal", 44);
            done();
          });
      });
    });
  });
});
