/**
 * Manual Offline Testing Page
 * Provides UI controls to test offline functionality
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { indexedDB } from '@/utils/indexedDB';
import { syncQueue } from '@/utils/syncQueue';
import { offlineTestUtils } from '@/utils/offlineTestUtils';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, Database, Upload, Download, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';

export default function OfflineTestPage() {
  const { toast } = useToast();
  const { isOnline, forceSync, syncStatus } = useNetworkStatus();
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'checking' | 'active' | 'inactive'>('checking');
  const [dbStatus, setDbStatus] = useState<{ jobs: number; photos: number; queue: number } | null>(null);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState(false);

  // Check service worker status
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('active');
        toast({
          title: 'Service Worker Active',
          description: 'Offline functionality is ready',
        });
      }).catch(() => {
        setServiceWorkerStatus('inactive');
      });
    } else {
      setServiceWorkerStatus('inactive');
    }
  }, []);

  // Refresh DB stats
  const refreshDbStats = async () => {
    try {
      const [jobs, photos, queue] = await Promise.all([
        indexedDB.getAllJobs(),
        indexedDB.getAllPhotos(),
        syncQueue.getQueue(),
      ]);

      setDbStatus({
        jobs: jobs.length,
        photos: photos.length,
        queue: queue.length,
      });
    } catch (error) {
      console.error('Error fetching DB stats:', error);
    }
  };

  useEffect(() => {
    refreshDbStats();
    const interval = setInterval(refreshDbStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Test functions
  const toggleOfflineMode = async () => {
    const newState = !isSimulatingOffline;
    await offlineTestUtils.toggleOfflineMode(newState);
    setIsSimulatingOffline(newState);
    toast({
      title: newState ? 'Offline Mode Enabled' : 'Online Mode Restored',
      description: newState ? 'Simulating offline conditions' : 'Connection restored',
    });
  };

  const generateTestData = async () => {
    await offlineTestUtils.generateTestData();
    await refreshDbStats();
    toast({
      title: 'Test Data Generated',
      description: 'Sample jobs and photos added to IndexedDB',
    });
  };

  const simulatePhotoCapture = async () => {
    const photo = {
      id: `photo_${Date.now()}`,
      fileName: `test-photo-${Date.now()}.jpg`,
      fileSize: 1024 * 500, // 500KB
      mimeType: 'image/jpeg',
      capturedAt: new Date(),
      tags: ['test', 'offline'],
      metadata: {
        location: 'Test Location',
        annotations: ['Test Annotation']
      },
      base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD...'
    };

    await indexedDB.savePhoto(photo);
    await refreshDbStats();
    
    toast({
      title: 'Photo Captured',
      description: 'Photo saved to offline storage',
    });
  };

  const simulateJobUpdate = async () => {
    await syncQueue.queueRequest({
      url: '/api/jobs/test_job/status',
      method: 'PATCH',
      body: { 
        status: 'done',
        completedAt: new Date().toISOString()
      },
      headers: { 'Content-Type': 'application/json' },
    });
    
    await refreshDbStats();
    
    toast({
      title: 'Job Update Queued',
      description: 'Status change will sync when online',
    });
  };

  const triggerManualSync = async () => {
    await forceSync();
    toast({
      title: 'Manual Sync Triggered',
      description: 'Processing sync queue...',
    });
  };

  const clearAllData = async () => {
    await offlineTestUtils.clearAllOfflineData();
    await refreshDbStats();
    toast({
      title: 'Data Cleared',
      description: 'All offline data has been removed',
    });
  };

  const exportData = async () => {
    await offlineTestUtils.exportOfflineData();
    toast({
      title: 'Data Exported',
      description: 'Offline data downloaded as JSON',
    });
  };

  const createConflict = async () => {
    await offlineTestUtils.createTestConflict();
    toast({
      title: 'Conflict Created',
      description: 'Test conflict added for resolution testing',
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Offline Functionality Test Suite</h1>
      
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="text-green-600" /> : <WifiOff className="text-red-600" />}
              Network Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            {isSimulatingOffline && (
              <Badge variant="secondary" className="ml-2">Simulated</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database />
              Service Worker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={serviceWorkerStatus === 'active' ? 'default' : 'destructive'}>
              {serviceWorkerStatus === 'checking' ? 'Checking...' : 
               serviceWorkerStatus === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={syncStatus === 'synced' ? 'default' : 'secondary'}>
              {syncStatus}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Database Stats */}
      {dbStatus && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>IndexedDB Statistics</CardTitle>
            <CardDescription>Current offline data storage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{dbStatus.jobs}</div>
                <div className="text-sm text-muted-foreground">Jobs</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{dbStatus.photos}</div>
                <div className="text-sm text-muted-foreground">Photos</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{dbStatus.queue}</div>
                <div className="text-sm text-muted-foreground">Queue Items</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Network Simulation */}
        <Card>
          <CardHeader>
            <CardTitle>Network Simulation</CardTitle>
            <CardDescription>Test offline/online transitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={toggleOfflineMode} 
              variant={isSimulatingOffline ? 'destructive' : 'default'}
              className="w-full"
            >
              {isSimulatingOffline ? <WifiOff className="mr-2 h-4 w-4" /> : <Wifi className="mr-2 h-4 w-4" />}
              {isSimulatingOffline ? 'Restore Connection' : 'Simulate Offline'}
            </Button>
            
            <Button onClick={triggerManualSync} variant="secondary" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Trigger Manual Sync
            </Button>
          </CardContent>
        </Card>

        {/* Data Generation */}
        <Card>
          <CardHeader>
            <CardTitle>Data Generation</CardTitle>
            <CardDescription>Create test data for offline scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={generateTestData} className="w-full">
              <Database className="mr-2 h-4 w-4" />
              Generate Test Data
            </Button>
            
            <Button onClick={simulatePhotoCapture} variant="secondary" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Simulate Photo Capture
            </Button>
            
            <Button onClick={simulateJobUpdate} variant="secondary" className="w-full">
              <CheckCircle className="mr-2 h-4 w-4" />
              Simulate Job Update
            </Button>
          </CardContent>
        </Card>

        {/* Advanced Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Testing</CardTitle>
            <CardDescription>Conflict resolution and edge cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={createConflict} variant="secondary" className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Create Test Conflict
            </Button>
            
            <Button onClick={() => offlineTestUtils.forceSyncError()} variant="secondary" className="w-full">
              <XCircle className="mr-2 h-4 w-4" />
              Force Sync Error
            </Button>
            
            <Button onClick={() => offlineTestUtils.simulateSlowNetwork()} variant="secondary" className="w-full">
              <WifiOff className="mr-2 h-4 w-4" />
              Simulate Slow Network
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export and clear offline data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={exportData} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Offline Data
            </Button>
            
            <Button onClick={clearAllData} variant="destructive" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Offline Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Basic Offline Test:</h3>
            <ol className="list-decimal ml-6 space-y-1">
              <li>Click "Simulate Offline" to go offline</li>
              <li>Generate test data or capture photos</li>
              <li>Create job updates while offline</li>
              <li>Click "Restore Connection" to go online</li>
              <li>Watch the sync queue process automatically</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Conflict Resolution Test:</h3>
            <ol className="list-decimal ml-6 space-y-1">
              <li>Create test data while online</li>
              <li>Go offline and modify the data</li>
              <li>Use another tab to modify the same data</li>
              <li>Go back online to trigger conflict detection</li>
              <li>Review conflict resolution in the sync queue</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Field Day Simulation:</h3>
            <ol className="list-decimal ml-6 space-y-1">
              <li>Go to Field Day page while online</li>
              <li>Simulate offline mode</li>
              <li>Complete inspection workflow</li>
              <li>Capture photos and add notes</li>
              <li>Restore connection and verify sync</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}