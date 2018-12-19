const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Message = require('../models/message');
const db = require('../db');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config.js');

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 **/

router.post('/login', async function(req, res, next) {
  // TEST PASSED
  try {
    const { username, password } = req.body;
    if (await User.authenticate(username, password)) {
      await User.updateLoginTimestamp(username);
      let token = jwt.sign({ username }, SECRET_KEY);
      return res.json({ token });
    }
    // console.log('This is to check for errors ----------');
    return next({ message: 'Invalid user/password' });
    // return next();
  } catch (err) {
    return res.json(err);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post('/register', async function(req, res, next) {
  // TEST PASSED
  try {
    const { username, password, first_name, last_name, phone } = req.body;

    const registeredUser = await User.register({
      username,
      password,
      first_name,
      last_name,
      phone
    });
    // console.log('registeredUser ', registeredUser);
    let token = jwt.sign({ username }, SECRET_KEY);
    return res.json({ token });
  } catch (err) {
    return res.json(err);
  }
});

module.exports = router;
