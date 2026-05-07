const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change_me_in_production';
const EXPIRY  = '7d';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
