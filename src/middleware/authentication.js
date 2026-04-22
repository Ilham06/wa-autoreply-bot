import jwt from 'jsonwebtoken';
import { env } from '../config/app.js';

export function authentication(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email
    };
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
}
