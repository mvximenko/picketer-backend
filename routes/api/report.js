const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const checkObjectId = require('../../middleware/checkObjectId');
const config = require('config');
const nodemailer = require('nodemailer');
const auth = require('../../middleware/auth');
const roles = require('../../middleware/roles');
const upload = require('../../middleware/multer');
const Report = require('../../models/Report');

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
    const reports = await Report.find();
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

    res.json(report);
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
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, subject, text } = req.body;

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
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          res.status(500).send('Server Error');
        } else {
          console.log('Email sent: ' + info.response);
          res.status(200).send('OK');
        }
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;