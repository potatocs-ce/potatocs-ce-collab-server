
const walletSchema = require("../models/wallet_schema");


const encoding = 'utf8';


class MongoWallet {
  /**
   * Create a wallet instance backed by a given store. This can be used to create a wallet using your own
   * custom store implementation.
   * @param {module:fabric-network.WalletStore} store Backing store implementation.
   */

  constructor() {
    //  this.providerRegistry = IdentityProviderRegistry.newDefaultProviderRegistry();
    //  this.store = store;
  }
  async delete(label) {

  }
  async get(userId) {
    const dbModels = global.DB_MODELS;
    try {

      let res = await dbModels.Wallet.find({ user: userId });
      if (res.length !== 0) {
        console.log("-------in if---------")
        return Buffer.from(JSON.stringify(res[0]), encoding);
      }

      return undefined;
      // await this.store.put(label, buffer);
    } catch (err) {
      console.log("err get user", err)
      return undefined;
    }
  }
  async list() {
    try {
      let res = await walletSchema.find()
      //   console.log("get all result ", res)
      return res;
    } catch (err) {
      console.log("err all getuser", err)
      return undefined;
    }
  }

  async getAdmin(mspId) {
    try {
      // Check if an admin with the specified mspId exists
      const foundAdmin = await walletSchema.findOne({ mspId, role: 'admin' });
      console.log("Admin existence check: ", foundAdmin);
      return foundAdmin;
    } catch (err) {
      console.log("Error checking admin existence", err);
      return undefined; // or return false, depending on how you want to handle errors
    }
  }
  async put(label, data) {
    // Ensure data is a string before parsing
    const dbModels = global.DB_MODELS;
    const stringData = data.toString(encoding);
    const jsonData = JSON.parse(stringData);

    // Wallet class의 put() 함수에서 인자값을 통해 role을 가져올 수 없어서
    // DB에서 가져온다
    try {
      const foundUser = await dbModels.User.findById({ _id: label }).lean();
      if (!foundUser) {
        console.log("No admin found for the given ID:", label);
        return;
      }

      const input = {
        user: label,
        role: foundUser.auth === "admin" ? "admin" : "client",
        org: jsonData.mspId,
        credentials: jsonData.credentials,
        mspId: jsonData.mspId,
        version: jsonData.version,
        type: jsonData.type
      };

      console.log("input put method custom", input);

      const user = new walletSchema(input);
      const res = await user.save();
      // console.log("creted result ", res)
      return true;
    } catch (err) {
      console.log("err ", err)
      return false;
    }
  }
}

module.exports.MongoWallet = MongoWallet
