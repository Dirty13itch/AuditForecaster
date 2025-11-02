import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import type { WebauthnCredential } from "@shared/schema";

// Check if WebAuthn is supported
const isWebAuthnSupported = (): boolean => {
  return !!(
    window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
};

// Check if platform authenticator is available (Touch ID, Face ID, Windows Hello)
const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// Convert array buffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Convert base64 to array buffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Detect device type and name
const getDeviceInfo = (): { name: string; type: 'platform' | 'cross-platform' } => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  // Detect platform type based on user agent
  let deviceName = 'Unknown Device';
  let deviceType: 'platform' | 'cross-platform' = 'platform';
  
  if (/iphone|ipad/.test(userAgent)) {
    deviceName = /ipad/.test(userAgent) ? 'iPad' : 'iPhone';
  } else if (/android/.test(userAgent)) {
    if (/samsung/.test(userAgent)) {
      deviceName = 'Samsung Galaxy';
    } else {
      deviceName = 'Android Device';
    }
  } else if (/windows/.test(platform) || /win32|win64/.test(platform)) {
    deviceName = 'Windows PC';
  } else if (/mac/.test(platform)) {
    deviceName = 'Mac';
  } else if (/linux/.test(platform)) {
    deviceName = 'Linux PC';
  }
  
  // Add browser info if available
  if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
    deviceName += ' (Chrome)';
  } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
    deviceName += ' (Safari)';
  } else if (/firefox/.test(userAgent)) {
    deviceName += ' (Firefox)';
  } else if (/edge/.test(userAgent)) {
    deviceName += ' (Edge)';
  }
  
  return { name: deviceName, type: deviceType };
};

interface WebAuthnHookReturn {
  // State
  isSupported: boolean;
  isPlatformAvailable: boolean;
  isEnrolling: boolean;
  isAuthenticating: boolean;
  credentials: WebauthnCredential[] | undefined;
  credentialsLoading: boolean;
  
  // Actions
  enrollBiometric: (deviceName?: string) => Promise<void>;
  authenticateBiometric: () => Promise<void>;
  revokeCredential: (credentialId: string, reason?: string) => Promise<void>;
  testBiometric: () => Promise<boolean>;
  checkBiometricStatus: () => Promise<void>;
}

export function useWebAuthn(): WebAuthnHookReturn {
  const { toast } = useToast();
  const haptic = useHapticFeedback();
  
  const [isSupported] = useState(isWebAuthnSupported());
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Check platform authenticator availability on mount
  useState(() => {
    isPlatformAuthenticatorAvailable().then(setIsPlatformAvailable);
  });
  
  // Fetch user's WebAuthn credentials
  const { data: credentials, isLoading: credentialsLoading } = useQuery<WebauthnCredential[]>({
    queryKey: ["/api/webauthn/credentials"],
    enabled: isSupported,
    retry: false,
  });
  
  // Enroll a new biometric credential
  const enrollBiometric = useCallback(async (customDeviceName?: string) => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "WebAuthn is not supported on this device",
        variant: "destructive",
      });
      return;
    }
    
    setIsEnrolling(true);
    haptic.vibrate('medium');
    
    try {
      // Step 1: Get registration challenge from server
      const { challenge, userId, userName, userDisplayName } = await apiRequest(
        "/api/webauthn/register/begin",
        { method: "POST" }
      );
      
      // Step 2: Create credentials using WebAuthn API
      const deviceInfo = getDeviceInfo();
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: base64ToArrayBuffer(challenge),
        rp: {
          name: "Energy Audit Pro",
          id: window.location.hostname,
        },
        user: {
          id: base64ToArrayBuffer(userId),
          name: userName,
          displayName: userDisplayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: isPlatformAvailable ? "platform" : "cross-platform",
          userVerification: "required",
          residentKey: "preferred",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "none", // We don't need attestation for this use case
      };
      
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error("Failed to create credential");
      }
      
      const response = credential.response as AuthenticatorAttestationResponse;
      
      // Step 3: Send credential to server for verification and storage
      await apiRequest("/api/webauthn/register/complete", {
        method: "POST",
        body: JSON.stringify({
          credentialId: arrayBufferToBase64(credential.rawId),
          publicKey: arrayBufferToBase64(response.publicKey),
          attestationObject: arrayBufferToBase64(response.attestationObject),
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          deviceName: customDeviceName || deviceInfo.name,
          deviceType: deviceInfo.type,
          transports: credential.response.getTransports ? 
            credential.response.getTransports() : 
            ["internal"],
        }),
      });
      
      // Invalidate credentials cache
      await queryClient.invalidateQueries({ queryKey: ["/api/webauthn/credentials"] });
      
      haptic.vibrate('success');
      toast({
        title: "Biometric Enrolled",
        description: `${customDeviceName || deviceInfo.name} has been successfully registered for biometric authentication.`,
      });
      
    } catch (error: any) {
      haptic.vibrate('error');
      console.error("WebAuthn enrollment error:", error);
      
      let errorMessage = "Failed to enroll biometric authentication";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Biometric enrollment was cancelled or denied";
      } else if (error.name === 'InvalidStateError') {
        errorMessage = "This device is already registered";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "This device doesn't support the required authentication methods";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Enrollment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsEnrolling(false);
    }
  }, [isSupported, isPlatformAvailable, toast, haptic]);
  
  // Authenticate using biometric
  const authenticateBiometric = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "WebAuthn is not supported on this device",
        variant: "destructive",
      });
      return;
    }
    
    setIsAuthenticating(true);
    haptic.vibrate('light');
    
    try {
      // Step 1: Get authentication challenge from server
      const { challenge, credentialIds } = await apiRequest(
        "/api/webauthn/authenticate/begin",
        { method: "POST" }
      );
      
      // Step 2: Get assertion using WebAuthn API
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64ToArrayBuffer(challenge),
        rpId: window.location.hostname,
        allowCredentials: credentialIds?.map((id: string) => ({
          id: base64ToArrayBuffer(id),
          type: "public-key" as const,
          transports: ["internal", "usb", "nfc", "ble"] as AuthenticatorTransport[],
        })) || [],
        userVerification: "required",
        timeout: 60000,
      };
      
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;
      
      if (!assertion) {
        throw new Error("Failed to get assertion");
      }
      
      const response = assertion.response as AuthenticatorAssertionResponse;
      
      // Step 3: Send assertion to server for verification
      await apiRequest("/api/webauthn/authenticate/complete", {
        method: "POST",
        body: JSON.stringify({
          credentialId: arrayBufferToBase64(assertion.rawId),
          authenticatorData: arrayBufferToBase64(response.authenticatorData),
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          signature: arrayBufferToBase64(response.signature),
          userHandle: response.userHandle ? 
            arrayBufferToBase64(response.userHandle) : 
            null,
        }),
      });
      
      haptic.vibrate('success');
      toast({
        title: "Authentication Successful",
        description: "Biometric verification completed successfully.",
      });
      
      // Refresh auth status
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
    } catch (error: any) {
      haptic.vibrate('error');
      console.error("WebAuthn authentication error:", error);
      
      let errorMessage = "Failed to authenticate with biometric";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Biometric authentication was cancelled or denied";
      } else if (error.name === 'InvalidStateError') {
        errorMessage = "No registered devices found";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "This device doesn't support the required authentication methods";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, [isSupported, toast, haptic]);
  
  // Revoke a credential
  const revokeCredentialMutation = useMutation({
    mutationFn: async ({ credentialId, reason }: { credentialId: string; reason?: string }) => {
      return await apiRequest(`/api/webauthn/credentials/${credentialId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webauthn/credentials"] });
      haptic.vibrate('medium');
      toast({
        title: "Device Removed",
        description: "The biometric credential has been revoked.",
      });
    },
    onError: (error: any) => {
      haptic.vibrate('error');
      toast({
        title: "Error",
        description: error.message || "Failed to revoke credential",
        variant: "destructive",
      });
    },
  });
  
  const revokeCredential = useCallback(
    async (credentialId: string, reason?: string) => {
      await revokeCredentialMutation.mutateAsync({ credentialId, reason });
    },
    [revokeCredentialMutation]
  );
  
  // Test biometric authentication
  const testBiometric = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "WebAuthn is not supported on this device",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Perform a test authentication
      await authenticateBiometric();
      
      toast({
        title: "Test Successful",
        description: "Biometric authentication is working correctly.",
      });
      return true;
    } catch {
      toast({
        title: "Test Failed",
        description: "Biometric authentication test was not successful.",
        variant: "destructive",
      });
      return false;
    }
  }, [isSupported, authenticateBiometric, toast]);
  
  // Check biometric availability and status
  const checkBiometricStatus = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "WebAuthn Not Supported",
        description: "Your browser doesn't support WebAuthn for biometric authentication.",
        variant: "destructive",
      });
      return;
    }
    
    const platformAvailable = await isPlatformAuthenticatorAvailable();
    setIsPlatformAvailable(platformAvailable);
    
    if (!platformAvailable) {
      toast({
        title: "Platform Authenticator Unavailable",
        description: "No biometric authenticator (Touch ID, Face ID, or Windows Hello) was found on this device.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Biometric Ready",
        description: "Your device supports biometric authentication.",
      });
    }
  }, [isSupported, toast]);
  
  return {
    // State
    isSupported,
    isPlatformAvailable,
    isEnrolling,
    isAuthenticating,
    credentials,
    credentialsLoading,
    
    // Actions
    enrollBiometric,
    authenticateBiometric,
    revokeCredential,
    testBiometric,
    checkBiometricStatus,
  };
}