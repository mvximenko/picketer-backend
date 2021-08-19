const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const config = require('config');

webpush.setVapidDetails(
  'mailto:@test.com',
  config.get('publicVapidKey'),
  config.get('privateVapidKey')
);

// @route   POST api/subscribe
// @desc    Subscribe user to push notifications
// @access  Private
router.post('/', async (req, res) => {
  try {
    const subscription = req.body;
    res.status(500).send('Subscription created');
    const payload = JSON.stringify({ title: 'Push Test' });
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
