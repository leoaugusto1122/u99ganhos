import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { FinanceData } from './types';

// Configure how notifications behave when the app is foregrounded
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

class NotificationService {
    private hasPermission: boolean = false;

    constructor() {
        this.init();
    }

    async init() {
        if (Platform.OS === 'web') return;

        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    console.log('Failed to get push token for push notification!');
                    this.hasPermission = false;
                    return;
                }
                this.hasPermission = true;
            } else {
                console.log('Must use physical device for Push Notifications');
            }
        } catch (e) {
            console.log("Error initializing notifications:", e);
        }
    }

    async scheduleNotification(title: string, body: string, trigger: any = null) {
        if (!this.hasPermission && Platform.OS !== 'web') {
            // Try re-init or just log
            console.log("No permission to schedule notification");
            return;
        }

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: true,
                },
                trigger,
            });
        } catch (e) {
            console.error("Failed to schedule notification:", e);
        }
    }

    // --- BUSINESS LOGIC FOR NOTIFICATIONS ---

    async runChecks(data: FinanceData) {
        if (!this.hasPermission) return;

        // 1. Maintenance Checks
        const upcomingMaintenances = data.maintenances.filter(m => m.status === 'upcoming');
        for (const m of upcomingMaintenances) {
            // Check if very close (e.g., within 100km or 7 days)
            // This logic would need context of current vehicle KM and Date.
            // For now, relies on 'upcoming' status which is set elsewhere.
            // We can notify generic reminders if status changed recently?
            // Better: check specific thresholds here if data provides it.
        }

        // 2. Overdue Maintenances
        const overdueMaintenances = data.maintenances.filter(m => m.status === 'overdue');
        if (overdueMaintenances.length > 0) {
            this.scheduleNotification(
                "Manutenção Atrasada!",
                `Você tem ${overdueMaintenances.length} manutenção(ões) atrasada(s). Verifique agora.`
            );
        }
    }

    // Called explicitly by FinanceContext when automation generates a cost
    async notifyCostGenerated(description: string, value: number) {
        await this.scheduleNotification(
            "Custo Gerado Automaticamente",
            `${description} - R$ ${value.toFixed(2)}`
        );
    }

    // Called to remind KM registration
    async scheduleDailyReminder() {
        // Cancel previous daily reminders to avoid duplicates?
        // For simplicity, just schedule one if not exists.
        // Better: Cancel all 'daily-reminder' identifiers if possible.
        // Notifications.cancelAllScheduledNotificationsAsync(); // CAREFUL!

        // Just schedule a notification for 8 PM if not already
        const trigger: Notifications.DailyTriggerInput = {
            hour: 20,
            minute: 0,
            type: Notifications.SchedulableTriggerInputTypes.DAILY
        };

        await this.scheduleNotification(
            "Lembrete Diário",
            "Não se esqueça de registrar seu KM e Ganhos de hoje!",
            trigger
        );
    }
}

export const notificationService = new NotificationService();
