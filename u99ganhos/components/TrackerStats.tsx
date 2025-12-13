import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';

type Period = 'week' | 'month';

export default function TrackerStats() {
    const { getTrackerSessions } = useFinance();
    const [period, setPeriod] = useState<Period>('week');

    const allSessions = getTrackerSessions().filter(s => s.status === 'completed');

    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const getDateRange = (type: Period) => {
        if (type === 'week') {
            const weekStart = new Date(todayStart);
            weekStart.setDate(weekStart.getDate() - 7);
            const prevWeekStart = new Date(weekStart);
            prevWeekStart.setDate(prevWeekStart.getDate() - 7);
            return { start: weekStart, prevStart: prevWeekStart, days: 7 };
        } else {
            const monthStart = new Date(todayStart);
            monthStart.setDate(monthStart.getDate() - 30);
            const prevMonthStart = new Date(monthStart);
            prevMonthStart.setDate(prevMonthStart.getDate() - 30);
            return { start: monthStart, prevStart: prevMonthStart, days: 30 };
        }
    };

    const { start, prevStart, days } = getDateRange(period);

    // Calculate current period stats
    const currentSessions = allSessions.filter(s =>
        new Date(s.startTime) >= start
    );
    const currentTotal = currentSessions.reduce((sum, s) => sum + s.totalDistanceKm, 0);
    const currentAvg = currentTotal / days;

    // Calculate previous period stats
    const prevSessions = allSessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return sessionDate >= prevStart && sessionDate < start;
    });
    const prevTotal = prevSessions.reduce((sum, s) => sum + s.totalDistanceKm, 0);
    const prevAvg = prevTotal / days;

    // Calculate comparison
    const totalChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
    const avgChange = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0;

    // Generate daily data for graph (last 7 or 30 days)
    const getDailyData = () => {
        const data = [];
        for (let i = days - 1; i >= 0; i--) {
            const day = new Date(todayStart);
            day.setDate(day.getDate() - i);
            const nextDay = new Date(day);
            nextDay.setDate(nextDay.getDate() + 1);

            const dayKm = allSessions
                .filter(s => {
                    const sessionDate = new Date(s.startTime);
                    return sessionDate >= day && sessionDate < nextDay;
                })
                .reduce((sum, s) => sum + s.totalDistanceKm, 0);

            data.push({
                day: day.getDate(),
                km: dayKm,
                label: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : `${day.getDate()}`
            });
        }
        return data;
    };

    const dailyData = getDailyData();
    const maxKm = Math.max(...dailyData.map(d => d.km), 1);

    const renderGraph = () => {
        // Show only last 7 days for visual clarity
        const graphData = period === 'week' ? dailyData : dailyData.slice(-7);

        return (
            <View style={styles.graph}>
                <View style={styles.graphBars}>
                    {graphData.map((item, index) => {
                        const height = (item.km / maxKm) * 100;
                        const isToday = item.label === 'Hoje';

                        return (
                            <View key={index} style={styles.barContainer}>
                                <View style={styles.barWrapper}>
                                    {item.km > 0 && (
                                        <Text style={styles.barValue}>{item.km.toFixed(0)}</Text>
                                    )}
                                    <View
                                        style={[
                                            styles.bar,
                                            {
                                                height: `${Math.max(height, 2)}%`,
                                                backgroundColor: isToday ? '#00A85A' : '#374151'
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                                    {item.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
                <View style={styles.graphFooter}>
                    <Text style={styles.graphFooterText}>Últimos {graphData.length} dias</Text>
                </View>
            </View>
        );
    };

    const renderComparison = (value: number) => {
        if (value === 0) return null;
        const isPositive = value > 0;
        return (
            <View style={[styles.comparison, isPositive ? styles.comparisonPositive : styles.comparisonNegative]}>
                <MaterialIcons
                    name={isPositive ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={isPositive ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.comparisonText, isPositive ? styles.comparisonTextPositive : styles.comparisonTextNegative]}>
                    {Math.abs(value).toFixed(1)}%
                </Text>
            </View>
        );
    };

    if (allSessions.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Estatísticas GPS</Text>
                <View style={styles.periodSelector}>
                    <TouchableOpacity
                        style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
                        onPress={() => setPeriod('week')}
                    >
                        <Text style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}>
                            Semana
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
                        onPress={() => setPeriod('month')}
                    >
                        <Text style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}>
                            Mês
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={styles.statHeader}>
                        <MaterialIcons name="route" size={18} color="#00A85A" />
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <Text style={styles.statValue}>{currentTotal.toFixed(1)} km</Text>
                    {renderComparison(totalChange)}
                </View>

                <View style={styles.statCard}>
                    <View style={styles.statHeader}>
                        <MaterialIcons name="analytics" size={18} color="#3B82F6" />
                        <Text style={styles.statLabel}>Média/dia</Text>
                    </View>
                    <Text style={styles.statValue}>{currentAvg.toFixed(1)} km</Text>
                    {renderComparison(avgChange)}
                </View>

                <View style={styles.statCard}>
                    <View style={styles.statHeader}>
                        <MaterialIcons name="directions-car" size={18} color="#F59E0B" />
                        <Text style={styles.statLabel}>Viagens</Text>
                    </View>
                    <Text style={styles.statValue}>{currentSessions.length}</Text>
                    <Text style={styles.statSubtext}>{period === 'week' ? '7 dias' : '30 dias'}</Text>
                </View>
            </View>

            {/* Graph */}
            {renderGraph()}

            {/* Period Comparison */}
            <View style={styles.comparisonCard}>
                <Text style={styles.comparisonTitle}>
                    {period === 'week' ? '📊 vs. Semana Anterior' : '📊 vs. Mês Anterior'}
                </Text>
                <View style={styles.comparisonRow}>
                    <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Período Atual</Text>
                        <Text style={styles.comparisonValue}>{currentTotal.toFixed(1)} km</Text>
                    </View>
                    <View style={styles.comparisonDivider} />
                    <View style={styles.comparisonItem}>
                        <Text style={styles.comparisonLabel}>Período Anterior</Text>
                        <Text style={styles.comparisonValue}>{prevTotal.toFixed(1)} km</Text>
                    </View>
                </View>
            </View>
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
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },

    periodSelector: {
        flexDirection: 'row',
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 2,
    },
    periodButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    periodButtonActive: {
        backgroundColor: '#00A85A',
    },
    periodButtonText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
    },
    periodButtonTextActive: {
        color: '#FFF',
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 12,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    statSubtext: {
        fontSize: 10,
        color: '#6B7280',
    },

    comparison: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    comparisonPositive: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    comparisonNegative: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    comparisonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    comparisonTextPositive: {
        color: '#10B981',
    },
    comparisonTextNegative: {
        color: '#EF4444',
    },

    // Graph
    graph: {
        backgroundColor: '#111827',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    graphBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 120,
        gap: 4,
        marginBottom: 8,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: '100%',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        minHeight: 2,
    },
    barValue: {
        fontSize: 9,
        color: '#9CA3AF',
        marginBottom: 2,
        fontWeight: '600',
    },
    barLabel: {
        fontSize: 10,
        color: '#6B7280',
        marginTop: 4,
    },
    barLabelToday: {
        color: '#00A85A',
        fontWeight: '600',
    },
    graphFooter: {
        alignItems: 'center',
    },
    graphFooterText: {
        fontSize: 11,
        color: '#6B7280',
    },

    // Comparison Card
    comparisonCard: {
        backgroundColor: '#374151',
        borderRadius: 8,
        padding: 12,
    },
    comparisonTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 12,
    },
    comparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    comparisonItem: {
        flex: 1,
        alignItems: 'center',
    },
    comparisonLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    comparisonValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
    },
    comparisonDivider: {
        width: 1,
        height: 30,
        backgroundColor: '#4B5563',
    },
});
