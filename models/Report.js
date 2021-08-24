const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  images: {
    type: Array,
  },
});

module.exports = mongoose.model('report', userSchema);
