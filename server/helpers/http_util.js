import config from "../../config";

const { CODE } = config;

/**
 * Return success response with data
 * @param {object} res Express response
 * @param {object} data Response Data
 * @param {CODE} code Response Status, default 'OK'
 * @param {string} message Response Status, default 'ERR'
 */
function successResp(res, data = {}, code = "OK", message = "OK") {
  return res.status(CODE[code]).json({
    data,
    message,
  });
}

/**
 * Return success response with data
 * @param {object} res Express response
 * @param {object} data Response Data to extend return data
 * @param {CODE} code Response Status, default 'OK'
 */
function successRespExtend(res, data = {}, code = "OK") {
  return res.status(CODE[code]).json({
    ...data,
  });
}

/**
 * Return error response with error
 * @param {object} res Express response
 * @param {error} err Error
 * @param {CODE} code Response Status, default 'ERR'
 */
function errorResp(res, err, code = "ERR") {
  return res.status(CODE[code]).json({
    error: err,
    message: err.message,
  });
}

export { successResp, errorResp, successRespExtend };
