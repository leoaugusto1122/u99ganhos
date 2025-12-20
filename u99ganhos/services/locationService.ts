import * as Location from 'expo-location';

class LocationService {
    private watchId: Location.LocationSubscription | null = null;
    private isWatching: boolean = false;

    /**
     * Request foreground location permissions
     */
    /**
     * Request permissions (foreground and background)
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            if (fgStatus !== 'granted') return false;

            // Optional: Request background permissions if needed immediately, 
            // but often better to request only when enabling background mode
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
            return bgStatus === 'granted';
        } catch (error) {
            console.error('Error requesting location permissions:', error);
            return false;
        }
    }

    /**
     * Check if permissions are granted
     */
    async hasPermissions(): Promise<boolean> {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Error checking location permissions:', error);
            return false;
        }
    }

    /**
     * Start watching location with optimized settings for battery life
     */
    /**
     * Start watching location in background
     */
    async startWatching(
        callback: (location: Location.LocationObject) => void,
        onError?: (error: Error) => void
    ): Promise<boolean> {
        if (this.isWatching) {
            console.warn('Already watching location');
            return true;
        }

        const hasPermission = await this.hasPermissions();
        if (!hasPermission) {
            console.error('Location permission not granted');
            return false;
        }

        try {
            // Start background location updates
            await Location.startLocationUpdatesAsync('background-location-task', {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                    notificationTitle: "Sessão de Trabalho Ativa",
                    notificationBody: "Rastreando seu percurso...",
                    notificationColor: "#00A85A",
                },
                // activityType: Location.ActivityType.AutomotiveNavigation, // iOS optimized
            });

            // Also keep a foreground listener for UI updates while app is open
            this.watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                    timeInterval: 5000,
                },
                (location) => {
                    callback(location);
                }
            );

            this.isWatching = true;
            return true;
        } catch (error) {
            console.error('Error starting location watch:', error);
            if (onError) {
                onError(error as Error);
            }
            return false;
        }
    }

    /**
     * Stop watching location
     */
    /**
     * Stop watching location
     */
    async stopWatching(): Promise<void> {
        try {
            // Stop background task
            const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync('background-location-task');
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync('background-location-task');
            }

            // Stop foreground watcher
            if (this.watchId) {
                if (typeof this.watchId.remove === 'function') {
                    this.watchId.remove();
                }
                this.watchId = null;
            }

            this.isWatching = false;
        } catch (error) {
            console.warn('Error removing location watch:', error);
        }
    }

    /**
     * Get current location once
     */
    async getCurrentLocation(): Promise<Location.LocationObject | null> {
        const hasPermission = await this.hasPermissions();
        if (!hasPermission) {
            console.error('Location permission not granted');
            return null;
        }

        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            return location;
        } catch (error) {
            console.error('Error getting current location:', error);
            return null;
        }
    }

    /**
     * Check if currently watching location
     */
    isCurrentlyWatching(): boolean {
        return this.isWatching;
    }
}

export const locationService = new LocationService();
