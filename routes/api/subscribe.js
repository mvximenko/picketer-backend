const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Subscription = require('../../models/Subscription');

// @route   POST api/subscribe
// @desc    Subscribe user to push notifications
// @access  Public
router.post(
  '/',
  check('endpoint', 'Endpoint is required').notEmpty(),
  check('expirationTime', 'Expiration Time is required').notEmpty(),
  check('keys', 'Keys are required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req.body);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const subscription = new Subscription({
        endpoint: req.body.endpoint,
        expirationTime: req.body.expirationTime,
        keys: req.body.keys,
      });

      await subscription.save();

      res.status(200).send('Subscription created');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
