const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const config = require('config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const auth = require('../../middleware/auth');
const Invitation = require('../../models/Invitation');
const { User } = require('../../models/User');

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

    const { to, role } = req.body;

    try {
      const invitation = new Invitation({ endpoint: uuidv4(), role });
      await invitation.save();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.get('email'),
          pass: config.get('emailPass'),
        },
      });

      const subject = 'Picketer Invitation';
      const text = `Your registration link: https://picketer.netlify.app/invite/${invitation.endpoint}`;

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

      res.status(200).send('Invitation sent');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/invite
// @desc    Register user using invitation
// @access  Public
router.post(
  '/register/:id',
  check('name', 'Name is required').notEmpty(),
  check('surname', 'Surname is required').notEmpty(),
  check('patronymic', 'Patronymic is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check(
    'password',
    'Please enter a password with 6 or more characters'
  ).isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const invitation = await Invitation.findOne({ endpoint: req.params.id });

    if (!invitation) {
      return res.status(200).send('Invitation is not valid');
    }

    try {
      const { role } = invitation;
      const { name, surname, patronymic, email, password } = req.body;

      let user = await User.findOne({ email });

      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      user = new User({ name, surname, patronymic, role, email, password });

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(password, salt);

      await user.save();

      const payload = {
        user: {
          id: user.id,
        },
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );

      res.status(200).send('User created');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
