import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/app.js';

const TOKEN_EXPIRES_IN = '7d';

export async function register(req, res) {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash
    }
  });

  const token = jwt.sign(
    { email: user.email },
    env.jwtSecret,
    { subject: user.id, expiresIn: TOKEN_EXPIRES_IN }
  );

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}

export async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  const token = jwt.sign(
    { email: user.email },
    env.jwtSecret,
    { subject: user.id, expiresIn: TOKEN_EXPIRES_IN }
  );

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
}
