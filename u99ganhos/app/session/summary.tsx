import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { EarningsRecord, KMTrackerSession } from '@/services/types';
import EarningsModal from '@/components/EarningsModal';

export default function SessionSummaryScreen() {
    const router = useRouter();
    const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
    const { data, addEarningsRecord, deleteEarningsRecord, getTotalMonthlyCosts, getDailyTarget } = useFinance();

    const [session, setSession] = useState<KMTrackerSession | undefined>(undefined);
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadSession();
    }, [sessionId, data]);

    const loadSession = () => {
        if (sessionId) {
            const found = data.kmTrackerSessions.find(s => s.id === sessionId);
            setSession(found);
        } else {
            // Fallback: Last completed session
            const last = data.kmTrackerSessions
                .filter(s => s.status === 'completed')
                .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
            setSession(last);
        }
    };

    const getSessionEarnings = () => {
        if (!session) return [];
        return data.earningsRecords.filter(r => r.sessionId === session.id);
    };

    const earnings = getSessionEarnings();
    const totalGross = earnings.reduce((sum, r) => sum + r.grossEarnings, 0);

    const formatDuration = (ms: number) => {
        const totalMinutes = Math.floor(ms / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleAddEarning = (record: any) => {
        if (!session) return;
        addEarningsRecord({
            ...record,
            sessionId: session.id,
        });
        setModalVisible(false);
    };

    const handleFinish = () => {
        router.replace('/(tabs)');
    };

    if (!session) {
        return (
            <View style={styles.container}>
                <Text style={{ color: '#FFF' }}>Carregando sessão...</Text>
            </View>
        );
    }

    // --- Intelligent Metrics Calculation ---
    const vehicle = data.vehicles.find(v => v.id === session.vehicleId);

    // 1. Durations
    const durationHours = session.duration / (1000 * 60 * 60);

    // 2. Costs
    const variableCosts = earnings.reduce((sum, r) => sum + (r.totalVariableCosts || 0), 0);
    const monthlyFixedCosts = getTotalMonthlyCosts();
    const monthlyHoursInfo = data.workSchedule?.summary?.hoursPerMonth || 160;
    const fixedCostPerHour = monthlyFixedCosts / (monthlyHoursInfo || 1);
    const fixedCostShare = fixedCostPerHour * durationHours;

    const totalCosts = variableCosts + fixedCostShare;
    const netProfit = totalGross - totalCosts;

    const hourlyRate = durationHours > 0.1 ? netProfit / durationHours : 0;
    const costPerKm = session.totalDistanceKm > 0 ? totalCosts / session.totalDistanceKm : 0;

    // 3. Comparison Logic
    const getComparison = () => {
        const relevantSessions = data.kmTrackerSessions
            .filter(s => s.id !== session.id && s.status === 'completed' && s.duration > 1000 * 60 * 30); // > 30 mins

        if (relevantSessions.length < 3) return { hourly: 'neutral', costPerKm: 'neutral' };

        let sumHourly = 0;
        let count = 0;

        relevantSessions.forEach(s => {
            const dHours = s.duration / (1000 * 60 * 60);
            const sEarnings = data.earningsRecords.filter(r => r.sessionId === s.id);
            const sGross = sEarnings.reduce((acc, r) => acc + r.grossEarnings, 0);

            if (dHours > 0 && sGross > 0) {
                sumHourly += (sGross / dHours);
                count++;
            }
        });

        const avgHourly = count > 0 ? sumHourly / count : 0;
        const currentGrossHourly = durationHours > 0 ? totalGross / durationHours : 0;

        return {
            hourly: currentGrossHourly > avgHourly ? 'better' : 'worse',
            costPerKm: 'neutral'
        };
    };

    const comparison = getComparison();

    const calculateScore = () => {
        let score = 5;
        if (hourlyRate > 30) score += 2;
        if (hourlyRate > 50) score += 1;
        if (costPerKm < 1.0) score += 1;
        if (costPerKm < 0.8) score += 1;
        if (netProfit < 0) score = 0;
        return Math.min(score, 10);
    };
    const performanceScore = calculateScore();

    const dailyTarget = getDailyTarget(new Date(session.startTime).toISOString());
    const dailyGoalProgress = dailyTarget > 0 ? (totalGross / dailyTarget) * 100 : 0;

    return (
        <View style={styles.container}>
            {/* Smart Summary Header */}
            <View style={styles.summaryHeader}>
                <View>
                    <Text style={styles.summaryDate}>
                        {new Date(session.startTime).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </Text>
                    <Text style={styles.summaryTime}>
                        {new Date(session.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} -
                        {session.endTime ? new Date(session.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Agora'}
                    </Text>
                </View>
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{performanceScore}/10</Text>
                    <Text style={styles.scoreLabel}>Eficiência</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadSession(); setRefreshing(false); }} tintColor="#FFF" />}>

                {/* Main Financial Result */}
                <View style={styles.financialCard}>
                    <Text style={styles.financialLabel}>LUCRO LÍQUIDO DA SESSÃO</Text>
                    <Text style={styles.financialValue}>{formatCurrency(netProfit)}</Text>

                    <View style={styles.financialRow}>
                        <View style={styles.financialItem}>
                            <Text style={styles.financialSubLabel}>Ganho Bruto</Text>
                            <Text style={styles.financialSubValue}>{formatCurrency(totalGross)}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.financialItem}>
                            <Text style={styles.financialSubLabel}>Custos Totais</Text>
                            <Text style={[styles.financialSubValue, { color: '#EF4444' }]}>- {formatCurrency(totalCosts)}</Text>
                        </View>
                    </View>

                    <View style={styles.costBreakdown}>
                        <Text style={styles.costDetail}>Var.: {formatCurrency(variableCosts)} • Fixo (Est.): {formatCurrency(fixedCostShare)}</Text>
                    </View>
                </View>

                {/* Intelligent Metrics Grid */}
                <Text style={styles.sectionTitle}>Análise de Desempenho</Text>
                <View style={styles.metricsGrid}>
                    {/* Ganho/Hora */}
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Ganho/Hora</Text>
                        <Text style={styles.metricValue}>{formatCurrency(hourlyRate)}</Text>
                        <View style={[styles.badge, comparison.hourly === 'better' ? styles.badgeGreen : styles.badgeRed]}>
                            <MaterialIcons
                                name={comparison.hourly === 'better' ? "arrow-upward" : "arrow-downward"}
                                size={12}
                                color={comparison.hourly === 'better' ? "#065F46" : "#7F1D1D"}
                            />
                            <Text style={[styles.badgeText, comparison.hourly === 'better' ? styles.badgeTextGreen : styles.badgeTextRed]}>
                                {comparison.hourly === 'better' ? 'Acima da média' : 'Abaixo da média'}
                            </Text>
                        </View>
                    </View>

                    {/* Custo/KM */}
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Custo/KM</Text>
                        <Text style={styles.metricValue}>{formatCurrency(costPerKm)}</Text>
                        <View style={[styles.badge, comparison.costPerKm === 'better' ? styles.badgeGreen : styles.badgeRed]}>
                            <Text style={[styles.badgeText, comparison.costPerKm === 'better' ? styles.badgeTextGreen : styles.badgeTextRed]}>
                                {comparison.costPerKm === 'better' ? 'Ótimo' : 'Alto'}
                            </Text>
                        </View>
                    </View>

                    {/* KM Rodado */}
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>KM Total</Text>
                        <Text style={styles.metricValue}>{session.totalDistanceKm.toFixed(1)} km</Text>
                        <Text style={styles.metricSub}>{vehicle ? vehicle.model : ''}</Text>
                    </View>

                    {/* Tempo */}
                    <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Duração</Text>
                        <Text style={styles.metricValue}>{formatDuration(session.duration)}</Text>
                    </View>
                </View>

                {/* Goal Contribution */}
                <View style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <Text style={styles.goalTitle}>Meta Diária</Text>
                        <Text style={styles.goalPercentage}>{dailyGoalProgress.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.min(dailyGoalProgress, 100)}%` }]} />
                    </View>
                    <Text style={styles.goalFooter}>
                        Esta sessão contribuiu com <Text style={{ fontWeight: 'bold', color: '#10B981' }}>{formatCurrency(totalGross)}</Text> para sua meta de {formatCurrency(dailyTarget)}.
                    </Text>
                </View>

                {/* Earnings List */}
                <View style={styles.earningsHeader}>
                    <Text style={styles.sectionTitle}>Extrato da Sessão</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Text style={styles.addLink}>+ Adicionar</Text>
                    </TouchableOpacity>
                </View>

                {earnings.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Nenhum ganho registrado.</Text>
                    </View>
                ) : (
                    earnings.map((earning) => (
                        <View key={earning.id} style={styles.earningRow}>
                            <View style={styles.earningLeft}>
                                <View style={[styles.appDot, { backgroundColor: data.faturamentoApps.find(a => a.id === earning.appId)?.color || '#9CA3AF' }]} />
                                <View>
                                    <Text style={styles.earningAppName}>{earning.appName}</Text>
                                    <Text style={styles.earningTimeList}>{new Date(earning.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                            </View>
                            <View style={styles.earningRight}>
                                <Text style={styles.earningVal}>{formatCurrency(earning.grossEarnings)}</Text>
                                <TouchableOpacity onPress={() => Alert.alert('Excluir', 'Confirmar exclusão?', [{ text: 'Cancelar' }, { text: 'Excluir', onPress: () => deleteEarningsRecord(earning.id), style: 'destructive' }])}>
                                    <MaterialIcons name="close" size={16} color="#6B7280" style={{ marginLeft: 8, opacity: 0.5 }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                    <Text style={styles.finishButtonText}>Concluir Análise</Text>
                </TouchableOpacity>
            </View>

            <EarningsModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleAddEarning}
                initialData={null}
                sessionId={session.id}
                defaultVehicleId={session.vehicleId}
                defaultDate={session.startTime}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    summaryHeader: { padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F2937' },
    summaryDate: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textTransform: 'capitalize' },
    summaryTime: { color: '#9CA3AF', fontSize: 14 },
    scoreBadge: { alignItems: 'center', backgroundColor: '#374151', padding: 8, borderRadius: 8 },
    scoreText: { color: '#10B981', fontWeight: '900', fontSize: 16 },
    scoreLabel: { color: '#9CA3AF', fontSize: 10 },

    financialCard: { margin: 16, padding: 20, backgroundColor: '#064E3B', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#059669' },
    financialLabel: { color: '#6EE7B7', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    financialValue: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginBottom: 16 },
    financialRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' },
    financialItem: { alignItems: 'center' },
    financialSubLabel: { color: '#A7F3D0', fontSize: 12 },
    financialSubValue: { color: '#FFF', fontSize: 18, fontWeight: '600' },
    verticalDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
    costBreakdown: { marginTop: 16, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    costDetail: { color: '#A7F3D0', fontSize: 11 },

    sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginBottom: 12, marginTop: 8 },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
    metricCard: { width: '46%', backgroundColor: '#1F2937', margin: '2%', borderRadius: 12, padding: 16, alignItems: 'flex-start' },
    metricLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 4 },
    metricValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    metricSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
    badge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeGreen: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
    badgeRed: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
    badgeText: { fontSize: 10, fontWeight: '600', marginLeft: 2 },
    badgeTextGreen: { color: '#10B981' },
    badgeTextRed: { color: '#EF4444' },

    goalCard: { margin: 16, backgroundColor: '#1F2937', padding: 16, borderRadius: 12 },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    goalTitle: { color: '#FFF', fontWeight: '600' },
    goalPercentage: { color: '#10B981', fontWeight: 'bold' },
    progressBarBg: { height: 6, backgroundColor: '#374151', borderRadius: 3, marginBottom: 8 },
    progressBarFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },
    goalFooter: { color: '#9CA3AF', fontSize: 12 },

    earningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
    addLink: { color: '#3B82F6', fontWeight: '600' },
    earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1F2937', marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 12 },
    earningLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    appDot: { width: 8, height: 8, borderRadius: 4 },
    earningAppName: { color: '#FFF', fontWeight: '600' },
    earningTimeList: { color: '#6B7280', fontSize: 10 },
    earningRight: { flexDirection: 'row', alignItems: 'center' },
    earningVal: { color: '#10B981', fontWeight: 'bold' },

    emptyState: { padding: 20, alignItems: 'center' },
    emptyText: { color: '#6B7280' },
    footer: { padding: 16, backgroundColor: '#111827', borderTopWidth: 1, borderTopColor: '#374151' },
    finishButton: { backgroundColor: '#2563EB', padding: 16, borderRadius: 12, alignItems: 'center' },
    finishButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
