import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { databaseService } from './database';

const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error('Background location task error:', error);
        return;
    }

    if (data) {
        const { locations } = data;
        // Process locations
        if (locations && locations.length > 0) {
            const location = locations[locations.length - 1]; // Use the most recent location

            console.log('Received background location:', location);

            try {
                // Need to check if there is an active session
                // However, TaskManager runs in a separate context, we can't easily access React state or Context
                // We MUST rely on the database or a persistent store (AsyncStorage/SQLite)

                // Let's assume databaseService can be initialized or is robust enough
                const activeSession = await databaseService.getActiveTrackerSession();

                if (activeSession && activeSession.status === 'active') {
                    // Add GPS point
                    const gpsPoint = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        timestamp: new Date(location.timestamp).toISOString(),
                        accuracy: location.coords.accuracy || undefined,
                        speed: location.coords.speed || undefined,
                    };

                    await databaseService.addGPSPoint(activeSession.id, gpsPoint);

                    // Optionally calculate incremental distance logic here if DB service doesn't handle it automatically on point add.
                    // For now, let's assume the foreground UI recalculates when it wakes up, 
                    // OR we can implement a specific background update method in database service.

                    // Update Notification
                    await updateStickyNotification(true);
                } else if (activeSession && activeSession.status === 'paused') {
                    await updateStickyNotification(false);
                } else {
                    // No session, maybe stop updates?
                    // Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
                }
            } catch (err) {
                console.error('Error processing background location:', err);
            }
        }
    }
});

async function updateStickyNotification(isActive: boolean) {
    // We can't easily calculate total KM in background without querying all points.
    // For MVP, we might just show "Rastreando..." or last known state if accessible.
    // Or we query the session duration/distance from DB if possible.

    // Simplification: Just show Active status.
    // Note: The foreground service notification title/body is configured in app.json for Android.
    // Updating it dynamically requires re-issuing a notification on a channel.

    // On Android, 'expo-location' manages its own foreground service notification.
    // We can't easily granularly update ONLY the text of THAT persistent notification from here easily
    // without native modules or advanced config.
    // However, we can issue *another* notification or try to rely on the static config.

    // For now, relies on the static "Tracking..." message active.
}

export const BackgroundLocation = {
    TASK_NAME: LOCATION_TASK_NAME,
};
