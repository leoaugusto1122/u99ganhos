import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { FinanceData, MaintenanceStatus } from './types';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    } as Notifications.NotificationBehavior),
});

class NotificationService {
    private hasPermission: boolean = false;

    constructor() {
        this.init();
    }

    async init() {
        if (Platform.OS === 'web') return; // Notifications skipped on web for now

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        this.hasPermission = finalStatus === 'granted';

        // Create channels for Android if needed
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    }

    async scheduleNotification(title: string, body: string, trigger: Notifications.NotificationTriggerInput = null) {
        if (!this.hasPermission) return;

        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                color: '#1F2937' // App Theme Dark
            },
            trigger,
        });
    }

    // --- BUSINESS LOGIC FOR NOTIFICATIONS ---

    async runChecks(data: FinanceData) {
        if (!this.hasPermission) return;

        // 1. Maintenance Checks
        this.checkMaintenances(data);

        // 2. Goal Checks
        this.checkDailyGoal(data);
    }

    private checkMaintenances(data: FinanceData) {
        const activeVehicle = data.vehicles.find(v => v.active);
        if (!activeVehicle) return;

        const vehicleMaintenances = data.maintenances.filter(m => m.vehicleId === activeVehicle.id && m.active);

        vehicleMaintenances.forEach(m => {
            // Urgent/Overdue
            if (m.status === 'overdue') {
                this.scheduleNotification(
                    '⚠️ Manutenção Atrasada!',
                    `${m.name} está atrasada! Verifique seu veículo.`
                );
            } else if (m.status === 'urgent') {
                this.scheduleNotification(
                    '🔧 Manutenção Próxima',
                    `${m.name}: faltam poucos KM ou dias.`
                );
            }
        });

        // Oil Change Specific Example (if named 'Troca de Óleo' or similar)
        const oilChange = vehicleMaintenances.find(m => m.name.toLowerCase().includes('óleo') || m.name.toLowerCase().includes('oleo'));
        if (oilChange && oilChange.nextKm) {
            const remaining = oilChange.nextKm - activeVehicle.currentKm;
            if (remaining > 0 && remaining <= 100) {
                this.scheduleNotification(
                    '🛢️ Troca de Óleo',
                    `Faltam apenas ${Math.round(remaining)} km para o prazo ideal!`
                );
            }
        }
    }

    private checkDailyGoal(data: FinanceData) {
        // Basic Goal Check could go here
        // For now we just implement logic framework
    }

    // Called explicitly by FinanceContext when automation generates a cost
    async notifyCostGenerated(description: string, value: number) {
        await this.scheduleNotification(
            '💸 Custo Gerado',
            `${description}: R$ ${value.toFixed(2)} registrado automaticamente.`
        );
    }

    // Called to remind KM registration (Scheduled for e.g. 21:00)
    async scheduleDailyReminder() {
        // Check if already scheduled?
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        const hasReminder = scheduled.some(n => n.content.title === '📝 Registrar KM');

        if (!hasReminder) {
            await this.scheduleNotification(
                '📝 Registrar KM',
                'Esqueceu de registrar os KM de hoje?',
                {
                    hour: 21,
                    minute: 0,
                    repeats: true
                } as any // Cast to any to handle trigger input types gracefully
            );
        }
    }
}

export const notificationService = new NotificationService();
