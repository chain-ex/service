import { AES, enc } from "crypto-js";
import config from "../../config";

const key = config.cryptoConfig.simetricKey;

function encrypt(text) {
  return AES.encrypt(text, key).toString();
}

function decrypt(text) {
  return AES.decrypt(text, key).toString(enc.Utf8);
}

export default {
  encrypt,
  decrypt,
};
