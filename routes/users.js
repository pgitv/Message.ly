const express = require('express');
const router = express.Router();
const user = require('../models/user');
const { ensureLoggedIn, ensureCorrectUser } = require('../middleware/auth');

/** GET / - get list of users.
 *
 * => {users: [{username, first_name, last_name, phone}, ...]}
 *
 **/

router.get('/', ensureLoggedIn, async function(req, res, next) {
  // TEST PASSED
  return res.json({ users: await user.all() });
});

/** GET /:username - get detail of users.
 *
 * => {user: {username, first_name, last_name, phone, join_at, last_login_at}}
 *
 **/

router.get('/:username', ensureCorrectUser, async function(req, res, next) {
  // TEST PASSED
  return res.json({ user: await user.get(req.params.username) });
});

/** GET /:username/to - get messages to user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 from_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/

router.get('/:username/to', ensureCorrectUser, async function(req, res, next) {
  // console.log('This is in /:username/to -------');
  return res.json({ messages: await user.messagesTo(req.params.username) });
});

/** GET /:username/from - get messages from user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 to_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/

router.get('/:username/from', ensureCorrectUser, async function(
  req,
  res,
  next
) {
  return res.json({ messages: await user.messagesFrom(req.params.username) });
});

module.exports = router;
