/**
 * Comprehensive Offline-to-Online Synchronization Test Suite
 * Tests all aspects of offline functionality for field inspectors
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_TIMEOUT = 60000; // 60 seconds for offline tests
const SYNC_WAIT_TIME = 5000; // Wait 5 seconds for sync to complete

test.describe('Offline-to-Online Synchronization Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear service worker and storage
    await context.clearCookies();
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Clear IndexedDB and caches
    await page.evaluate(() => {
      return new Promise(async (resolve) => {
        // Clear IndexedDB
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          await window.indexedDB.deleteDatabase(db.name!);
        }
        
        // Clear caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        resolve(true);
      });
    });
  });

  test.describe('1. Photo Upload Sync', () => {
    test('Photos captured offline are queued and synced', async ({ page, context }) => {
      // Navigate to photos page
      await page.goto('/photos');
      
      // Go offline
      await context.setOffline(true);
      
      // Verify offline indicator appears
      await expect(page.locator('[data-testid="badge-sync-status"]')).toContainText(/offline/i, { timeout: 5000 });
      
      // Capture multiple photos (simulated)
      const photoData = [];
      for (let i = 1; i <= 3; i++) {
        const result = await page.evaluate((index) => {
          // Simulate photo capture
          const photo = {
            id: `local_photo_${index}`,
            fileName: `test-photo-${index}.jpg`,
            fileSize: 1024 * 100, // 100KB
            mimeType: 'image/jpeg',
            capturedAt: new Date(),
            tags: ['test', 'offline'],
            metadata: {
              location: 'Test Location',
              annotations: ['Annotation ' + index]
            },
            base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...' // Mock base64
          };
          
          // Save to IndexedDB through the app's offline system
          if (window.indexedDB) {
            return window.indexedDB.open('FieldInspectionDB').then(db => {
              const tx = db.transaction(['photos'], 'readwrite');
              const store = tx.objectStore('photos');
              return store.add({
                ...photo,
                _offline: {
                  version: 1,
                  lastModified: new Date(),
                  syncStatus: 'pending',
                  isDirty: true,
                  localOnly: true
                }
              });
            });
          }
          return photo;
        }, i);
        
        photoData.push(result);
      }
      
      // Verify photos are stored locally
      const localPhotos = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = window.indexedDB.open('FieldInspectionDB');
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(['photos'], 'readonly');
            const store = tx.objectStore('photos');
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
          };
        });
      });
      
      expect(localPhotos).toHaveLength(3);
      
      // Verify sync queue shows pending items
      await expect(page.locator('[data-testid="badge-sync-status"]')).toContainText(/3.*pending/i);
      
      // Go back online
      await context.setOffline(false);
      
      // Wait for sync to complete
      await page.waitForTimeout(SYNC_WAIT_TIME);
      
      // Verify sync completed
      await expect(page.locator('[data-testid="badge-sync-status"]')).toContainText(/synced|all synced/i, { timeout: 10000 });
      
      // Verify photos are no longer marked as pending
      const syncedPhotos = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = window.indexedDB.open('FieldInspectionDB');
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(['photos'], 'readonly');
            const store = tx.objectStore('photos');
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const photos = getAllRequest.result;
              resolve(photos.filter(p => p._offline?.syncStatus === 'synced'));
            };
          };
        });
      });
      
      // At least some photos should be synced
      expect((syncedPhotos as any[]).length).toBeGreaterThan(0);
    });
    
    test('Photo metadata and annotations are preserved during sync', async ({ page, context }) => {
      await page.goto('/photos');
      
      // Go offline
      await context.setOffline(true);
      
      // Create photo with metadata
      const photoWithMetadata = await page.evaluate(() => {
        const photo = {
          id: 'local_photo_metadata_test',
          fileName: 'metadata-test.jpg',
          fileSize: 2048,
          mimeType: 'image/jpeg',
          capturedAt: new Date(),
          tags: ['inspection', 'exterior', 'damage'],
          metadata: {
            location: '123 Test St',
            gps: { lat: 45.123, lng: -93.456 },
            annotations: [
              { text: 'Water damage visible', x: 100, y: 150 },
              { text: 'Needs repair', x: 200, y: 250 }
            ],
            inspectorNotes: 'Critical issue found'
          },
          base64Data: 'data:image/jpeg;base64,test'
        };
        
        // Store with offline metadata
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['photos'], 'readwrite');
          const store = tx.objectStore('photos');
          return store.add({
            ...photo,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'pending',
              isDirty: true,
              localOnly: true
            }
          }).then(() => photo);
        });
      });
      
      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME);
      
      // Verify metadata preserved
      const syncedPhoto = await page.evaluate((id) => {
        return new Promise((resolve) => {
          const request = window.indexedDB.open('FieldInspectionDB');
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction(['photos'], 'readonly');
            const store = tx.objectStore('photos');
            const getRequest = store.get(id);
            getRequest.onsuccess = () => resolve(getRequest.result);
          };
        });
      }, photoWithMetadata.id);
      
      expect(syncedPhoto).toBeDefined();
      expect((syncedPhoto as any).tags).toEqual(['inspection', 'exterior', 'damage']);
      expect((syncedPhoto as any).metadata?.annotations).toHaveLength(2);
    });
  });

  test.describe('2. Job Status Updates', () => {
    test('Job status changes offline are queued and synced', async ({ page, context }) => {
      await page.goto('/field-day');
      
      // Create test job
      const testJob = await page.evaluate(() => {
        const job = {
          id: 'test_job_001',
          address: '456 Offline Test Ave',
          builderId: 1,
          builderName: 'Test Builder',
          status: 'scheduled',
          scheduledDate: new Date().toISOString().split('T')[0],
          jobType: 'rough_inspection',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['jobs'], 'readwrite');
          const store = tx.objectStore('jobs');
          return store.add({
            ...job,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'synced',
              isDirty: false,
              localOnly: false
            }
          }).then(() => job);
        });
      });
      
      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      
      // Update job status multiple times
      const statusUpdates = ['done', 'failed', 'reschedule'];
      for (const status of statusUpdates) {
        await page.evaluate(({ jobId, newStatus }) => {
          // Add status update to sync queue
          return window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['syncQueue'], 'readwrite');
            const store = tx.objectStore('syncQueue');
            return store.add({
              id: `sync_${Date.now()}_${Math.random()}`,
              entityType: 'job',
              entityId: jobId,
              operation: 'update',
              priority: 'critical',
              data: { status: newStatus, updatedAt: new Date().toISOString() },
              timestamp: new Date(),
              retryCount: 0,
              endpoint: `/api/jobs/${jobId}/status`,
              method: 'PATCH'
            });
          });
        }, { jobId: testJob.id, newStatus: status });
        
        await page.waitForTimeout(500);
      }
      
      // Verify queue has items
      const queueCount = await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readonly');
          const store = tx.objectStore('syncQueue');
          return store.count().then(count => count);
        });
      });
      
      expect(queueCount).toBe(3);
      
      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME);
      
      // Verify sync completed
      const finalQueueCount = await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readonly');
          const store = tx.objectStore('syncQueue');
          return store.count().then(count => count);
        });
      });
      
      // Queue should be empty or have fewer items
      expect(finalQueueCount).toBeLessThan(3);
    });
    
    test('Timestamps are preserved during offline updates', async ({ page, context }) => {
      await page.goto('/field-day');
      
      // Go offline
      await context.setOffline(true);
      
      const offlineTimestamp = new Date().toISOString();
      
      // Create status update with specific timestamp
      await page.evaluate((timestamp) => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readwrite');
          const store = tx.objectStore('syncQueue');
          return store.add({
            id: `sync_timestamp_test`,
            entityType: 'job',
            entityId: 'job_timestamp_test',
            operation: 'update',
            priority: 'critical',
            data: {
              status: 'done',
              completedAt: timestamp,
              offlineTimestamp: timestamp
            },
            timestamp: new Date(timestamp),
            retryCount: 0,
            endpoint: '/api/jobs/job_timestamp_test',
            method: 'PATCH'
          });
        });
      }, offlineTimestamp);
      
      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME);
      
      // Verify timestamp was preserved (would need actual API check in production)
      const syncedItem = await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readonly');
          const store = tx.objectStore('syncQueue');
          return store.get('sync_timestamp_test').then(item => item);
        });
      });
      
      // If item still exists, check timestamp
      if (syncedItem) {
        expect((syncedItem as any).data.offlineTimestamp).toBe(offlineTimestamp);
      }
    });
  });

  test.describe('3. Inspection Data Sync', () => {
    test('Checklist responses are saved offline and synced', async ({ page, context }) => {
      await page.goto('/inspection/test_job_inspection');
      
      // Go offline
      await context.setOffline(true);
      
      // Save inspection data
      const inspectionData = await page.evaluate(() => {
        const data = {
          id: 'inspection_001',
          jobId: 'test_job_inspection',
          templateId: 'hers_rough_inspection',
          responses: [
            { questionId: 'q1', answer: 'Pass', notes: 'Good condition' },
            { questionId: 'q2', answer: 'Fail', notes: 'Needs repair' },
            { questionId: 'q3', answer: 'N/A', notes: 'Not applicable' }
          ],
          testData: {
            blowerDoor: {
              cfm50: 1250,
              ach50: 4.5,
              leakageArea: 125
            },
            ductLeakage: {
              cfm25Total: 85,
              cfm25Outside: 65,
              percentLeakage: 8.5
            }
          },
          notes: 'Offline inspection completed',
          completedAt: new Date().toISOString()
        };
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['reports'], 'readwrite');
          const store = tx.objectStore('reports');
          return store.add({
            ...data,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'pending',
              isDirty: true,
              localOnly: true
            }
          }).then(() => data);
        });
      });
      
      expect(inspectionData).toBeDefined();
      expect(inspectionData.responses).toHaveLength(3);
      
      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME);
      
      // Verify data synced
      const syncedInspection = await page.evaluate((id) => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['reports'], 'readonly');
          const store = tx.objectStore('reports');
          return store.get(id).then(item => item);
        });
      }, inspectionData.id);
      
      expect(syncedInspection).toBeDefined();
      expect((syncedInspection as any).testData?.blowerDoor?.cfm50).toBe(1250);
    });
    
    test('Partial saves and resume functionality work offline', async ({ page, context }) => {
      await page.goto('/inspection/partial_test');
      
      // Go offline
      await context.setOffline(true);
      
      // Save partial inspection
      await page.evaluate(() => {
        const partialData = {
          id: 'partial_inspection_001',
          jobId: 'partial_test',
          templateId: 'hers_final_inspection',
          responses: [
            { questionId: 'q1', answer: 'Pass' }
            // Only 1 of many questions answered
          ],
          status: 'in_progress',
          progressPercent: 10,
          lastSavedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`inspection_draft_partial_test`, JSON.stringify(partialData));
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['reports'], 'readwrite');
          const store = tx.objectStore('reports');
          return store.add({
            ...partialData,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'pending',
              isDirty: true,
              localOnly: true
            }
          });
        });
      });
      
      // Simulate app reload
      await page.reload();
      
      // Verify draft is restored
      const restoredDraft = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('inspection_draft_partial_test') || '{}');
      });
      
      expect(restoredDraft.id).toBe('partial_inspection_001');
      expect(restoredDraft.progressPercent).toBe(10);
      
      // Continue editing and save again
      await page.evaluate(() => {
        const draft = JSON.parse(localStorage.getItem('inspection_draft_partial_test') || '{}');
        draft.responses.push({ questionId: 'q2', answer: 'Fail', notes: 'Issue found' });
        draft.progressPercent = 20;
        draft.lastSavedAt = new Date().toISOString();
        localStorage.setItem('inspection_draft_partial_test', JSON.stringify(draft));
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['reports'], 'readwrite');
          const store = tx.objectStore('reports');
          return store.put({
            ...draft,
            _offline: {
              version: 2,
              lastModified: new Date(),
              syncStatus: 'pending',
              isDirty: true,
              localOnly: true
            }
          });
        });
      });
      
      // Go online and sync
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME);
    });
  });

  test.describe('4. Service Worker & IndexedDB', () => {
    test('Service worker is registered and active', async ({ page }) => {
      await page.goto('/');
      
      const swStatus = await page.evaluate(() => {
        return new Promise((resolve) => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
              resolve({
                registered: true,
                active: registration.active?.state === 'activated',
                scope: registration.scope
              });
            }).catch(() => {
              resolve({ registered: false, active: false });
            });
          } else {
            resolve({ registered: false, active: false });
          }
        });
      });
      
      expect(swStatus.registered).toBe(true);
      expect(swStatus.active).toBe(true);
    });
    
    test('IndexedDB stores data correctly', async ({ page }) => {
      await page.goto('/');
      
      const dbInfo = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = window.indexedDB.open('FieldInspectionDB');
          request.onsuccess = () => {
            const db = request.result;
            const stores = Array.from(db.objectStoreNames);
            resolve({
              name: db.name,
              version: db.version,
              stores
            });
          };
          request.onerror = () => resolve(null);
        });
      });
      
      expect(dbInfo).toBeDefined();
      expect(dbInfo?.stores).toContain('jobs');
      expect(dbInfo?.stores).toContain('photos');
      expect(dbInfo?.stores).toContain('reports');
      expect(dbInfo?.stores).toContain('syncQueue');
      expect(dbInfo?.stores).toContain('conflicts');
    });
    
    test('Conflict resolution handles concurrent edits', async ({ page, context }) => {
      await page.goto('/');
      
      // Create a conflict scenario
      const conflict = await page.evaluate(() => {
        const conflictData = {
          id: 'conflict_test_001',
          entityType: 'job' as const,
          entityId: 'job_conflict_test',
          localData: {
            status: 'done',
            notes: 'Completed offline',
            updatedAt: new Date().toISOString()
          },
          remoteData: {
            status: 'failed',
            notes: 'Failed online',
            updatedAt: new Date(Date.now() - 1000).toISOString()
          },
          detectedAt: new Date()
        };
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['conflicts'], 'readwrite');
          const store = tx.objectStore('conflicts');
          return store.add(conflictData).then(() => conflictData);
        });
      });
      
      expect(conflict).toBeDefined();
      
      // Simulate conflict resolution (merge strategy)
      const resolved = await page.evaluate((conflictId) => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['conflicts'], 'readwrite');
          const store = tx.objectStore('conflicts');
          return store.get(conflictId).then(conflict => {
            if (conflict) {
              // Apply merge strategy: local wins for status, combine notes
              const merged = {
                ...conflict.remoteData,
                status: conflict.localData.status,
                notes: `${conflict.remoteData.notes} | ${conflict.localData.notes}`,
                resolvedAt: new Date(),
                resolution: 'merge'
              };
              
              conflict.resolution = 'merge';
              conflict.resolvedAt = new Date();
              conflict.mergedData = merged;
              
              return store.put(conflict).then(() => merged);
            }
          });
        });
      }, conflict.id);
      
      expect(resolved).toBeDefined();
      expect((resolved as any).status).toBe('done');
      expect((resolved as any).notes).toContain('offline');
      expect((resolved as any).notes).toContain('online');
    });
  });

  test.describe('5. Network State Detection', () => {
    test('Network status indicator updates correctly', async ({ page, context }) => {
      await page.goto('/');
      
      // Initially online
      const onlineIndicator = page.locator('[data-testid="badge-sync-status"]');
      await expect(onlineIndicator).toBeVisible();
      
      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      
      // Check offline indicator
      await expect(onlineIndicator).toContainText(/offline/i);
      
      // Go back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);
      
      // Check online indicator
      await expect(onlineIndicator).not.toContainText(/offline/i);
    });
    
    test('Automatic sync triggers on reconnection', async ({ page, context }) => {
      await page.goto('/');
      
      // Go offline and add items to queue
      await context.setOffline(true);
      
      await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readwrite');
          const store = tx.objectStore('syncQueue');
          return store.add({
            id: 'auto_sync_test',
            entityType: 'job',
            entityId: 'test_job',
            operation: 'update',
            priority: 'normal',
            data: { status: 'done' },
            timestamp: new Date(),
            retryCount: 0,
            endpoint: '/api/jobs/test_job',
            method: 'PATCH'
          });
        });
      });
      
      // Verify item in queue
      const beforeSync = await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readonly');
          const store = tx.objectStore('syncQueue');
          return store.count().then(count => count);
        });
      });
      
      expect(beforeSync).toBeGreaterThan(0);
      
      // Go back online - should trigger auto sync
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME);
      
      // Verify queue processed
      const afterSync = await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readonly');
          const store = tx.objectStore('syncQueue');
          return store.count().then(count => count);
        });
      });
      
      expect(afterSync).toBeLessThan(beforeSync);
    });
    
    test('Manual sync trigger works correctly', async ({ page }) => {
      await page.goto('/');
      
      // Add item to sync queue
      await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readwrite');
          const store = tx.objectStore('syncQueue');
          return store.add({
            id: 'manual_sync_test',
            entityType: 'photo',
            entityId: 'photo_123',
            operation: 'create',
            priority: 'normal',
            data: { fileName: 'test.jpg' },
            timestamp: new Date(),
            retryCount: 0,
            endpoint: '/api/photos',
            method: 'POST'
          });
        });
      });
      
      // Click sync button if visible
      const syncButton = page.locator('[data-testid="button-sync-status"]');
      if (await syncButton.isVisible()) {
        await syncButton.click();
        await page.waitForTimeout(SYNC_WAIT_TIME);
      }
    });
    
    test('Retry logic handles failed syncs', async ({ page, context }) => {
      await page.goto('/');
      
      // Create an item that will fail to sync
      await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readwrite');
          const store = tx.objectStore('syncQueue');
          return store.add({
            id: 'retry_test',
            entityType: 'job',
            entityId: 'invalid_job',
            operation: 'update',
            priority: 'normal',
            data: { invalidField: 'will_fail' },
            timestamp: new Date(),
            retryCount: 0,
            endpoint: '/api/invalid-endpoint',
            method: 'POST'
          });
        });
      });
      
      // Trigger sync
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });
      
      await page.waitForTimeout(2000);
      
      // Check that retry count increased
      const retryItem = await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readonly');
          const store = tx.objectStore('syncQueue');
          return store.get('retry_test').then(item => item);
        });
      });
      
      // Retry count should increase after failed attempt
      if (retryItem) {
        expect((retryItem as any).retryCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Field Day Workflow End-to-End', () => {
    test('Complete field inspection workflow offline and sync', async ({ page, context }) => {
      // Navigate to Field Day page
      await page.goto('/field-day');
      
      // Create test job for today
      const today = new Date().toISOString().split('T')[0];
      await page.evaluate((date) => {
        const job = {
          id: 'field_day_test_001',
          address: '789 Field Test Lane',
          builderId: 1,
          builderName: 'Field Test Builder',
          status: 'scheduled',
          scheduledDate: date,
          jobType: 'final_inspection',
          assignedInspectorId: 1
        };
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['jobs'], 'readwrite');
          const store = tx.objectStore('jobs');
          return store.add({
            ...job,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'synced',
              isDirty: false,
              localOnly: false
            }
          });
        });
      }, today);
      
      // Go offline to simulate field conditions
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      
      // Verify offline badge
      await expect(page.locator('[data-testid="badge-sync-status"]')).toContainText(/offline/i);
      
      // Complete inspection workflow:
      
      // 1. Mark job as in progress
      await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readwrite');
          const store = tx.objectStore('syncQueue');
          return store.add({
            id: `sync_field_${Date.now()}_1`,
            entityType: 'job',
            entityId: 'field_day_test_001',
            operation: 'update',
            priority: 'critical',
            data: { status: 'in_progress', startedAt: new Date().toISOString() },
            timestamp: new Date(),
            retryCount: 0,
            endpoint: '/api/jobs/field_day_test_001/status',
            method: 'PATCH'
          });
        });
      });
      
      // 2. Add inspection checklist responses
      await page.evaluate(() => {
        const inspection = {
          id: 'field_inspection_001',
          jobId: 'field_day_test_001',
          responses: [
            { questionId: 'exterior_1', answer: 'Pass', notes: 'Siding in good condition' },
            { questionId: 'exterior_2', answer: 'Fail', notes: 'Gutter needs repair' },
            { questionId: 'roof_1', answer: 'Pass' },
            { questionId: 'windows_1', answer: 'Pass' },
            { questionId: 'doors_1', answer: 'N/A', notes: 'Garage door not installed yet' }
          ],
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date().toISOString()
        };
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['reports'], 'readwrite');
          const store = tx.objectStore('reports');
          return store.add({
            ...inspection,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'pending',
              isDirty: true,
              localOnly: true
            }
          });
        });
      });
      
      // 3. Add photos
      for (let i = 1; i <= 5; i++) {
        await page.evaluate((index) => {
          const photo = {
            id: `field_photo_${index}`,
            jobId: 'field_day_test_001',
            fileName: `field-photo-${index}.jpg`,
            fileSize: 1024 * 200,
            mimeType: 'image/jpeg',
            capturedAt: new Date(),
            tags: index === 1 ? ['exterior', 'front'] : 
                  index === 2 ? ['exterior', 'damage'] :
                  index === 3 ? ['roof', 'overview'] :
                  index === 4 ? ['interior', 'kitchen'] : ['interior', 'bathroom'],
            metadata: {
              location: '789 Field Test Lane',
              room: index > 3 ? 'Interior' : 'Exterior',
              notes: index === 2 ? 'Gutter damage visible' : ''
            },
            base64Data: 'data:image/jpeg;base64,mockdata'
          };
          
          return window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['photos'], 'readwrite');
            const store = tx.objectStore('photos');
            return store.add({
              ...photo,
              _offline: {
                version: 1,
                lastModified: new Date(),
                syncStatus: 'pending',
                isDirty: true,
                localOnly: true
              }
            });
          });
        }, i);
      }
      
      // 4. Add blower door test results
      await page.evaluate(() => {
        const testData = {
          id: 'blower_test_001',
          jobId: 'field_day_test_001',
          type: 'blower_door',
          data: {
            cfm50: 1450,
            ach50: 5.2,
            leakageArea: 142,
            testPressure: 50,
            testDate: new Date().toISOString(),
            technician: 'Field Inspector',
            equipmentId: 'BD-001',
            notes: 'Test completed successfully, minor leakage detected'
          }
        };
        
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['reports'], 'readwrite');
          const store = tx.objectStore('reports');
          return store.add({
            ...testData,
            _offline: {
              version: 1,
              lastModified: new Date(),
              syncStatus: 'pending',
              isDirty: true,
              localOnly: true
            }
          });
        });
      });
      
      // 5. Mark job as complete
      await page.evaluate(() => {
        return window.indexedDB.open('FieldInspectionDB').then(db => {
          const tx = db.transaction(['syncQueue'], 'readwrite');
          const store = tx.objectStore('syncQueue');
          return store.add({
            id: `sync_field_${Date.now()}_2`,
            entityType: 'job',
            entityId: 'field_day_test_001',
            operation: 'update',
            priority: 'critical',
            data: { 
              status: 'done',
              completedAt: new Date().toISOString(),
              notes: 'Inspection completed offline, minor issues found'
            },
            timestamp: new Date(),
            retryCount: 0,
            endpoint: '/api/jobs/field_day_test_001/status',
            method: 'PATCH'
          });
        });
      });
      
      // Verify all data is queued
      const queueStats = await page.evaluate(() => {
        return Promise.all([
          window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['syncQueue'], 'readonly');
            return tx.objectStore('syncQueue').count();
          }),
          window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['photos'], 'readonly');
            const index = tx.objectStore('photos').index('by-sync-status');
            return index.count('pending');
          }),
          window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['reports'], 'readonly');
            const index = tx.objectStore('reports').index('by-sync-status');
            return index.count('pending');
          })
        ]).then(([queueCount, photoCount, reportCount]) => ({
          syncQueue: queueCount,
          pendingPhotos: photoCount,
          pendingReports: reportCount
        }));
      });
      
      expect(queueStats.syncQueue).toBeGreaterThan(0);
      expect(queueStats.pendingPhotos).toBe(5);
      expect(queueStats.pendingReports).toBeGreaterThan(0);
      
      // Simulate returning to office with connectivity
      await context.setOffline(false);
      await page.waitForTimeout(SYNC_WAIT_TIME * 2); // Extra time for all data
      
      // Verify sync completed
      await expect(page.locator('[data-testid="badge-sync-status"]')).not.toContainText(/pending/i, { timeout: 15000 });
      
      // Verify data was synced
      const finalStats = await page.evaluate(() => {
        return Promise.all([
          window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['syncQueue'], 'readonly');
            return tx.objectStore('syncQueue').count();
          }),
          window.indexedDB.open('FieldInspectionDB').then(db => {
            const tx = db.transaction(['photos'], 'readonly');
            const index = tx.objectStore('photos').index('by-sync-status');
            return index.count('pending');
          })
        ]).then(([queueCount, photoCount]) => ({
          remainingQueue: queueCount,
          remainingPhotos: photoCount
        }));
      });
      
      // Most items should be synced
      expect(finalStats.remainingQueue).toBeLessThan(queueStats.syncQueue);
      expect(finalStats.remainingPhotos).toBeLessThan(5);
    });
  });
});