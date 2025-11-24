'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AssetsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to monitoring service
        console.error('Assets section error:', error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Unable to load assets
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        There was a problem loading your equipment and fleet data.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground">
                            Error ID: {error.digest}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={reset} variant="default">
                            Retry
                        </Button>
                        <Button onClick={() => window.location.href = '/dashboard'} variant="outline" >
                            Back to Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
