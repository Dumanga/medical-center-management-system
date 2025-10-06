import { SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'mcms_session';

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(admin) {
  return new SignJWT({ sub: admin.id, username: admin.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifySessionToken(token) {
  try {
    const result = await jwtVerify(token, getSecretKey());
    return result.payload;
  } catch (error) {
    return null;
  }
}

export function getSessionCookieConfig() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

export { SESSION_COOKIE };
