import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { useRouter } from 'expo-router';
import { KMTrackerSession } from '@/services/types';

export default function TrackerHistory() {
    const router = useRouter();
    const { getTrackerSessions, data } = useFinance();

    const recentSessions = getTrackerSessions().filter(s => s.status === 'completed').slice(0, 3);

    // Calculate today's and week's totals
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayKm = recentSessions
        .filter(s => new Date(s.startTime) >= today)
        .reduce((sum, s) => sum + s.totalDistanceKm, 0);

    const weekKm = recentSessions
        .filter(s => new Date(s.startTime) >= weekAgo)
        .reduce((sum, s) => sum + s.totalDistanceKm, 0);

    if (recentSessions.length === 0) return null;

    const formatDate = (isoString: string): string => {
        const date = new Date(isoString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sessionDate = new Date(date);
        sessionDate.setHours(0, 0, 0, 0);

        if (sessionDate.getTime() === today.getTime()) {
            return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (sessionDate.getTime() === yesterday.getTime()) {
            return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }

        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    };

    const getVehicleName = (vehicleId?: string): string => {
        if (!vehicleId) return '';
        const vehicle = data.vehicles.find(v => v.id === vehicleId);
        return vehicle ? vehicle.model : '';
    };

    const renderSessionItem = ({ item }: { item: KMTrackerSession }) => (
        <View style={styles.sessionItem}>
            <View style={styles.sessionIcon}>
                <MaterialIcons name="route" size={20} color="#00A85A" />
            </View>
            <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                    <Text style={styles.sessionDistance}>{item.totalDistanceKm.toFixed(2)} km</Text>
                    {item.autoSaved && (
                        <View style={styles.savedBadge}>
                            <MaterialIcons name="check-circle" size={12} color="#10B981" />
                        </View>
                    )}
                </View>
                <Text style={styles.sessionDate}>{formatDate(item.startTime)}</Text>
                {item.vehicleId && (
                    <Text style={styles.sessionVehicle}>{getVehicleName(item.vehicleId)}</Text>
                )}
            </View>
            <View style={styles.sessionDuration}>
                <MaterialIcons name="access-time" size={14} color="#9CA3AF" />
                <Text style={styles.sessionDurationText}>{formatDuration(item.duration)}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Percursos Recentes</Text>
                <TouchableOpacity onPress={() => router.push('/tracker')}>
                    <Text style={styles.viewAllText}>Ver todos</Text>
                </TouchableOpacity>
            </View>

            {/* Summary Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Hoje</Text>
                    <Text style={styles.statValue}>{todayKm.toFixed(1)} km</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Esta Semana</Text>
                    <Text style={styles.statValue}>{weekKm.toFixed(1)} km</Text>
                </View>
            </View>

            {/* Recent Sessions */}
            <FlatList
                data={recentSessions}
                renderItem={renderSessionItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    viewAllText: {
        fontSize: 14,
        color: '#00A85A',
        fontWeight: '500',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00A85A',
    },

    // Session Item
    sessionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    sessionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sessionDistance: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    savedBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1F2937',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sessionDate: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    sessionVehicle: {
        fontSize: 11,
        color: '#6B7280',
        marginTop: 2,
    },
    sessionDuration: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sessionDurationText: {
        fontSize: 12,
        color: '#9CA3AF',
    },

    separator: {
        height: 1,
        backgroundColor: '#374151',
    },
});
