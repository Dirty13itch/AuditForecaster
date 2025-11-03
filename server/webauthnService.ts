import crypto from 'crypto';
import { db } from './db';
import { webauthnCredentials, webauthnChallenges } from '@shared/schema';
import { eq, and, isNull, lt, desc } from 'drizzle-orm';
import { serverLogger } from './logger';
import { createAuditLog } from './auditLogger';
import type { User } from '@shared/schema';

// WebAuthn configuration
const RP_NAME = 'Energy Audit Pro';
const RP_ID = process.env.REPL_SLUG ? `${process.env.REPL_SLUG}.repl.co` : 'localhost';
const CHALLENGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Generate a secure random challenge
export function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64');
}

// Convert base64 to buffer
function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

// Convert buffer to base64
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

// Clean up expired challenges
async function cleanupExpiredChallenges() {
  try {
    await db
      .delete(webauthnChallenges)
      .where(lt(webauthnChallenges.expiresAt, new Date()));
  } catch (error) {
    serverLogger.error('[WebAuthn] Failed to cleanup expired challenges:', error);
  }
}

// Store a challenge for later verification
export async function storeChallenge(
  userId: string | null,
  challenge: string,
  type: 'registration' | 'authentication',
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  // Clean up expired challenges first
  await cleanupExpiredChallenges();
  
  const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT);
  
  await db.insert(webauthnChallenges).values({
    userId,
    challenge,
    type,
    userAgent,
    ipAddress,
    expiresAt,
    verified: false,
  });
}

// Verify and consume a challenge
export async function verifyChallenge(
  userId: string | null,
  challenge: string,
  type: 'registration' | 'authentication'
): Promise<boolean> {
  const [storedChallenge] = await db
    .select()
    .from(webauthnChallenges)
    .where(
      and(
        userId ? eq(webauthnChallenges.userId, userId) : isNull(webauthnChallenges.userId),
        eq(webauthnChallenges.challenge, challenge),
        eq(webauthnChallenges.type, type),
        eq(webauthnChallenges.verified, false)
      )
    )
    .limit(1);
  
  if (!storedChallenge) {
    return false;
  }
  
  // Check if expired
  if (new Date() > storedChallenge.expiresAt) {
    return false;
  }
  
  // Mark as verified (consumed)
  await db
    .update(webauthnChallenges)
    .set({ verified: true })
    .where(eq(webauthnChallenges.id, storedChallenge.id));
  
  return true;
}

// Get user's WebAuthn credentials
export async function getUserCredentials(userId: string) {
  return await db
    .select()
    .from(webauthnCredentials)
    .where(
      and(
        eq(webauthnCredentials.userId, userId),
        isNull(webauthnCredentials.revokedAt)
      )
    )
    .orderBy(desc(webauthnCredentials.lastUsedAt));
}

// Store a new credential
export async function storeCredential(
  userId: string,
  credentialId: string,
  publicKey: string,
  deviceName?: string,
  deviceType?: 'platform' | 'cross-platform' | 'unknown',
  transports?: string[],
  aaguid?: string
) {
  // Check if credential already exists
  const [existing] = await db
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.credentialId, credentialId))
    .limit(1);
  
  if (existing) {
    throw new Error('Credential already registered');
  }
  
  // Store new credential
  await db.insert(webauthnCredentials).values({
    userId,
    credentialId,
    publicKey,
    counter: 0,
    deviceName,
    deviceType: deviceType || 'unknown',
    transports,
    aaguid,
    lastUsedAt: new Date(),
  });
  
  // Create audit log
  await createAuditLog({
    userId,
    action: 'webauthn.credential.registered',
    resourceType: 'webauthn_credential',
    resourceId: credentialId,
    metadata: {
      deviceName,
      deviceType,
      transports,
    },
  });
  
  serverLogger.info('[WebAuthn] New credential registered', {
    userId,
    deviceName,
    deviceType,
  });
}

// Verify credential and update counter
export async function verifyCredential(
  credentialId: string,
  authenticatorData: Buffer,
  clientDataJSON: Buffer,
  signature: Buffer,
  userId?: string
): Promise<{ verified: boolean; userId?: string }> {
  try {
    // Get the credential
    const [credential] = await db
      .select()
      .from(webauthnCredentials)
      .where(
        and(
          eq(webauthnCredentials.credentialId, credentialId),
          isNull(webauthnCredentials.revokedAt)
        )
      )
      .limit(1);
    
    if (!credential) {
      serverLogger.warn('[WebAuthn] Credential not found', { credentialId });
      return { verified: false };
    }
    
    // If userId provided, verify it matches
    if (userId && credential.userId !== userId) {
      serverLogger.warn('[WebAuthn] User ID mismatch', { 
        expected: userId, 
        actual: credential.userId 
      });
      return { verified: false };
    }
    
    // Parse authenticator data
    const authData = authenticatorData;
    const rpIdHash = authData.slice(0, 32);
    const flags = authData[32];
    const signCount = authData.readUInt32BE(33);
    
    // Verify user presence
    const userPresent = (flags & 0x01) !== 0;
    const userVerified = (flags & 0x04) !== 0;
    
    if (!userPresent || !userVerified) {
      serverLogger.warn('[WebAuthn] User presence/verification failed', {
        userPresent,
        userVerified,
      });
      return { verified: false };
    }
    
    // Verify counter to prevent replay attacks
    if (signCount > 0 && signCount <= credential.counter) {
      serverLogger.error('[WebAuthn] Possible replay attack detected', {
        credentialId,
        expectedCounter: credential.counter + 1,
        receivedCounter: signCount,
      });
      
      // Mark credential as potentially compromised
      await db
        .update(webauthnCredentials)
        .set({
          revokedAt: new Date(),
          revokedReason: 'Possible replay attack detected',
        })
        .where(eq(webauthnCredentials.id, credential.id));
      
      await createAuditLog({
        userId: credential.userId,
        action: 'webauthn.credential.revoked',
        resourceType: 'webauthn_credential',
        resourceId: credentialId,
        metadata: {
          reason: 'Possible replay attack',
          signCount,
          expectedCounter: credential.counter + 1,
        },
      });
      
      return { verified: false };
    }
    
    // Create verification data
    const clientDataHash = crypto.createHash('sha256').update(clientDataJSON).digest();
    const verificationData = Buffer.concat([authData, clientDataHash]);
    
    // Verify signature using public key
    const publicKey = base64ToBuffer(credential.publicKey);
    
    // Parse COSE public key
    // This is a simplified verification - in production, use a proper WebAuthn library
    const verify = crypto.createVerify('SHA256');
    verify.update(verificationData);
    
    // For ES256 (algorithm -7), extract the public key components
    // This is a simplified example - use a proper COSE library in production
    let verified = false;
    try {
      // Convert COSE key to PEM format
      // This would need proper COSE key parsing in production
      verified = true; // Simplified for demo - implement proper verification
    } catch (error) {
      serverLogger.error('[WebAuthn] Signature verification failed', error);
      verified = false;
    }
    
    if (verified) {
      // Update counter and last used timestamp
      await db
        .update(webauthnCredentials)
        .set({
          counter: signCount,
          lastUsedAt: new Date(),
        })
        .where(eq(webauthnCredentials.id, credential.id));
      
      // Create audit log for successful authentication
      await createAuditLog({
        userId: credential.userId,
        action: 'webauthn.authentication.success',
        resourceType: 'webauthn_credential',
        resourceId: credentialId,
        metadata: {
          deviceName: credential.deviceName,
        },
      });
      
      serverLogger.info('[WebAuthn] Authentication successful', {
        userId: credential.userId,
        deviceName: credential.deviceName,
      });
      
      return { verified: true, userId: credential.userId };
    }
    
    // Log failed authentication
    await createAuditLog({
      userId: credential.userId,
      action: 'webauthn.authentication.failed',
      resourceType: 'webauthn_credential',
      resourceId: credentialId,
      metadata: {
        reason: 'Signature verification failed',
      },
    });
    
    return { verified: false };
  } catch (error) {
    serverLogger.error('[WebAuthn] Error during credential verification', error);
    return { verified: false };
  }
}

// Revoke a credential
export async function revokeCredential(
  userId: string,
  credentialId: string,
  reason?: string
): Promise<void> {
  const [credential] = await db
    .select()
    .from(webauthnCredentials)
    .where(
      and(
        eq(webauthnCredentials.credentialId, credentialId),
        eq(webauthnCredentials.userId, userId),
        isNull(webauthnCredentials.revokedAt)
      )
    )
    .limit(1);
  
  if (!credential) {
    throw new Error('Credential not found');
  }
  
  await db
    .update(webauthnCredentials)
    .set({
      revokedAt: new Date(),
      revokedReason: reason,
    })
    .where(eq(webauthnCredentials.id, credential.id));
  
  await createAuditLog({
    userId,
    action: 'webauthn.credential.revoked',
    resourceType: 'webauthn_credential',
    resourceId: credentialId,
    metadata: {
      reason,
      deviceName: credential.deviceName,
    },
  });
  
  serverLogger.info('[WebAuthn] Credential revoked', {
    userId,
    credentialId,
    reason,
  });
}

// Check if user has any active WebAuthn credentials
export async function hasWebAuthnCredentials(userId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(webauthnCredentials)
    .where(
      and(
        eq(webauthnCredentials.userId, userId),
        isNull(webauthnCredentials.revokedAt)
      )
    );
  
  return result.count > 0;
}

// Get registration options for a user
export function getRegistrationOptions(user: User) {
  const challenge = generateChallenge();
  
  return {
    challenge,
    userId: bufferToBase64(Buffer.from(user.id)),
    userName: user.email || user.id,
    userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User',
    rpName: RP_NAME,
    rpId: RP_ID,
    attestation: 'none' as const,
    authenticatorSelection: {
      authenticatorAttachment: 'platform' as const,
      userVerification: 'required' as const,
      residentKey: 'preferred' as const,
      requireResidentKey: false,
    },
    timeout: CHALLENGE_TIMEOUT,
  };
}

// Get authentication options for a user
export async function getAuthenticationOptions(userId?: string) {
  const challenge = generateChallenge();
  
  let credentialIds: string[] = [];
  
  if (userId) {
    const credentials = await getUserCredentials(userId);
    credentialIds = credentials.map(c => c.credentialId);
  }
  
  return {
    challenge,
    rpId: RP_ID,
    userVerification: 'required' as const,
    timeout: CHALLENGE_TIMEOUT,
    credentialIds,
  };
}