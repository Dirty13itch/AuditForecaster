import { AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function DevModeBanner() {
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }

  const testUsers = [
    { id: 'test-admin', label: 'Admin', role: 'admin' },
    { id: 'test-inspector1', label: 'Inspector 1', role: 'inspector' },
    { id: 'test-inspector2', label: 'Inspector 2', role: 'inspector' },
  ];

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-warning/90 backdrop-blur-sm border-b border-warning-border shadow-lg"
      data-testid="banner-dev-mode"
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            <span className="font-semibold text-warning-foreground text-sm">
              🔧 Development Mode - Test Authentication Active
            </span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-warning-foreground text-sm font-medium">Quick Login:</span>
            {testUsers.map((user) => (
              <a
                key={user.id}
                href={`/api/dev-login/${user.id}`}
                className="inline-flex items-center gap-1 px-3 py-1 bg-background text-foreground rounded-md hover-elevate active-elevate-2 text-sm font-medium border border-border"
                data-testid={`link-dev-login-${user.id}`}
              >
                <User className="h-3 w-3" />
                {user.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
