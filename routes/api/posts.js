const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const webpush = require('web-push');
const config = require('config');
const checkObjectId = require('../../middleware/checkObjectId');
const auth = require('../../middleware/auth');
const { Post, ArchivedPost } = require('../../models/Post');
const { User } = require('../../models/User');
const Subscription = require('../../models/Subscription');

webpush.setVapidDetails(
  'mailto:@test.com',
  config.get('publicVapidKey'),
  config.get('privateVapidKey')
);

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post(
  '/',
  auth,
  check('title', 'Title is required').notEmpty(),
  check('location', 'Location is required').notEmpty(),
  check('description', 'Description is required').notEmpty(),
  check('picketer').optional(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        title: req.body.title,
        location: req.body.location,
        description: req.body.description,
        name: `${user.surname} ${user.name}`,
        user: req.user.id,
        picketer: req.body.picketer,
      });

      const post = await newPost.save();

      res.json(post);

      const { _id } = post;
      const subscriptions = await Subscription.find({}).select('-__v');

      for (const subscription of subscriptions) {
        const { _id: subId, _doc } = subscription;

        const payload = JSON.stringify({
          title: 'New Event',
          primaryKey: `posts/${_id}`,
        });

        try {
          await webpush.sendNotification(_doc, payload);
        } catch (err) {
          await Subscription.findById(subId).deleteOne();
        }
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/posts
// @desc    Get posts for a specific date
//          Get posts for a specific location
//          Get all posts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { value } = req.query;
    const day = new Date(value);
    valid = !isNaN(day.valueOf()) && value.length === 10;

    if (valid) {
      const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const posts = await Post.find({ date: { $gte: day, $lte: nextDay } });
      res.json(posts);
    } else if (value) {
      const location = new RegExp(value, 'i');
      const posts = await Post.find({ location });
      res.json(posts);
    } else {
      const posts = await Post.find().sort({ date: -1 });
      res.json(posts);
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts/archive
// @desc    Get all archived posts
// @access  Private
router.get('/archive', auth, async (req, res) => {
  try {
    const archivedPosts = await ArchivedPost.find().sort({ date: -1 });
    res.json(archivedPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/archive
// @desc    Move post to archive
// @access  Private
router.put('/archive', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.body.id);
    const archivedPost = new ArchivedPost(post.toJSON());
    post.remove();
    archivedPost.save();
    res.status(200).send('OK');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/post
// @desc    Edit post as admin
// @access  Private
router.put(
  '/post',
  auth,
  check('title', 'Title is required').notEmpty(),
  check('location', 'Location is required').notEmpty(),
  check('description', 'Description is required').notEmpty(),
  check('picketer').optional(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { _id, title, location, picketer, description } = req.body;

    try {
      let post = await Post.findById(_id);

      post.title = title;
      post.location = location;
      post.picketer = picketer;
      post.description = description;

      await post.save();
      res.status(200).send('OK');
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route   PUT api/posts/picketer
// @desc    Add picketer
// @access  Private
router.put(
  '/picketer',
  auth,
  check('id', 'ID is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id, email } = req.body;

    try {
      let post = await Post.findById(id);
      post.picketer = email;

      await post.save();
      res.status(200).send('OK');
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: 'Server error' });
    }
  }
);

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await post.remove();

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
