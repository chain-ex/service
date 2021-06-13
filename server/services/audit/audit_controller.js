import AuditModel from "../../models/audit";
import config from "../../../config";

// const { CODE } = config;

function scanRequest(req, res, next) {
  res.on("finish", () => {
    const { statusCode } = res;
    const {
      method,
      userData: { uid = 0 } = {},
      headers,
      originalUrl,
      body,
      query,
      ip,
      connection,
    } = req;

    const possibleIP =
      headers["x-forwarded-for"] ||
      headers["X-Forwarded-For"] ||
      headers.RemoteIPHeader ||
      connection.remoteAddress ||
      ip;
    // eslint-disable-next-line camelcase
    const [ip_address] = possibleIP.split(",");

    AuditModel.create({
      url: originalUrl,
      method,
      body,
      query,
      user_agent: headers["user-agent"],
      user_id: uid,
      status: statusCode,
      ip_address,
    })
      .then()
      .catch((err) => {
        console.error(err);
      });
  });
  next();
}

export default { scanRequest };
