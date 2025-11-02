/**
 * Sync Queue Panel Page Object Model
 * 
 * Represents the sync queue status badge, offline banner, and sync-related UI.
 * Used for testing offline sync functionality and queue management.
 */

import { type Page, type Locator } from '@playwright/test';

export class SyncQueuePanel {
  readonly page: Page;
  readonly baseUrl: string;

  constructor(page: Page, baseUrl: string = 'http://localhost:5000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  // ============================================================================
  // OFFLINE BANNER ELEMENTS
  // ============================================================================

  get offlineBanner(): Locator {
    return this.page.getByTestId('alert-offline');
  }

  // ============================================================================
  // SYNC STATUS BADGE ELEMENTS
  // ============================================================================

  get syncStatusButton(): Locator {
    return this.page.getByTestId('button-sync-status');
  }

  get syncStatusBadge(): Locator {
    return this.page.getByTestId('badge-sync-status');
  }

  get offlineMobileButton(): Locator {
    return this.page.getByTestId('button-offline-mobile');
  }

  get offlineMobileIcon(): Locator {
    return this.page.getByTestId('icon-offline-mobile');
  }

  get syncingMobileContainer(): Locator {
    return this.page.getByTestId('container-syncing-mobile');
  }

  get syncingMobileIcon(): Locator {
    return this.page.getByTestId('icon-syncing-mobile');
  }

  get pendingMobileButton(): Locator {
    return this.page.getByTestId('button-pending-mobile');
  }

  get pendingMobileIcon(): Locator {
    return this.page.getByTestId('icon-pending-mobile');
  }

  get syncedMobileContainer(): Locator {
    return this.page.getByTestId('container-synced-mobile');
  }

  get syncedMobileIcon(): Locator {
    return this.page.getByTestId('icon-synced-mobile');
  }

  // ============================================================================
  // DUPLICATE MODAL ELEMENTS
  // ============================================================================

  get duplicateModal(): Locator {
    return this.page.getByTestId('dialog-duplicate-photo');
  }

  get duplicateModalTitle(): Locator {
    return this.page.getByTestId('text-duplicate-title');
  }

  get duplicateModalMessage(): Locator {
    return this.page.getByTestId('text-duplicate-message');
  }

  get skipDuplicateButton(): Locator {
    return this.page.getByTestId('button-skip-duplicate');
  }

  get uploadAnywayButton(): Locator {
    return this.page.getByTestId('button-upload-anyway');
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Check if offline banner is visible
   */
  async isOffline(): Promise<boolean> {
    return await this.offlineBanner.isVisible();
  }

  /**
   * Get sync status badge text
   */
  async getSyncStatusText(): Promise<string> {
    return await this.syncStatusBadge.textContent() || '';
  }

  /**
   * Get pending sync count from badge
   */
  async getPendingSyncCount(): Promise<number> {
    const text = await this.getSyncStatusText();
    
    // Try to extract number from patterns like "5 pending" or "Offline • 3 pending"
    const match = text.match(/(\d+)\s*pending/i);
    if (match) {
      return parseInt(match[1], 10);
    }
    
    // Check for simple number only (mobile view)
    const numMatch = text.match(/^\d+$/);
    if (numMatch) {
      return parseInt(text, 10);
    }
    
    return 0;
  }

  /**
   * Check if sync badge shows "syncing" state
   */
  async isSyncing(): Promise<boolean> {
    const text = await this.getSyncStatusText();
    return text.toLowerCase().includes('syncing');
  }

  /**
   * Check if sync badge shows "synced" state
   */
  async isSynced(): Promise<boolean> {
    const text = await this.getSyncStatusText();
    return text.toLowerCase().includes('synced') || text.toLowerCase().includes('all synced');
  }

  /**
   * Click sync status button to manually trigger sync
   */
  async clickSync() {
    await this.syncStatusButton.click();
  }

  /**
   * Wait for sync to complete
   */
  async waitForSyncComplete(timeout: number = 30000) {
    // Wait for syncing state to appear
    await this.page.waitForTimeout(1000);
    
    // Wait for syncing to finish (badge text changes from "Syncing..." to "All synced")
    await this.page.waitForFunction(
      () => {
        const badge = document.querySelector('[data-testid="badge-sync-status"]');
        const text = badge?.textContent || '';
        return !text.toLowerCase().includes('syncing');
      },
      { timeout }
    );

    await this.page.waitForTimeout(500);
  }

  /**
   * Wait for pending count to reach a specific value
   */
  async waitForPendingCount(expectedCount: number, timeout: number = 10000) {
    await this.page.waitForFunction(
      (count) => {
        const badge = document.querySelector('[data-testid="badge-sync-status"]');
        const text = badge?.textContent || '';
        
        // Extract number from badge text
        const match = text.match(/(\d+)\s*pending/i);
        if (match) {
          return parseInt(match[1], 10) === count;
        }
        
        // If expecting 0, check for "All synced" or "synced"
        if (count === 0) {
          return text.toLowerCase().includes('synced');
        }
        
        return false;
      },
      expectedCount,
      { timeout }
    );
  }

  /**
   * Check if duplicate photo modal is showing
   */
  async isDuplicateModalVisible(): Promise<boolean> {
    return await this.duplicateModal.isVisible();
  }

  /**
   * Get duplicate modal message
   */
  async getDuplicateModalMessage(): Promise<string> {
    return await this.duplicateModalMessage.textContent() || '';
  }

  /**
   * Skip duplicate photo upload
   */
  async skipDuplicate() {
    await this.skipDuplicateButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Upload duplicate photo anyway
   */
  async uploadDuplicateAnyway() {
    await this.uploadAnywayButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Check IndexedDB for photo queue data
   */
  async getIndexedDBPhotoQueue(): Promise<any[]> {
    return await this.page.evaluate(async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('offline-photos-db', 1);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
          const db = request.result;
          
          if (!db.objectStoreNames.contains('photos')) {
            resolve([]);
            return;
          }

          const transaction = db.transaction(['photos'], 'readonly');
          const store = transaction.objectStore('photos');
          const getAllRequest = store.getAll();

          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result);
          };

          getAllRequest.onerror = () => {
            reject(getAllRequest.error);
          };
        };

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('photos')) {
            db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
          }
        };
      });
    });
  }

  /**
   * Get count of photos in IndexedDB queue
   */
  async getIndexedDBPhotoCount(): Promise<number> {
    const queue = await this.getIndexedDBPhotoQueue();
    return queue.length;
  }

  /**
   * Check if service worker is ready
   */
  async isServiceWorkerReady(): Promise<boolean> {
    return await this.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      } catch {
        return false;
      }
    });
  }

  /**
   * Get service worker state
   */
  async getServiceWorkerState(): Promise<string> {
    return await this.page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return 'not_supported';
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state || 'inactive';
      } catch {
        return 'error';
      }
    });
  }
}
