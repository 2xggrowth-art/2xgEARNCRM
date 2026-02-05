import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload } from './types';
import { logger } from './logger';

// Lazy-load JWT_SECRET to avoid runtime errors during build
let _jwtSecret: string | null = null;

function getJWTSecret(): string {
  if (_jwtSecret !== null) {
    return _jwtSecret;
  }

  const secret = process.env.JWT_SECRET;

  // During build, allow placeholder for compilation
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    _jwtSecret = secret || 'build-time-placeholder-secret';
    return _jwtSecret;
  }

  // At runtime, require valid secret
  if (!secret) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is required but not set. Application cannot start without it.');
  }

  _jwtSecret = secret;
  return _jwtSecret;
}

const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 10;

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJWTSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
    return decoded;
  } catch (error) {
    logger.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get OTP expiry time (5 minutes from now)
 */
export function getOTPExpiry(): Date {
  return new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate phone number format (10 digits)
 */
export function isValidPhone(phone: string): boolean {
  return /^[0-9]{10}$/.test(phone);
}

/**
 * Validate name format (at least 2 characters)
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

/**
 * Validate PIN format (4 digits)
 */
export function isValidPIN(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin);
}

/**
 * Hash a PIN using bcrypt
 */
export async function hashPIN(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
