const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const webpush = require('web-push');
const checkObjectId = require('../../middleware/checkObjectId');
const config = require('config');
const nodemailer = require('nodemailer');
const auth = require('../../middleware/auth');
const roles = require('../../middleware/roles');
const upload = require('../../middleware/multer');
const Report = require('../../models/Report');
const { User } = require('../../models/User');
const { Post } = require('../../models/Post');

// @route   POST api/report
// @desc    Upload report
// @access  Private
router.post('/', auth, upload.array('images', 12), async (req, res) => {
  if (req.files.length === 0) {
    console.log('No file received or invalid file type');
    return res.status(422).send('No file received or invalid file type');
  }

  try {
    const reqFiles = [];
    const url = req.protocol + '://' + req.get('host');

    for (file of req.files) {
      reqFiles.push(url + '/public/' + file.filename);
    }

    const report = new Report({
      images: reqFiles,
      user: req.body.user,
      post: req.body.post,
      title: req.body.title,
      picketer: req.body.picketer,
    });

    const result = await report.save();

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/report
// @desc    Get all reports
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reports = await Report.find().sort({ date: -1 });
    res.status(200).json(reports);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/report/:id
// @desc    Get report by ID
// @access  Private
router.get('/:id', auth, checkObjectId('id'), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }

    const post = await Post.findById(report.post).select(
      '-_id -date -user -__v'
    );
    const user = await User.findById(report.user).select(
      '-_id -password -date -__v'
    );

    if (post === null) {
      return res.json({ ...report.toObject(), ...user.toObject() });
    }

    if (user === null) {
      return res.json({ ...report.toObject(), ...post.toObject() });
    }

    res.json({ ...report.toObject(), ...post.toObject(), ...user.toObject() });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/report/:id
// @desc    Delete report
// @access  Private
router.delete('/:id', auth, roles(['admin']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    report.remove();
    res.status(200).send('OK');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/report/send-report
// @desc    Send report by email
// @access  Private
router.put(
  '/send-report',
  auth,
  roles(['admin']),
  check('to', 'Recipient is required').notEmpty(),
  check('subject', 'Subject is required').notEmpty(),
  check('text', 'Text is required').notEmpty(),
  check('picketer', 'Picketer is required').notEmpty(),
  check('title', 'Picketer is required').notEmpty(),
  check('images', 'Images are required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, text, images, picketer, title } = req.body;

    const attachments = images.map((image, index) => ({
      filename: `${index}.${image.split('.').pop()}`,
      path: `public/${image.split('/').pop()}`,
    }));

    try {
      // Steps to use Gmail:
      // 1. Enable less secure apps
      // https://www.google.com/settings/security/lesssecureapps
      //
      // 2. Disable Captcha temporarily
      // https://accounts.google.com/b/0/displayunlockcaptcha

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.get('email'),
          pass: config.get('emailPass'),
        },
      });

      const mailOptions = {
        from: config.get('email'),
        to,
        subject,
        text,
        attachments,
      };

      transporter.sendMail(mailOptions, async (error, info) => {
        if (error) {
          console.log(error);
          res.status(500).send('Server Error');
        } else {
          console.log('Email sent: ' + info.response);
          res.status(200).send('OK');

          const { subscriptions } = await User.findOne({
            email: picketer,
          }).select('subscriptions');

          for (const subscription of subscriptions) {
            const payload = JSON.stringify({
              title: `✔️Accepted: ${title}`,
              primaryKey: '',
            });
            try {
              await webpush.sendNotification(subscription, payload);
            } catch (err) {
              console.log(err);
            }
          }
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/report/reject-report
// @desc    Reject report
// @access  Private
router.put(
  '/reject-report',
  auth,
  roles(['admin']),
  check('picketer', 'Picketer is required').notEmpty(),
  check('title', 'Picketer is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { picketer, title } = req.body;

    try {
      const { subscriptions } = await User.findOne({ email: picketer }).select(
        'subscriptions'
      );

      for (const subscription of subscriptions) {
        const payload = JSON.stringify({
          title: `❌Rejected: ${title}`,
          primaryKey: '',
        });

        try {
          await webpush.sendNotification(subscription, payload);
        } catch (err) {
          console.log(err);
        }
      }
      res.status(200).send('OK');
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;
