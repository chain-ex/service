import crypto from "../helpers/crypto";
import db from "../../db";

const bookshelf = require("bookshelf")(db);

const beforeSave = (contract) => {
  contract.owner_privatekey = crypto.encrypt(contract.owner_privatekey);
};

const Contract = bookshelf.model("Contract", {
  initialize() {
    this.constructor.__super__.initialize.apply(this, arguments);

    this.on("creating", this.validateSave);
  },
  tableName: "contracts",
  validateSave() {
    return beforeSave(this.attributes);
  },
});

export default Contract;

// async function contractMethod({
//   userID,
//   shortID,
//   tag = "",
//   method,
//   args,
//   account,
//   type = "send",
// }) {
//   if (!shortID) {
//     throw new Error("Invalid Contract Short ID");
//   }
//   if (!method) {
//     throw new Error("Invalid Contract Method");
//   }
//   if (type !== "send" && type !== "call") {
//     throw new Error("Invalid Type");
//   }

//   // Contract Model
//   // eslint-disable-next-line camelcase
//   const result = await this.find({
//     filters: {
//       short_id: shortID,
//       owner_id: userID,
//     },
//     selectableFields: [
//       // "abi",
//       // "contract_address",
//       "network_id",
//       "owner_privatekey",
//       "owner_address",
//     ],
//   }).then();

//   // Contract Version
//   // ShortID (-) -> tag?
//   // orderBy created_at .first()
//   // "abi",
//   // "contract_address",
//   let versionResult;
//   if (tag === "") {
//     await ContractVersionModel.getTable()
//       .select()
//       .where({
//         short_id: shortID,
//       })
//       .orderBy("updated_at", "desc")
//       .then((sortedVersions) => {
//         versionResult = sortedVersions[0];
//       });
//   } else {
//     await ContractVersionModel.getTable()
//       .select()
//       .where({
//         short_id: shortID,
//         tag,
//       })
//       .then((contractArray) => {
//         versionResult = contractArray[0];
//       });
//   }

//   if (result.length === 0 || Object.keys(versionResult).length === 0) {
//     throw new Error("Contract does not exist");
//   }

//   const [
//     // eslint-disable-next-line camelcase
//     { network_id, owner_privatekey, owner_address },
//   ] = result;
//   // eslint-disable-next-line camelcase
//   const { abi, contract_address } = versionResult;
//   const currentWeb3 = await NetworkModel.getWeb3(network_id);

//   const currentContract = new currentWeb3.eth.Contract(
//     JSON.parse(abi),
//     contract_address
//   );

//   // eslint-disable-next-line camelcase
//   let senderAddress = owner_address;
//   // Check account address, if is not defined use owner address as a default value
//   if (account) {
//     const currentAccount = await ContractAccountModel.findOne(
//       {
//         address: account,
//       },
//       ["address", "private_key"]
//     );
//     if (!currentAccount) {
//       throw new Error("Account is wrong");
//     }

//     currentWeb3.eth.accounts.wallet.add(
//       crypto.decrypt(currentAccount.private_key)
//     );

//     senderAddress = currentAccount.address;
//   } else {
//     currentWeb3.eth.accounts.wallet.add(crypto.decrypt(owner_privatekey));
//   }

//   // method(args).send() or .call()
//   return async (options = {}) => {
//     const [intReq] = await IntegrationRequest.create({
//       user_id: userID,
//       short_id: shortID,
//       inputs: JSON.stringify(args),
//       type,
//       method,
//     });

//     return {
//       cMethod: currentContract.methods[method].apply(this, args)[type]({
//         gas: type === "send" ? 800000000 : undefined,
//         from: senderAddress,
//         ...options,
//       }),
//       updateRequest({ outputs, events, status }) {
//         IntegrationRequest.update(
//           {
//             id: intReq.id,
//           },
//           {
//             outputs,
//             events,
//             status,
//           }
//         ).catch((err) => {
//           throw err;
//         });
//       },
//     };
//   };
// }
