import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';

export default function VehicleDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data, getVehicleMaintenances } = useFinance();

    const vehicle = useMemo(() => {
        return data.vehicles.find(v => v.id === id);
    }, [data.vehicles, id]);

    const vehicleCosts = useMemo(() => {
        return data.costs
            .filter(cost => cost.vehicleId === id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [data.costs, id]);

    const vehicleConfigs = useMemo(() => {
        return data.costConfigs.filter(config => config.vehicleId === id && config.active);
    }, [data.costConfigs, id]);

    const vehicleMaintenances = useMemo(() => {
        return getVehicleMaintenances(id || '');
    }, [id, data.maintenances, getVehicleMaintenances]);

    const stats = useMemo(() => {
        const totalCosts = vehicleCosts.reduce((sum, cost) => sum + cost.value, 0);
        const avgCostPerMonth = vehicleCosts.length > 0
            ? totalCosts / Math.max(1, new Set(vehicleCosts.map(c => c.date.substring(0, 7))).size)
            : 0;

        // Maintenance stats
        const maintenanceStats = {
            overdue: vehicleMaintenances.filter(m => m.active && m.status === 'overdue').length,
            urgent: vehicleMaintenances.filter(m => m.active && m.status === 'urgent').length,
            upcoming: vehicleMaintenances.filter(m => m.active && m.status === 'upcoming').length,
            total: vehicleMaintenances.filter(m => m.active).length
        };

        return {
            totalCosts,
            avgCostPerMonth,
            totalRecords: vehicleCosts.length,
            activeConfigs: vehicleConfigs.length,
            maintenanceStats
        };
    }, [vehicleCosts, vehicleConfigs, vehicleMaintenances]);

    if (!vehicle) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: 'Veículo não encontrado' }} />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color="#EF4444" />
                    <Text style={styles.errorText}>Veículo não encontrado</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Voltar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const renderCostItem = ({ item }: { item: any }) => (
        <View style={styles.costItem}>
            <View style={styles.costHeader}>
                <View style={styles.costIcon}>
                    <MaterialIcons
                        name={item.typeSnapshot === 'km_based' ? 'build' : 'attach-money'}
                        size={20}
                        color="#00A85A"
                    />
                </View>
                <View style={styles.costInfo}>
                    <Text style={styles.costCategory}>{item.categoryName}</Text>
                    {item.description && (
                        <Text style={styles.costDescription}>{item.description}</Text>
                    )}
                    <Text style={styles.costDate}>
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                    </Text>
                </View>
                <Text style={styles.costValue}>
                    R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `${vehicle.brand} ${vehicle.model}`,
                    headerBackTitle: 'Voltar',
                    headerRight: () => (
                        <TouchableOpacity onPress={() => router.push('/')} style={{ marginRight: 8 }}>
                            <MaterialIcons name="home" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )
                }}
            />

            <ScrollView style={styles.content}>
                {/* Vehicle Header Card */}
                <View style={styles.headerCard}>
                    <View style={styles.vehicleIconLarge}>
                        <FontAwesome5
                            name={vehicle.type === 'moto' ? 'motorcycle' : 'car'}
                            size={48}
                            color="#00A85A"
                        />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle}>{vehicle.brand} {vehicle.model}</Text>
                        <Text style={styles.headerSubtitle}>{vehicle.year} • {vehicle.plate}</Text>
                        <View style={styles.headerStats}>
                            <View style={styles.headerStat}>
                                <MaterialIcons name="speed" size={16} color="#9CA3AF" />
                                <Text style={styles.headerStatText}>
                                    {vehicle.currentKm.toLocaleString('pt-BR')} km
                                </Text>
                            </View>
                            {vehicle.avgKmPerLiter && (
                                <View style={styles.headerStat}>
                                    <MaterialIcons name="local-gas-station" size={16} color="#9CA3AF" />
                                    <Text style={styles.headerStatText}>{vehicle.avgKmPerLiter} km/L</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <MaterialIcons name="attach-money" size={24} color="#10B981" />
                        <Text style={styles.statValue}>
                            R$ {stats.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </Text>
                        <Text style={styles.statLabel}>Total Gasto</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialIcons name="trending-up" size={24} color="#3B82F6" />
                        <Text style={styles.statValue}>
                            R$ {stats.avgCostPerMonth.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </Text>
                        <Text style={styles.statLabel}>Média/Mês</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialIcons name="receipt" size={24} color="#F59E0B" />
                        <Text style={styles.statValue}>{stats.totalRecords}</Text>
                        <Text style={styles.statLabel}>Lançamentos</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialIcons name="settings" size={24} color="#8B5CF6" />
                        <Text style={styles.statValue}>{stats.activeConfigs}</Text>
                        <Text style={styles.statLabel}>Custos Ativos</Text>
                    </View>
                </View>

                {/* Maintenance Summary */}
                {stats.maintenanceStats.total > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="build" size={24} color="#FFF" />
                            <Text style={styles.sectionTitle}>Manutenções</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.maintenanceCard}
                            onPress={() => router.push(`/manutencao/${id}` as any)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.maintenanceSummary}>
                                {stats.maintenanceStats.overdue > 0 && (
                                    <View style={styles.maintenanceBadge}>
                                        <MaterialIcons name="error" size={16} color="#EF4444" />
                                        <Text style={[styles.maintenanceBadgeText, { color: '#EF4444' }]}>
                                            {stats.maintenanceStats.overdue} Atrasada{stats.maintenanceStats.overdue > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                )}
                                {stats.maintenanceStats.urgent > 0 && (
                                    <View style={styles.maintenanceBadge}>
                                        <MaterialIcons name="warning" size={16} color="#F59E0B" />
                                        <Text style={[styles.maintenanceBadgeText, { color: '#F59E0B' }]}>
                                            {stats.maintenanceStats.urgent} Urgente{stats.maintenanceStats.urgent > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                )}
                                {stats.maintenanceStats.upcoming > 0 && (
                                    <View style={styles.maintenanceBadge}>
                                        <MaterialIcons name="schedule" size={16} color="#3B82F6" />
                                        <Text style={[styles.maintenanceBadgeText, { color: '#3B82F6' }]}>
                                            {stats.maintenanceStats.upcoming} Próxima{stats.maintenanceStats.upcoming > 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.maintenanceAction}>
                                <Text style={styles.maintenanceActionText}>Ver Todas</Text>
                                <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Cost History */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="history" size={24} color="#FFF" />
                        <Text style={styles.sectionTitle}>Histórico de Custos</Text>
                    </View>
                    {vehicleCosts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="receipt-long" size={48} color="#6B7280" />
                            <Text style={styles.emptyText}>Nenhum custo registrado</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={vehicleCosts}
                            renderItem={renderCostItem}
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

    headerCard: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        margin: 16,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
    },
    vehicleIconLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: { flex: 1, marginLeft: 16 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    headerSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    headerStats: { flexDirection: 'row', marginTop: 12, gap: 16 },
    headerStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    headerStatText: { fontSize: 14, color: '#D1D5DB', fontWeight: '500' },

    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: { fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 8 },
    statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

    section: { margin: 16, marginTop: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },

    maintenanceCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
    },
    maintenanceSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    maintenanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#374151',
        gap: 4,
    },
    maintenanceBadgeText: { fontSize: 12, fontWeight: '600' },
    maintenanceAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#374151',
    },
    maintenanceActionText: { fontSize: 14, fontWeight: '600', color: '#00A85A' },

    costItem: {
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    costHeader: { flexDirection: 'row', alignItems: 'center' },
    costIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    costInfo: { flex: 1, marginLeft: 12 },
    costCategory: { fontSize: 16, fontWeight: '600', color: '#FFF' },
    costDescription: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
    costDate: { fontSize: 12, color: '#6B7280', marginTop: 4 },
    costValue: { fontSize: 18, fontWeight: '700', color: '#10B981' },

    emptyState: { alignItems: 'center', padding: 32 },
    emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },

    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    errorText: { fontSize: 18, fontWeight: '600', color: '#EF4444', marginTop: 16 },
    backButton: { marginTop: 24, backgroundColor: '#1F2937', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    backButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
