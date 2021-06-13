import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import _ from "lodash";
import config from "../../../config";

// Helpers
import mail from "../../helpers/email";
import { createLogger } from "../../helpers/log";
import { successResp, errorResp } from "../../helpers/http_util";

// Models
import UserModel from "../../models/user";
import EmailTokenModel from "../../models/emailToken";
import NetworkModel from "../../models/network";
import ApplicationModel from "../../models/application";

const logger = createLogger("AUT_SER");

const { baseURL } = config;

/**
 * Create JWT by using information of user
 * @param {UserModel} user
 */
function createToken(user) {
  return jwt.sign(
    {
      uid: user.id,
      umail: user.email,
      urole: user.role,
      uusername: user.username,
      uloginTime: Date.now(),
    },
    config.jwt.secret,
    jwt.options
  );
}
/**
 *  Check validity of given token, if not throws error
 * @param {String} token
 */
async function checkTokenValidity(token, type) {
  if (!token) {
    throw new Error("Invalid Token");
  }

  const filter = { token };

  if (type) filter.type = type;

  const EmailToken = await EmailTokenModel.findOne(filter);

  if (!EmailToken) {
    throw new Error("Token not exists");
  }

  if (EmailToken.expired_in <= Date.now()) {
    throw Error("Expired Token");
  }

  return EmailToken;
}

/**
 * Creates EmailToken then send verification email with special template on SendGrid
 */
async function sendVerificationEmail(user) {
  const emailToken = uuidv4();
  const verificationURL = `${baseURL}/email-verification?token=${emailToken}`;

  await EmailTokenModel.create({
    expired_in: Date.now() + 3600 * 1000 * 24 * 15,
    type: "verification",
    token: emailToken,
    user_id: user.id,
  }).then(() => {
    return mail.sendMail({
      sendTo: user.email,
      template: {
        id: "register",
        data: {
          verifyLink: verificationURL,
          name: `${user.name} ${user.surname}`,
        },
      },
    });
  });
}

/**
 * Creates EmailToken then send forgot email with special template on SendGrid
 */
async function sendForgotEmail(user) {
  const emailToken = uuidv4();
  const resetURL = `${baseURL}/reset-password?resetToken=${emailToken}`;

  await EmailTokenModel.create({
    expired_in: Date.now() + 3600 * 1000 * 24 * 15,
    type: "forgot",
    token: emailToken,
    user_id: user.id,
  }).then(() => {
    return mail.sendMail({
      sendTo: user.email,
      template: {
        id: "reset",
        data: {
          resetLink: resetURL,
        },
      },
    });
  });
}

/**
 * Login with username and password
 */
const login = (req, res) => {
  const { username, password } = req.body;

  logger.debug(`login start:`, { username, password });

  UserModel.verify(username, password)
    .then((user) => {
      logger.debug(`login(${username}) :`, user);
      const token = createToken(user);
      successResp(res, {
        token,
        username: user.username,
        role: user.role,
      });
    })
    .catch((err) => {
      logger.error(`login(${username}) :`, err);
      errorResp(res, err);
    });
};

/**
 * Register New User
 */
const register = async (req, res) => {
  const data = req.body;

  logger.debug("register start :", data);

  const control = await UserModel.query({
    where: { username: data.username },
    orWhere: {
      email: data.email,
    },
  }).fetch({ require: false });

  if (control) {
    logger.error("register : Used Username or Email");
    errorResp(res, new Error("Username or Email is already using"));
    return;
  }

  const insertedModel = await UserModel.forge(data)
    .save()
    .catch((err) => {
      errorResp(res, err);
    });

  const user = insertedModel.toJSON();

  sendVerificationEmail(user)
    .then(async () => {
      const token = createToken(user);
      logger.debug("register start :", user);
      const networks = await NetworkModel.query(function queryBuilder(qb) {
        qb.where({
          owner_id: user.id,
        }).orWhere({
          is_public: true,
        });
      }).fetchAll();
      const serializedNetworks = networks.toJSON();
      logger.debug("networks fetch :", serializedNetworks);

      _.forEach(serializedNetworks, async (network) => {
        const createdApp = await ApplicationModel.forge({
          name: "Default Application",
          description: "AutoCreated Application",
          owner_id: user.id,
          network_id: network.id,
        }).save();
        logger.debug("defaultApp create :", createdApp);
      });

      successResp(res, {
        token,
        username: user.username,
        role: user.role,
      });
    })
    .catch((err) => {
      logger.error("register :", err);
      errorResp(res, err);
    });
};

/**
 * Verify an user by checking email token
 */
const verify = async (req, res) => {
  const { token } = req.query;

  logger.debug("verify start: ", token);
  try {
    const EmailToken = await checkTokenValidity(token, "verification");

    UserModel.forge({ id: EmailToken.user_id })
      .save({ is_verified: true }, { method: "update" })
      .then(() => {
        logger.debug("verify: ", token, EmailToken.user_id);
        successResp(res);
      })
      .catch((err) => {
        logger.error(`verify(${verify}) update: `, err);
        errorResp(res, err);
      });
  } catch (err) {
    logger.error(`verify(${verify}): `, err);
    errorResp(res, err);
  }
};

/**
 * Send forgot Token by using user's email
 */
const forgot = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      throw new Error("Invalid email");
    }

    const returnData = await UserModel.where({ email })
      .fetch({ require: false })
      .catch((err) => {
        throw err;
      });

    if (!returnData) {
      throw new Error("Unused email address");
    }

    const currentUser = returnData.toJSON();

    sendForgotEmail(currentUser)
      .then(() => {
        successResp(res);
      })
      .catch((err) => {
        errorResp(res, err);
      });
  } catch (err) {
    errorResp(res, err);
  }
};

/**
 * Change user password by using valid reset token
 */
const changePassword = async (req, res) => {
  const { newPassword, newPasswordSame, resetToken } = req.body;
  logger.debug("changePassword :", req.body);
  try {
    const CurrentResetToken = await checkTokenValidity(resetToken, "forgot");

    if (newPassword.trim() !== newPasswordSame.trim()) {
      throw new Error("Passwords does not match");
    }

    await EmailTokenModel.update(
      { id: CurrentResetToken.id },
      { is_used: true }
    ).catch((err) => {
      throw err;
    });

    UserModel.forge({
      id: CurrentResetToken.user_id,
    })
      .save(
        {
          password: newPassword,
        },
        { method: "update" }
      )
      .then(() => {
        logger.debug("changePassword :", CurrentResetToken.user_id);
        successResp(res);
      })
      .catch((err) => {
        throw err;
      });
  } catch (err) {
    logger.error("changePassword :", err);
    errorResp(res, err);
  }
};

/**
 * Check validity of token
 */
const checkToken = async (req, res) => {
  const { token } = req.body;

  logger.debug("checkToken :", token);
  try {
    await checkTokenValidity(token);
    logger.debug("checkToken :", token, true);
    successResp(res, { status: true });
  } catch (err) {
    logger.debug("checkToken :", token, true, err.message);
    successResp(res, { status: false, message: err.message });
  }
};

export default {
  createToken,
  login,
  register,
  verify,
  forgot,
  changePassword,
  checkToken,
};
