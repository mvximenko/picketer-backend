const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriptionSchema = new Schema({
  endpoint: {
    type: String,
  },
  expirationTime: {
    type: Schema.Types.Mixed,
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

module.exports = mongoose.model('subscription', SubscriptionSchema);
