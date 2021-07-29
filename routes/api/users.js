const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const config = require('config');
const { User, ArchivedUser } = require('../../models/User');
const auth = require('../../middleware/auth');
const checkObjectId = require('../../middleware/checkObjectId');

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post(
  '/',
  check('name', 'Name is required').notEmpty(),
  check('surname', 'Surname is required').notEmpty(),
  check('patronymic', 'Patronymic is required').notEmpty(),
  check('role', 'Role is required').notEmpty(),
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

    const { name, surname, patronymic, role, email, password } = req.body;

    try {
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
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/users
// @desc    Get users for a specific surname, name and patronymic
//          Get all users
// @access  Public
router.get('/', async (req, res) => {
  try {
    if (req.query.name) {
      const agg = User.aggregate([
        {
          $addFields: {
            new_name: {
              $concat: ['$surname', ' ', '$name', ' ', '$patronymic'],
            },
          },
        },
        {
          $match: {
            new_name: new RegExp(`${req.query.name}`, 'i'),
          },
        },
        {
          $project: {
            new_name: 0,
            password: 0,
            __v: 0,
          },
        },
      ]);

      const users = await agg.exec();
      res.json(users);
      return;
    }

    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/archive
// @desc    Get all archived users
// @access  Private
router.get('/archive', auth, async (req, res) => {
  try {
    const archivedUsers = await ArchivedUser.find().sort({ date: -1 });
    res.json(archivedUsers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/users/archive
// @desc    Move user to archive
// @access  Private
router.put('/archive', auth, async (req, res) => {
  try {
    const user = await User.findById(req.query.id);
    const archivedUser = new ArchivedUser(user.toJSON());
    user.remove();
    archivedUser.save();
    res.status(200).send('OK');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/users/user/:user_id
// @desc    Get user by ID
// @access  Public
router.get(
  '/user/:user_id',
  checkObjectId('user_id'),
  async ({ params: { user_id } }, res) => {
    try {
      const user = await User.findOne({ _id: user_id }).select('-password');

      if (!user) return res.status(400).json({ msg: 'User not found' });

      return res.json(user);
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route   PUT api/users/user
// @desc    Edit user info as admin
// @access  Private
router.put(
  '/user',
  auth,
  check('name', 'Name is required').notEmpty(),
  check('surname', 'Surname is required').notEmpty(),
  check('patronymic', 'Patronymic is required').notEmpty(),
  check('role', 'Role is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Please enter a password with 6 or more characters')
    .optional()
    .isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, surname, patronymic, role, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user.email !== email) {
        return res
          .status(409)
          .json({ errors: [{ msg: 'This email is already registered' }] });
      }

      user.name = name;
      user.surname = surname;
      user.patronymic = patronymic;
      user.role = role;
      user.email = email;

      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();

      res.status(200).send('OK');
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route   DELETE api/users/user
// @desc    Delete user
// @access  Private
router.delete('/user', auth, async (req, res) => {
  try {
    await User.findOneAndRemove({ _id: req.user.id });
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
