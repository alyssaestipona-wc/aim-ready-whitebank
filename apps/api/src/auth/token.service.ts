import { createHmac, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  pendingTokenPayloadSchema,
  sessionTokenPayloadSchema,
} from '@aim-ready/contracts';

import type {
  PendingTokenPayload,
  SessionTokenPayload,
} from '@aim-ready/contracts';

/**
 * A minimal HS256 JWT (compact JWS serialization): standard primitives
 * (HMAC-SHA256, constant-time signature comparison), no external library.
 * Each of this build's three frontend apps keeps its own, near-identical
 * verify-only copy in its own `src/lib/session-token.ts` (see design.md) -
 * duplicated rather than shared through `packages/contracts`, since that
 * package is also imported by client-side form code and must stay free of
 * `node:crypto`, which only this app and each frontend's server-only
 * `proxy.ts` may use.
 */

const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const PENDING_TTL_SECONDS = 5 * 60; // 5 minutes, for the staff/admin code step

function secret(): string {
  return process.env.AUTH_JWT_SECRET ?? 'dev-only-insecure-secret-change-me';
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function sign(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('base64url');
}

function encode(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.${sign(`${header}.${body}`, secret())}`;
}

function decode(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts as [string, string, string];
  const expected = sign(`${header}.${body}`, secret());
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted))
    return null;
  try {
    return JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function verifyAndCheckExpiry(
  token: string,
  expectedTyp: 'session' | 'pending',
): Record<string, unknown> | null {
  const payload = decode(token);
  if (!payload) return null;
  if (payload['typ'] !== expectedTyp) return null;
  const exp = payload['exp'];
  if (typeof exp !== 'number' || Math.floor(Date.now() / 1000) >= exp)
    return null;
  return payload;
}

@Injectable()
export class TokenService {
  signSession(claims: Omit<SessionTokenPayload, 'iat' | 'exp'>): string {
    const iat = Math.floor(Date.now() / 1000);
    return encode({
      ...claims,
      typ: 'session',
      iat,
      exp: iat + SESSION_TTL_SECONDS,
    });
  }

  signPending(claims: Omit<PendingTokenPayload, 'iat' | 'exp'>): string {
    const iat = Math.floor(Date.now() / 1000);
    return encode({
      ...claims,
      typ: 'pending',
      iat,
      exp: iat + PENDING_TTL_SECONDS,
    });
  }

  /** Returns the session payload, or null for a missing, tampered, expired, or wrong-type token. */
  verifySession(token: string): SessionTokenPayload | null {
    const payload = verifyAndCheckExpiry(token, 'session');
    if (!payload) return null;
    const parsed = sessionTokenPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  }

  /** Returns the pending-attempt payload, or null for a missing, tampered, expired, or wrong-type token. */
  verifyPending(token: string): PendingTokenPayload | null {
    const payload = verifyAndCheckExpiry(token, 'pending');
    if (!payload) return null;
    const parsed = pendingTokenPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  }
}
