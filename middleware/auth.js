/** Middleware for handling req authorization for routes. */

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config.js');
const message = require('../models/message');

/** Middleware: Requires user is logged in. */

function ensureLoggedIn(req, res, next) {
  try {
    const token = req.body._token || req.query._token;
    let { username } = jwt.verify(token, SECRET_KEY);
    // put username on request as a convenience for routes
    req.username = username;
    return next();
  } catch (err) {
    return next({ status: 401, message: 'Unauthorized' });
  }
}

/** Middleware: Requires :username is logged in. */

function ensureCorrectUser(req, res, next) {
  try {
    const token = req.body._token || req.query._token;
    const payload = jwt.verify(token, SECRET_KEY);
    if (payload.username === req.params.username) {
      // put username on request as a convenience for routes
      req.username = payload.username;
      return next();
    } else {
      throw new Error();
    }
  } catch (err) {
    return next({ status: 401, message: 'Unauthorized' });
  }
}

async function ensureSenderRecipient(req, res, next) {
  try {
    const token = req.body._token || req.query._token;

    const payload = jwt.verify(token, SECRET_KEY);
    const messageDetails = await message.get(req.params.id);

    if (
      payload.username === messageDetails.from_user.username ||
      payload.username === messageDetails.to_user.username
    ) {
      return next();
    } else {
      throw new Error();
    }
  } catch (err) {
    return next({ status: 401, message: 'Unauthorized' });
  }
}

async function ensureRecipient(req, res, next) {
  try {
    const token = req.body._token || req.query._token;

    const payload = jwt.verify(token, SECRET_KEY);
    const messageDetails = await message.get(req.params.id);

    if (payload.username === messageDetails.to_user.username) {
      return next();
    } else {
      throw new Error();
    }
  } catch (err) {
    return next({ status: 401, message: 'Unauthorized' });
  }
}

module.exports = {
  ensureLoggedIn,
  ensureCorrectUser,
  ensureSenderRecipient,
  ensureRecipient
};
