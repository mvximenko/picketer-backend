const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: 'posts',
  },
  title: {
    type: String,
  },
  picketer: {
    type: String,
  },
  images: {
    type: Array,
    default: [],
  },
  status: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('report', userSchema);
