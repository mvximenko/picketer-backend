const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  endpoint: {
    type: String,
  },
  expirationTime: {
    type: mongoose.Schema.Types.Mixed,
  },
  keys: {
    p256dh: {
      type: String,
    },
    auth: {
      type: String,
    },
  },
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  surname: {
    type: String,
    required: true,
  },
  patronymic: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  subscriptions: {
    type: [SubscriptionSchema],
    default: [],
  },
});

module.exports = {
  User: mongoose.model('user', UserSchema),
  ArchivedUser: mongoose.model('archived_user', UserSchema),
};
