const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const upload = require('../../middleware/multer');
const Report = require('../../models/Report');

// @route   POST api/report
// @desc    Upload report
// @access  Private
router.post('/', auth, upload.array('images', 12), async (req, res) => {
  try {
    const reqFiles = [];
    const url = req.protocol + '://' + req.get('host');

    for (file of req.files) {
      reqFiles.push(url + '/public/' + file.filename);
    }

    const report = new Report({ images: reqFiles });
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

module.exports = router;
