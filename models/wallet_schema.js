
const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); 

const wallet_Schema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    role: {
      // admin, client <= client는 유저다.
      type: String, required: true
    },
    credentials: {
      certificate: { type: String, required: true },
      privateKey: { type: String, required: true }
    },
    mspId: { type: String, required: true },
    type: { type: String, required: true },
    version: { type: Number, required: true },
  },
  {
    timestamps: true
  }
);


const Wallet = mongoose.model('Wallet', wallet_Schema)

module.exports = Wallet;