import { useState, useCallback } from 'react';

interface WebAuthnCredential {
  id: string;
  publicKey: string;
  algorithm: string;
}

interface WebAuthn {
  isSupported: boolean;
  isPlatformAvailable: boolean;
  isRegistering: boolean;
  isEnrolling: boolean;
  isAuthenticating: boolean;
  credentials: WebAuthnCredential[] | null;
  credentialsLoading: boolean;
  hasWebAuthnCredentials: () => boolean;
  register: (username: string) => Promise<WebAuthnCredential | null>;
  enrollBiometric: (deviceName: string) => Promise<WebAuthnCredential | null>;
  authenticate: (credentialId?: string) => Promise<boolean>;
  authenticateBiometric: (credentialId?: string) => Promise<boolean>;
  error: string | null;
}

/**
 * Custom hook for WebAuthn authentication (biometric/security key)
 */
export function useWebAuthn(): WebAuthn {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [credentials, setCredentials] = useState<WebAuthnCredential[] | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if WebAuthn is supported
  const isSupported = typeof window !== 'undefined' && 
    window.PublicKeyCredential !== undefined;

  // Check if platform authenticator is available
  const isPlatformAvailable = isSupported && 
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== undefined;

  const register = useCallback(async (username: string): Promise<WebAuthnCredential | null> => {
    if (!isSupported) {
      setError('WebAuthn is not supported in this browser');
      return null;
    }

    setIsRegistering(true);
    setError(null);

    try {
      // Get registration options from server
      const optionsResponse = await fetch('/api/auth/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();

      // Convert base64 strings to ArrayBuffers
      options.challenge = base64ToArrayBuffer(options.challenge);
      options.user.id = base64ToArrayBuffer(options.user.id);

      // Create credentials
      const credential = await navigator.credentials.create({
        publicKey: options,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create credentials');
      }

      // Send credential to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: arrayBufferToBase64((credential.response as AuthenticatorAttestationResponse).clientDataJSON),
            attestationObject: arrayBufferToBase64((credential.response as AuthenticatorAttestationResponse).attestationObject),
          },
        }),
        credentials: 'include',
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify credentials');
      }

      const result = await verifyResponse.json();
      return result.credential;
    } catch (err: any) {
      const errorMessage = err.message || 'WebAuthn registration failed';
      setError(errorMessage);
      console.error('WebAuthn registration error:', err);
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, [isSupported]);

  // Alias for BiometricEnrollmentPrompt component
  const enrollBiometric = useCallback(async (deviceName: string): Promise<WebAuthnCredential | null> => {
    setIsEnrolling(true);
    const result = await register(deviceName);
    setIsEnrolling(false);
    return result;
  }, [register]);

  // Function to check if user has credentials
  const hasWebAuthnCredentials = useCallback(() => {
    return credentials !== null && credentials.length > 0;
  }, [credentials]);

  const authenticate = useCallback(async (credentialId?: string): Promise<boolean> => {
    if (!isSupported) {
      setError('WebAuthn is not supported in this browser');
      return false;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      // Get authentication options from server
      const optionsResponse = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId }),
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get authentication options');
      }

      const options = await optionsResponse.json();

      // Convert base64 strings to ArrayBuffers
      options.challenge = base64ToArrayBuffer(options.challenge);
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map((cred: any) => ({
          ...cred,
          id: base64ToArrayBuffer(cred.id),
        }));
      }

      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: options,
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Failed to get assertion');
      }

      // Send assertion to server for verification
      const verifyResponse = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: assertion.id,
          rawId: arrayBufferToBase64(assertion.rawId),
          type: assertion.type,
          response: {
            clientDataJSON: arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).clientDataJSON),
            authenticatorData: arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).authenticatorData),
            signature: arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).signature),
            userHandle: (assertion.response as AuthenticatorAssertionResponse).userHandle ? 
              arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).userHandle!) : null,
          },
        }),
        credentials: 'include',
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify assertion');
      }

      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'WebAuthn authentication failed';
      setError(errorMessage);
      console.error('WebAuthn authentication error:', err);
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported]);
  
  // Alias for BiometricEnrollmentPrompt component  
  const authenticateBiometric = useCallback(async (credentialId?: string): Promise<boolean> => {
    return authenticate(credentialId);
  }, [authenticate]);

  // Load credentials on mount
  useEffect(() => {
    if (!isSupported) return;
    
    const loadCredentials = async () => {
      setCredentialsLoading(true);
      try {
        // Try to get stored credentials from the server
        const response = await fetch('/api/auth/webauthn/credentials', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setCredentials(data.credentials || []);
        }
      } catch (err) {
        console.warn('Failed to load WebAuthn credentials:', err);
      } finally {
        setCredentialsLoading(false);
      }
    };
    
    loadCredentials();
  }, [isSupported]);

  return {
    isSupported,
    isPlatformAvailable,
    isRegistering,
    isEnrolling,
    isAuthenticating,
    credentials,
    credentialsLoading,
    hasWebAuthnCredentials,
    register,
    enrollBiometric,
    authenticate,
    authenticateBiometric,
    error,
  };
}

// Helper functions for base64/ArrayBuffer conversion
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}