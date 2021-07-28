const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const checkObjectId = require('../../middleware/checkObjectId');
const auth = require('../../middleware/auth');
const { Post, ArchivedPost } = require('../../models/Post');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post(
  '/',
  auth,
  check('text', 'Text is required').notEmpty(),
  check('location', 'Location is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        location: req.body.location,
        name: `${user.surname} ${user.name}`,
        user: req.user.id,
      });

      const post = await newPost.save();

      res.json(post);
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
    if (req.query.date) {
      const day = new Date(req.query.date);
      const nextDay = new Date(day.getTime() + 1 * 24 * 60 * 60 * 1000);
      const posts = await Post.find({ date: { $gte: day, $lte: nextDay } });
      res.json(posts);
      return;
    }

    if (req.query.location) {
      const location = new RegExp(req.query.location, 'i');
      const posts = await Post.find({ location });
      res.json(posts);
      return;
    }

    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
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
    const post = await Post.findById(req.query.id);
    const archivedPost = new ArchivedPost(post.toJSON());
    post.remove();
    archivedPost.save();
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
