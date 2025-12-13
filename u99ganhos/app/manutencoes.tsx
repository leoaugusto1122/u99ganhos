import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';

export default function ManutencaoScreen() {
    const router = useRouter();
    const { data, getOverdueMaintenances, getUpcomingMaintenances } = useFinance();

    const stats = useMemo(() => {
        const overdue = getOverdueMaintenances();
        const upcoming = getUpcomingMaintenances();
        const urgent = upcoming.filter(m => m.status === 'urgent');
        const ok = data.maintenances.filter(m => m.active && m.status === 'ok');

        return {
            overdue: overdue.length,
            urgent: urgent.length,
            upcoming: upcoming.length - urgent.length,
            ok: ok.length,
            total: data.maintenances.filter(m => m.active).length
        };
    }, [data.maintenances, getOverdueMaintenances, getUpcomingMaintenances]);

    // Group vehicles with their maintenance status
    const vehiclesWithMaintenances = useMemo(() => {
        return data.vehicles.map(vehicle => {
            const maintenances = data.maintenances.filter(m => m.vehicleId === vehicle.id && m.active);
            const overdue = maintenances.filter(m => m.status === 'overdue').length;
            const urgent = maintenances.filter(m => m.status === 'urgent').length;
            const upcoming = (maintenances.filter(m => m.status === 'upcoming').length);

            return {
                ...vehicle,
                maintenanceCount: maintenances.length,
                overdue,
                urgent,
                upcoming
            };
        });
    }, [data.vehicles, data.maintenances]);

    const renderVehicleCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.vehicleCard}
            onPress={() => router.push(`/manutencao/${item.id}` as any)}
            activeOpacity={0.7}
        >
            <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIcon}>
                    <FontAwesome5
                        name={item.type === 'moto' ? 'motorcycle' : 'car'}
                        size={28}
                        color="#00A85A"
                    />
                </View>
                <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleName}>{item.brand} {item.model}</Text>
                    <Text style={styles.vehicleDetails}>
                        {item.year} • {item.plate} • {item.currentKm.toLocaleString('pt-BR')} km
                    </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
            </View>

            <View style={styles.badgesRow}>
                {item.overdue > 0 && (
                    <View style={[styles.badge, styles.badgeOverdue]}>
                        <MaterialIcons name="error" size={14} color="#FFF" />
                        <Text style={styles.badgeText}>{item.overdue} Atrasada{item.overdue > 1 ? 's' : ''}</Text>
                    </View>
                )}
                {item.urgent > 0 && (
                    <View style={[styles.badge, styles.badgeUrgent]}>
                        <MaterialIcons name="warning" size={14} color="#FFF" />
                        <Text style={styles.badgeText}>{item.urgent} Urgente{item.urgent > 1 ? 's' : ''}</Text>
                    </View>
                )}
                {item.upcoming > 0 && (
                    <View style={[styles.badge, styles.badgeUpcoming]}>
                        <MaterialIcons name="schedule" size={14} color="#FFF" />
                        <Text style={styles.badgeText}>{item.upcoming} Próxima{item.upcoming > 1 ? 's' : ''}</Text>
                    </View>
                )}
                {item.maintenanceCount === 0 && (
                    <Text style={styles.noMaintenanceText}>Nenhuma manutenção cadastrada</Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Manutenções',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
                            <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity onPress={() => router.push('/')} style={{ marginRight: 16 }}>
                            <MaterialIcons name="home" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )
                }}
            />

            <ScrollView style={styles.content}>
                {/* Summary Cards */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, styles.summaryCardOverdue]}>
                            <MaterialIcons name="error-outline" size={24} color="#EF4444" />
                            <Text style={styles.summaryValue}>{stats.overdue}</Text>
                            <Text style={styles.summaryLabel}>Atrasadas</Text>
                        </View>
                        <View style={[styles.summaryCard, styles.summaryCardUrgent]}>
                            <MaterialIcons name="warning-amber" size={24} color="#F59E0B" />
                            <Text style={styles.summaryValue}>{stats.urgent}</Text>
                            <Text style={styles.summaryLabel}>Urgentes</Text>
                        </View>
                    </View>
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, styles.summaryCardUpcoming]}>
                            <MaterialIcons name="event" size={24} color="#3B82F6" />
                            <Text style={styles.summaryValue}>{stats.upcoming}</Text>
                            <Text style={styles.summaryLabel}>Próximas</Text>
                        </View>
                        <View style={[styles.summaryCard, styles.summaryCardOk]}>
                            <MaterialIcons name="check-circle-outline" size={24} color="#10B981" />
                            <Text style={styles.summaryValue}>{stats.ok}</Text>
                            <Text style={styles.summaryLabel}>Em Dia</Text>
                        </View>
                    </View>
                </View>

                {/* Vehicles List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Seus Veículos</Text>
                    {vehiclesWithMaintenances.length === 0 ? (
                        <View style={styles.emptyState}>
                            <FontAwesome5 name="car" size={48} color="#6B7280" />
                            <Text style={styles.emptyText}>Nenhum veículo cadastrado</Text>
                            <Text style={styles.emptyHint}>Cadastre um veículo para gerenciar manutenções</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={vehiclesWithMaintenances}
                            renderItem={renderVehicleCard}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    content: { flex: 1 },

    summaryContainer: { padding: 16 },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    summaryCard: {
        flex: 1,
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderLeftWidth: 4,
    },
    summaryCardOverdue: { borderLeftColor: '#EF4444' },
    summaryCardUrgent: { borderLeftColor: '#F59E0B' },
    summaryCardUpcoming: { borderLeftColor: '#3B82F6' },
    summaryCardOk: { borderLeftColor: '#10B981' },
    summaryValue: { fontSize: 28, fontWeight: '700', color: '#FFF', marginTop: 8 },
    summaryLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

    section: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 12 },

    vehicleCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    vehicleIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehicleInfo: { flex: 1, marginLeft: 12 },
    vehicleName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    vehicleDetails: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },

    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    badgeOverdue: { backgroundColor: '#EF4444' },
    badgeUrgent: { backgroundColor: '#F59E0B' },
    badgeUpcoming: { backgroundColor: '#3B82F6' },
    badgeText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
    noMaintenanceText: { fontSize: 14, color: '#6B7280', fontStyle: 'italic' },

    emptyState: { alignItems: 'center', padding: 32 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 12 },
    emptyHint: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
