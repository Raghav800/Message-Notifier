const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  userGroup: { type: String, required: true },
});

module.exports = mongoose.model('User', UserSchema);
