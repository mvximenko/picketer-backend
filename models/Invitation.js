const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvitationSchema = new Schema({
  endpoint: {
    type: String,
  },
  role: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
});

InvitationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days * 24 hours * 60 minutes * 60 seconds

module.exports = mongoose.model('invitation', InvitationSchema);
