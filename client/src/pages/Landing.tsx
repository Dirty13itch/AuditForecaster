import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calendar, Camera, TrendingUp, FileText, Users } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Energy Auditing Field App</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive field inspection management for RESNET-certified energy auditors
          </p>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your field auditing tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              size="lg" 
              className="w-full" 
              onClick={handleLogin}
              data-testid="button-login"
            >
              Sign in with Replit
            </Button>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <Calendar className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Calendar Sync</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Photo Docs</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <TrendingUp className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Analytics</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">PDF Reports</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <Users className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Builder Tracking</span>
              </div>
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <Zap className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">45L Credits</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Powered by Replit • Secure authentication • Mobile-optimized for Samsung Galaxy S23 Ultra
        </p>
      </div>
    </div>
  );
}
