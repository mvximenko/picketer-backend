const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const config = require('config');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const auth = require('../../middleware/auth');
const Invite = require('../../models/Invitation');

// @route   POST api/invite
// @desc    Send invite
// @access  Private

router.post(
  '/',
  // auth,
  check('to', 'Email is required').notEmpty(),
  check('role', 'Role is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const invite = new Invite({ endpoint: uuidv4() });
      await invite.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.get('email'),
          pass: config.get('emailPass'),
        },
      });

      const { to } = req.body;
      const subject = 'Picketer Invitation';
      const text = `Your registration link: https://picketer.netlify.app/invite/${invite.endpoint}`;

      const mailOptions = {
        from: config.get('email'),
        to,
        subject,
        text,
      };

      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.log(error);
          res.status(500).send('Server Error');
        } else {
          console.log('Email sent: ' + info.response);
        }
      });

      res.status(200).send('Invite sent');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
