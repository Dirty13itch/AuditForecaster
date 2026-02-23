'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function JobsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error, { tags: { section: 'jobs' } });
        console.error('Jobs section error:', error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Jobs Error
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Failed to load job data. Please try again.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-muted-foreground">
                            Reference: {error.digest}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button onClick={reset} variant="default">
                            Try again
                        </Button>
                        <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
                            Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
