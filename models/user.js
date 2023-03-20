const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  provider: String,
  providerId: String,
  displayName: String,
  email: String,
  accessToken: String
});

module.exports = mongoose.model('User', UserSchema);
