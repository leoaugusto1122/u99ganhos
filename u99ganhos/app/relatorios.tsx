import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Stack, useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function RelatoriosScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data, getTotalMonthlyCosts, getDailyTarget } = useFinance();

  const metrics = useMemo(() => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    // Filter Earnings for selected month
    const earnings = data.earningsRecords.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    });

    const totalGross = earnings.reduce((sum, r) => sum + r.grossEarnings, 0);
    const totalVariableCosts = earnings.reduce((sum, r) => sum + r.totalVariableCosts, 0);
    const totalKm = earnings.reduce((sum, r) => sum + (r.kmDriven || 0), 0);

    // Fixed Costs for the month
    const totalMonthlyFixed = getTotalMonthlyCosts(startOfMonth.toISOString());

    const totalCosts = totalVariableCosts + totalMonthlyFixed;
    const totalProfit = totalGross - totalCosts;
    const avgPerKm = totalKm > 0 ? totalProfit / totalKm : 0;

    // Forecast Logic
    const today = new Date();
    const isCurrentMonth = today.getMonth() === selectedDate.getMonth() && today.getFullYear() === selectedDate.getFullYear();
    let forecast = 0;

    if (isCurrentMonth) {
      const daysPassed = today.getDate();
      const lastDay = endOfMonth.getDate();
      const dailyAvg = daysPassed > 0 ? totalGross / daysPassed : 0;
      forecast = dailyAvg * lastDay;
    } else {
      forecast = totalGross; // Past months, forecast is actual
    }

    // Best Days Ranking
    const dailyProfits = earnings.reduce((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + r.grossEarnings - r.totalVariableCosts; // Gross - Variable for daily ranking
      // Note: We don't subtract fixed costs from daily ranking usually, as they are monthly.
      return acc;
    }, {} as { [key: string]: number });

    const bestDays = Object.entries(dailyProfits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([date, value]) => ({ date, value }));

    // Monthly Goal (Target)
    // Calculate total hours scheduled for the month * hourly rate implied?
    // Or simpler: Sum of daily targets for all days in month
    let monthlyTarget = 0;
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d).toISOString().split('T')[0];
      monthlyTarget += getDailyTarget(dateStr);
    }
    const goalProgress = monthlyTarget > 0 ? Math.min((totalProfit / monthlyTarget) * 100, 100) : 0;

    // Chart Data - Daily Evolution
    // Generate labels for, say, every 5 days to avoid crowding
    const chartLabels = [];
    const chartDataPoints = [];

    // Aggregate by day for chart
    const dailyTotals: { [key: string]: number } = {};
    earnings.forEach(r => {
      dailyTotals[r.date] = (dailyTotals[r.date] || 0) + r.grossEarnings;
    });

    for (let d = 1; d <= endOfMonth.getDate(); d += (endOfMonth.getDate() > 20 ? 4 : 2)) {
      chartLabels.push(`${d}`);
    }

    // Fill data points (cumulative or daily? Daily is noisy. Cumulative is nice for goal. Let's do Daily Earnings)
    // Actually, user asked for "Gráfico semanal" and "monthly". Let's show Daily Earnings evolution.
    const allDaysInMonth = [];
    for (let d = 1; d <= endOfMonth.getDate(); d++) {
      const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d).toISOString().split('T')[0];
      allDaysInMonth.push(dailyTotals[dateStr] || 0);
    }

    // Downsample for display if needed, but react-native-chart-kit handles arrays.
    // We map labels to indices roughly.

    return {
      totalGross,
      totalCosts,
      totalProfit,
      totalKm,
      avgPerKm,
      forecast,
      bestDays,
      goalProgress,
      monthlyTarget,
      chartData: {
        labels: chartLabels,
        data: allDaysInMonth
      }
    };
  }, [data, selectedDate, getTotalMonthlyCosts, getDailyTarget]);

  const navigateMonth = (direction: 'next' | 'prev') => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Relatórios e Indicadores',
          headerStyle: { backgroundColor: '#1F2937' },
          headerTintColor: '#FFF',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
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
      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthButton}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthButton}>
          <MaterialIcons name="chevron-right" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Metrics Cards */}
      <View style={styles.gridContainer}>
        <View style={[styles.card, styles.cardFull]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="account-balance-wallet" size={24} color="#10B981" />
            <Text style={styles.cardLabel}>Lucro Líquido</Text>
          </View>
          <Text style={[styles.cardValue, { color: '#10B981' }]}>{formatCurrency(metrics.totalProfit)}</Text>
          <Text style={styles.cardSubtext}>
            {metrics.totalProfit >= 0 ? '👍 No azul' : '👎 No prejuízo'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabelSmall}>Ganho Bruto</Text>
          <Text style={styles.cardValueSmall}>{formatCurrency(metrics.totalGross)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabelSmall}>Custos Totais</Text>
          <Text style={[styles.cardValueSmall, { color: '#EF4444' }]}>{formatCurrency(metrics.totalCosts)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabelSmall}>KM Rodado</Text>
          <Text style={styles.cardValueSmall}>{metrics.totalKm.toFixed(1)} km</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabelSmall}>Média R$/KM</Text>
          <Text style={[styles.cardValueSmall, { color: '#F59E0B' }]}>{formatCurrency(metrics.avgPerKm)}</Text>
        </View>
      </View>

      {/* Goal Progress */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Meta Mensal</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${metrics.goalProgress}%` }]} />
        </View>
        <View style={styles.goalLabels}>
          <Text style={styles.goalText}>{metrics.goalProgress.toFixed(1)}% atingida</Text>
          <Text style={styles.goalText}>Meta: {formatCurrency(metrics.monthlyTarget)}</Text>
        </View>
      </View>

      {/* Forecast */}
      <View style={styles.forecastCard}>
        <View style={styles.forecastHeader}>
          <MaterialIcons name="trending-up" size={24} color="#3B82F6" />
          <Text style={styles.forecastTitle}>Previsão Final do Mês</Text>
        </View>
        <Text style={styles.forecastValue}>{formatCurrency(metrics.forecast)}</Text>
        <Text style={styles.forecastSub}>Baseado na sua média diária atual</Text>
      </View>

      {/* Chart - Daily Earnings Evolution */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Evolução de Ganhos (Dia a Dia)</Text>
        <LineChart
          data={{
            labels: metrics.chartData.labels,
            datasets: [{ data: metrics.chartData.data.length > 0 ? metrics.chartData.data : [0] }]
          }}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: "#1F2937",
            backgroundGradientFrom: "#1F2937",
            backgroundGradientTo: "#1F2937",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(156, 163, 175, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" }
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
        />
      </View>

      {/* Best Days Ranking */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>🏆 Melhores Dias do Mês</Text>
        {metrics.bestDays.length === 0 ? (
          <Text style={styles.emptyText}>Sem dados suficientes.</Text>
        ) : (
          metrics.bestDays.map((day, index) => (
            <View key={day.date} style={styles.rankingItem}>
              <View style={styles.rankingLeft}>
                <View style={[styles.rankBadge, { backgroundColor: index === 0 ? '#F59E0B' : index === 1 ? '#9CA3AF' : '#D97706' }]}>
                  <Text style={styles.rankText}>{index + 1}º</Text>
                </View>
                <Text style={styles.rankingDate}>{new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR')}</Text>
              </View>
              <Text style={styles.rankingValue}>{formatCurrency(day.value)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    padding: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  monthButton: {
    padding: 8,
  },
  monthLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    width: screenWidth < 380 ? '100%' : '48%', // Responsive width
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardFull: {
    width: '100%',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardLabel: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  cardLabelSmall: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  cardValueSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sectionContainer: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  goalLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  goalText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  forecastCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#1E3A8A', // Blue background
    borderRadius: 16,
    alignItems: 'center',
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  forecastTitle: {
    color: '#BFDBFE',
    fontSize: 16,
    fontWeight: '600',
  },
  forecastValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  forecastSub: {
    color: '#93C5FD',
    fontSize: 14,
  },
  chartSection: {
    padding: 16,
    alignItems: 'center',
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rankingDate: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  rankingValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#6B7280',
    fontStyle: 'italic',
  }
});
