import { haversineDistance, calculateAverageSpeed, metersToMiles } from '@/lib/haversine';
import { indexedDB } from '@/utils/indexedDB';
import { queryClientLogger } from '@/lib/logger';

export type TripState = 'idle' | 'monitoring' | 'recording' | 'pendingUpload';

export interface RoutePoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  speed: number | null;
  accuracy: number | null;
  source: 'gps' | 'network' | 'cached';
}

export interface TripData {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
  points: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  averageSpeed: number;
  state: TripState;
}

const CONFIG = {
  AUTO_START_SPEED_THRESHOLD: 5, // m/s (~11 mph)
  AUTO_START_DURATION: 30000, // 30 seconds
  AUTO_STOP_SPEED_THRESHOLD: 1.5, // m/s (~3 mph)
  AUTO_STOP_DURATION: 120000, // 2 minutes
  SAMPLING_INTERVAL_MOVING: 5000, // 5 seconds when moving
  SAMPLING_INTERVAL_STATIONARY: 60000, // 60 seconds when stationary
  MIN_ACCURACY: 100, // meters - reject points with worse accuracy
  MAX_SPEED_JUMP: 50, // m/s - reject points with unrealistic speed changes
};

type TripListener = (trip: TripData) => void;
type StateListener = (state: TripState) => void;
type ErrorListener = (error: GeolocationPositionError) => void;

class TripTrackerService {
  private state: TripState = 'idle';
  private currentTrip: TripData | null = null;
  private watchId: number | null = null;
  private lastPoint: RoutePoint | null = null;
  private movingStartTime: number | null = null;
  private stationaryStartTime: number | null = null;
  private samplingInterval: number = CONFIG.SAMPLING_INTERVAL_STATIONARY;
  private lastSampleTime: number = 0;
  
  private tripListeners = new Set<TripListener>();
  private stateListeners = new Set<StateListener>();
  private errorListeners = new Set<ErrorListener>();

  constructor() {
    this.loadPersistedTrip();
  }

  private async loadPersistedTrip() {
    try {
      const trips = await indexedDB.getMileageTrips();
      const activeTrip = trips.find(t => !t.synced && t.points && t.points.length > 0);
      
      if (activeTrip) {
        this.currentTrip = {
          id: activeTrip.id,
          startTime: activeTrip.startTime ? new Date(activeTrip.startTime) : null,
          endTime: activeTrip.endTime ? new Date(activeTrip.endTime) : null,
          points: activeTrip.points || [],
          distanceMeters: this.calculateDistance(activeTrip.points || []),
          durationSeconds: 0,
          averageSpeed: 0,
          state: 'pendingUpload',
        };
        this.setState('pendingUpload');
        queryClientLogger.info('[TripTracker] Loaded persisted trip:', this.currentTrip.id);
      }
    } catch (error) {
      queryClientLogger.error('[TripTracker] Error loading persisted trip:', error);
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.state !== 'idle') {
      queryClientLogger.warn('[TripTracker] Already tracking');
      return;
    }

    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation is not supported by your browser');
    }

    try {
      await this.requestPermission();
      this.setState('monitoring');
      this.startGPSTracking();
      queryClientLogger.info('[TripTracker] Monitoring started');
    } catch (error) {
      queryClientLogger.error('[TripTracker] Failed to start monitoring:', error);
      throw error;
    }
  }

  public stopMonitoring(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.state === 'recording' && this.currentTrip) {
      this.finishTrip();
    } else {
      this.setState('idle');
    }

    queryClientLogger.info('[TripTracker] Monitoring stopped');
  }

  public async startManualTrip(): Promise<void> {
    if (this.state === 'recording') {
      queryClientLogger.warn('[TripTracker] Already recording');
      return;
    }

    const tripId = crypto.randomUUID();
    this.currentTrip = {
      id: tripId,
      startTime: new Date(),
      endTime: null,
      points: [],
      distanceMeters: 0,
      durationSeconds: 0,
      averageSpeed: 0,
      state: 'recording',
    };

    await indexedDB.saveMileageTrip(this.currentTrip);
    this.setState('recording');
    
    if (this.state !== 'monitoring') {
      this.startGPSTracking();
    }

    queryClientLogger.info('[TripTracker] Manual trip started:', tripId);
  }

  public async stopTrip(): Promise<TripData | null> {
    if (!this.currentTrip || this.state !== 'recording') {
      queryClientLogger.warn('[TripTracker] No trip to stop');
      return null;
    }

    return this.finishTrip();
  }

  private async requestPermission(): Promise<void> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  private startGPSTracking(): void {
    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      options
    );
  }

  private handlePosition(position: GeolocationPosition): void {
    const now = Date.now();
    
    if (now - this.lastSampleTime < this.samplingInterval) {
      return;
    }

    const point: RoutePoint = {
      timestamp: new Date(position.timestamp),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      speed: position.coords.speed,
      accuracy: position.coords.accuracy,
      source: 'gps',
    };

    if (!this.isPointValid(point)) {
      queryClientLogger.warn('[TripTracker] Invalid point rejected:', point);
      return;
    }

    this.lastSampleTime = now;
    this.processPoint(point);
  }

  private handleError(error: GeolocationPositionError): void {
    queryClientLogger.error('[TripTracker] GPS error:', error.message);
    this.errorListeners.forEach(listener => listener(error));
  }

  private isPointValid(point: RoutePoint): boolean {
    if (point.accuracy && point.accuracy > CONFIG.MIN_ACCURACY) {
      return false;
    }

    if (this.lastPoint && point.speed !== null) {
      const lastSpeed = this.lastPoint.speed || 0;
      const speedDiff = Math.abs(point.speed - lastSpeed);
      
      if (speedDiff > CONFIG.MAX_SPEED_JUMP) {
        return false;
      }
    }

    return true;
  }

  private async processPoint(point: RoutePoint): Promise<void> {
    const speed = point.speed || this.calculateSpeedFromDistance(point);

    if (this.state === 'monitoring') {
      this.checkAutoStart(speed);
    } else if (this.state === 'recording') {
      await this.addPointToTrip(point);
      this.checkAutoStop(speed);
    }

    this.adjustSamplingRate(speed);
    this.lastPoint = point;
  }

  private calculateSpeedFromDistance(point: RoutePoint): number {
    if (!this.lastPoint) return 0;

    const distance = haversineDistance(
      { lat: this.lastPoint.latitude, lon: this.lastPoint.longitude },
      { lat: point.latitude, lon: point.longitude }
    );

    const timeDiff = (point.timestamp.getTime() - this.lastPoint.timestamp.getTime()) / 1000;
    
    return timeDiff > 0 ? distance / timeDiff : 0;
  }

  private checkAutoStart(speed: number): void {
    const now = Date.now();

    if (speed > CONFIG.AUTO_START_SPEED_THRESHOLD) {
      if (!this.movingStartTime) {
        this.movingStartTime = now;
      } else if (now - this.movingStartTime >= CONFIG.AUTO_START_DURATION) {
        this.autoStartTrip();
      }
    } else {
      this.movingStartTime = null;
    }
  }

  private async autoStartTrip(): Promise<void> {
    queryClientLogger.info('[TripTracker] Auto-starting trip');
    
    const tripId = crypto.randomUUID();
    this.currentTrip = {
      id: tripId,
      startTime: new Date(),
      endTime: null,
      points: this.lastPoint ? [this.lastPoint] : [],
      distanceMeters: 0,
      durationSeconds: 0,
      averageSpeed: 0,
      state: 'recording',
    };

    await indexedDB.saveMileageTrip(this.currentTrip);
    this.setState('recording');
    this.movingStartTime = null;
  }

  private checkAutoStop(speed: number): void {
    const now = Date.now();

    if (speed < CONFIG.AUTO_STOP_SPEED_THRESHOLD) {
      if (!this.stationaryStartTime) {
        this.stationaryStartTime = now;
      } else if (now - this.stationaryStartTime >= CONFIG.AUTO_STOP_DURATION) {
        this.finishTrip();
      }
    } else {
      this.stationaryStartTime = null;
    }
  }

  private async addPointToTrip(point: RoutePoint): Promise<void> {
    if (!this.currentTrip) return;

    this.currentTrip.points.push(point);
    this.currentTrip.distanceMeters = this.calculateDistance(this.currentTrip.points);

    if (this.currentTrip.startTime) {
      const durationMs = point.timestamp.getTime() - this.currentTrip.startTime.getTime();
      this.currentTrip.durationSeconds = Math.floor(durationMs / 1000);
      this.currentTrip.averageSpeed = calculateAverageSpeed(
        this.currentTrip.distanceMeters,
        this.currentTrip.durationSeconds
      );
    }

    await indexedDB.saveMileageTrip(this.currentTrip);
    await indexedDB.saveMileagePoint(this.currentTrip.id, point);

    this.notifyTripUpdate();
  }

  private calculateDistance(points: RoutePoint[]): number {
    if (points.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const dist = haversineDistance(
        { lat: points[i - 1].latitude, lon: points[i - 1].longitude },
        { lat: points[i].latitude, lon: points[i].longitude }
      );
      total += dist;
    }

    return total;
  }

  private async finishTrip(): Promise<TripData | null> {
    if (!this.currentTrip) return null;

    this.currentTrip.endTime = new Date();
    this.currentTrip.state = 'pendingUpload';
    
    await indexedDB.saveMileageTrip(this.currentTrip);
    
    const completedTrip = { ...this.currentTrip };
    this.setState('pendingUpload');
    
    queryClientLogger.info('[TripTracker] Trip finished:', {
      id: completedTrip.id,
      distance: metersToMiles(completedTrip.distanceMeters).toFixed(2) + ' mi',
      duration: completedTrip.durationSeconds + ' s',
      points: completedTrip.points.length,
    });

    this.stationaryStartTime = null;
    return completedTrip;
  }

  private adjustSamplingRate(speed: number): void {
    const isMoving = speed > CONFIG.AUTO_STOP_SPEED_THRESHOLD;
    this.samplingInterval = isMoving
      ? CONFIG.SAMPLING_INTERVAL_MOVING
      : CONFIG.SAMPLING_INTERVAL_STATIONARY;
  }

  private setState(newState: TripState): void {
    this.state = newState;
    this.stateListeners.forEach(listener => listener(newState));
  }

  private notifyTripUpdate(): void {
    if (this.currentTrip) {
      this.tripListeners.forEach(listener => listener(this.currentTrip!));
    }
  }

  public getState(): TripState {
    return this.state;
  }

  public getCurrentTrip(): TripData | null {
    return this.currentTrip;
  }

  public async clearCurrentTrip(): Promise<void> {
    if (this.currentTrip) {
      await indexedDB.markMileageTripSynced(this.currentTrip.id);
      this.currentTrip = null;
      this.setState('idle');
    }
  }

  public onTripUpdate(listener: TripListener): () => void {
    this.tripListeners.add(listener);
    return () => this.tripListeners.delete(listener);
  }

  public onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

export const tripTrackerService = new TripTrackerService();
