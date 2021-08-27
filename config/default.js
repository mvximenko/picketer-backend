require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  publicVapidKey: process.env.PUBLIC_VAPID_KEY,
  privateVapidKey: process.env.PRIVATE_VAPID_KEY,
  email: process.env.EMAIL,
  emailPass: process.env.EMAIL_PASS,
};
