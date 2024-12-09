const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const nsAdmin_Schema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    profile_img_key: {
      type: String,
      default: ''
    },
    profile_img: {
      type: String,
      default: ''
    },
    isNsAdmin: {
      type: Boolean,
      default: true
    },
    // password reset
    pw_reset_code: {
      type: String
    },
    pw_reset_date: {
      type: Date
    },
  },
  {
    timestamps: true
  }
);

nsAdmin_Schema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

nsAdmin_Schema.pre('findOneAndUpdate', async function (next) {
  const password = this.getUpdate().password;
  if (password) {
    this.getUpdate().password = await bcrypt.hash(password, 10);
  }
  next();
});

nsAdmin_Schema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};


const NsAdmin = mongoose.model('NsAdmin', nsAdmin_Schema)

module.exports = NsAdmin;