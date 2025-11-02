import { useState, useEffect } from "react";
import { useWebAuthn } from "@/hooks/useWebAuthn";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Shield, X, Smartphone, Monitor, AlertCircle } from "lucide-react";

export function BiometricEnrollmentPrompt() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    isSupported,
    isPlatformAvailable,
    isEnrolling,
    credentials,
    credentialsLoading,
    enrollBiometric,
    hasWebAuthnCredentials
  } = useWebAuthn();

  const [showPrompt, setShowPrompt] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [hasDeclined, setHasDeclined] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Check if we should show the enrollment prompt
  useEffect(() => {
    if (!isAuthenticated || !user || credentialsLoading) return;

    // Check if user has previously declined
    const declineKey = `biometric_enrollment_declined_${user.id}`;
    const hasUserDeclined = localStorage.getItem(declineKey) === 'true';
    
    if (hasUserDeclined) {
      setHasDeclined(true);
      return;
    }

    // Check if this is a first-time user (e.g., within 5 minutes of account creation)
    const accountAge = user.createdAt ? Date.now() - new Date(user.createdAt).getTime() : Infinity;
    const fiveMinutes = 5 * 60 * 1000;
    setIsFirstTimeUser(accountAge < fiveMinutes);

    // Show prompt if:
    // 1. WebAuthn is supported
    // 2. Platform authenticator is available
    // 3. User doesn't have any credentials enrolled
    // 4. User hasn't declined before
    if (isSupported && isPlatformAvailable && (!credentials || credentials.length === 0) && !hasUserDeclined) {
      // Delay showing the prompt to avoid overwhelming the user immediately after login
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isSupported, isPlatformAvailable, credentials, credentialsLoading]);

  const handleEnroll = async () => {
    if (!deviceName.trim()) {
      // Auto-generate device name based on browser/platform
      const userAgent = navigator.userAgent.toLowerCase();
      let autoName = "Unknown Device";
      
      if (/iphone|ipad/.test(userAgent)) {
        autoName = /ipad/.test(userAgent) ? "iPad" : "iPhone";
      } else if (/android/.test(userAgent)) {
        autoName = "Android Device";
      } else if (/windows/.test(userAgent)) {
        autoName = "Windows PC";
      } else if (/mac/.test(userAgent)) {
        autoName = "Mac";
      }
      
      // Add timestamp to make it unique
      const date = new Date().toLocaleDateString();
      setDeviceName(`${autoName} (${date})`);
    }

    try {
      await enrollBiometric(deviceName.trim() || `Device (${new Date().toLocaleDateString()})`);
      setShowPrompt(false);
      
      toast({
        title: "Biometric Enrolled Successfully",
        description: "You can now use biometric authentication for quick and secure access.",
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleDecline = () => {
    // Remember that user declined
    const declineKey = `biometric_enrollment_declined_${user?.id}`;
    localStorage.setItem(declineKey, 'true');
    setHasDeclined(true);
    setShowPrompt(false);
    
    toast({
      title: "Biometric Setup Skipped",
      description: "You can enable biometric authentication later in Settings > Security.",
    });
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    
    // Show reminder in 24 hours
    setTimeout(() => {
      if (!hasDeclined && (!credentials || credentials.length === 0)) {
        setShowPrompt(true);
      }
    }, 24 * 60 * 60 * 1000);
    
    toast({
      title: "Reminder Set",
      description: "We'll remind you about biometric authentication tomorrow.",
    });
  };

  // Don't render if conditions aren't met
  if (!isSupported || !isPlatformAvailable || hasDeclined || !showPrompt) {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Enhance Your Security
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPrompt(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            {isFirstTimeUser
              ? "Welcome! Set up biometric authentication for faster and more secure access to your account."
              : "Enable biometric authentication for quick and secure access using your fingerprint, Face ID, or Windows Hello."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Benefits */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Fingerprint className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Quick Access</p>
                <p className="text-sm text-muted-foreground">
                  Skip typing passwords - authenticate instantly with your biometrics
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">Enhanced Security</p>
                <p className="text-sm text-muted-foreground">
                  Your biometric data never leaves your device - only a secure key is stored
                </p>
              </div>
            </div>
          </div>

          {/* Device Name Input */}
          <div>
            <Label htmlFor="device-name">Device Name (Optional)</Label>
            <Input
              id="device-name"
              placeholder="e.g., Work Laptop, Personal Phone"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Give this device a name to identify it in your security settings
            </p>
          </div>

          {/* Platform Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You'll be prompted to verify using:
              {navigator.platform.includes("Mac") && " Touch ID or Face ID"}
              {navigator.platform.includes("Win") && " Windows Hello"}
              {navigator.platform.includes("Linux") && " your device's biometric system"}
              {/android/i.test(navigator.userAgent) && " fingerprint or face recognition"}
              {/iphone|ipad/i.test(navigator.userAgent) && " Touch ID or Face ID"}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            className="sm:mr-auto"
          >
            Don't Ask Again
          </Button>
          <Button
            variant="outline"
            onClick={handleRemindLater}
          >
            Remind Me Later
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={isEnrolling}
          >
            {isEnrolling ? (
              <>
                <Fingerprint className="h-4 w-4 mr-2 animate-pulse" />
                Setting up...
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4 mr-2" />
                Enable Biometric
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Quick re-authentication component for session refresh
export function BiometricQuickAuth({ onSuccess, onCancel }: { 
  onSuccess?: () => void; 
  onCancel?: () => void;
}) {
  const { authenticateBiometric, credentials, isAuthenticating } = useWebAuthn();
  const { toast } = useToast();
  const [show, setShow] = useState(false);

  // Check if biometric is available
  const canUseBiometric = credentials && credentials.length > 0;

  const handleAuthenticate = async () => {
    try {
      await authenticateBiometric();
      toast({
        title: "Authentication Successful",
        description: "Your session has been refreshed.",
      });
      onSuccess?.();
      setShow(false);
    } catch (error) {
      // Fall back to regular auth
      onCancel?.();
    }
  };

  if (!canUseBiometric) {
    return null;
  }

  return (
    <Card className="border-primary/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Fingerprint className="h-5 w-5" />
          Quick Re-authentication
        </CardTitle>
        <CardDescription>
          Use biometric authentication to quickly verify your identity
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button
          onClick={handleAuthenticate}
          disabled={isAuthenticating}
          className="flex-1"
        >
          {isAuthenticating ? (
            <>
              <Fingerprint className="h-4 w-4 mr-2 animate-pulse" />
              Authenticating...
            </>
          ) : (
            <>
              <Fingerprint className="h-4 w-4 mr-2" />
              Use Biometric
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Use Password
        </Button>
      </CardContent>
    </Card>
  );
}