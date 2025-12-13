import * as Location from 'expo-location';

class LocationService {
    private watchId: Location.LocationSubscription | null = null;
    private isWatching: boolean = false;

    /**
     * Request foreground location permissions
     */
    async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            return status === 'granted';
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
            this.watchId = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.Balanced, // Balance between accuracy and battery
                    distanceInterval: 30, // Update every 30 meters
                    timeInterval: 10000, // Or every 10 seconds
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
    stopWatching(): void {
        if (this.watchId) {
            try {
                // Some platforms may not have the remove method
                if (typeof this.watchId.remove === 'function') {
                    this.watchId.remove();
                }
            } catch (error) {
                console.warn('Error removing location watch:', error);
            }
            this.watchId = null;
            this.isWatching = false;
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
