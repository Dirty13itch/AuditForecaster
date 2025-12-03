'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
                    <div className="bg-destructive/10 p-6 rounded-full mb-6">
                        <AlertTriangle className="h-12 w-12 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        We apologize for the inconvenience. The application encountered an unexpected error.
                    </p>
                    {this.state.error && (
                        <pre className="bg-muted p-4 rounded text-xs text-left mb-6 max-w-md overflow-auto">
                            {this.state.error.message}
                        </pre>
                    )}
                    <div className="flex gap-4">
                        <Button onClick={() => window.location.reload()}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Reload Page
                        </Button>
                        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                            Go to Dashboard
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
