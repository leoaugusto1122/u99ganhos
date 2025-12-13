import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  TextInput,
  ScrollView,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { EarningsRecord, Cost } from '@/services/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterPeriod = 'today' | 'week' | 'month' | 'custom';
type FilterType = 'all' | 'earnings' | 'costs';

export default function HistoricoScreen() {
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Custom Date State
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Expanded Card State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, getRecordProgress, getTotalMonthlyCosts } = useFinance();

  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (filterPeriod) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return { start: weekAgo.toISOString().split('T')[0], end: todayStr };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return { start: monthAgo.toISOString().split('T')[0], end: todayStr };
      case 'custom':
        if (!customStartDate || !customEndDate) return { start: '', end: '' };

        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parseDate = (d: string) => {
          const [day, month, year] = d.split('/');
          return `${year}-${month}-${day}`;
        };
        return { start: parseDate(customStartDate), end: parseDate(customEndDate) };
      default:
        return { start: todayStr, end: todayStr };
    }
  };

  const filteredRecords = useMemo(() => {
    const { start, end } = getDateRange();
    if (!start || !end) return [];

    const startDate = new Date(start + 'T12:00:00');
    const endDate = new Date(end + 'T12:00:00');

    let records: (EarningsRecord & { type: 'earning' } | Cost & { type: 'cost', originalDate?: string })[] = [];

    if (filterType === 'all' || filterType === 'earnings') {
      let earnings = data.earningsRecords.map(r => ({ ...r, type: 'earning' as const }));
      if (selectedAppId) {
        earnings = earnings.filter(r => r.appId === selectedAppId);
      }
      // Filter earnings strictly by date
      earnings = earnings.filter(r => r.date >= start && r.date <= end);
      records.push(...earnings);
    }

    if (filterType === 'all' || filterType === 'costs') {
      const costs = data.costs;

      costs.forEach(cost => {
        if (cost.isFixed) {
          // Project fixed costs into the range
          const costOriginalDate = new Date(cost.date + 'T12:00:00');
          const costDay = costOriginalDate.getDate();

          // Iterate through months from start to end
          let iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          while (iterDate <= endDate) {
            const year = iterDate.getFullYear();
            const month = iterDate.getMonth();

            // Construct potential date for this month
            // Handle edge cases like Feb 30th -> skips or moves to last day? 
            // Standard approach: check if day exists.
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let targetDay = costDay;
            if (targetDay > daysInMonth) targetDay = daysInMonth; // Cap at end of month

            const projectedDate = new Date(year, month, targetDay);
            const projectedDateStr = projectedDate.toISOString().split('T')[0];

            if (projectedDateStr >= start && projectedDateStr <= end) {
              // Add projected cost
              records.push({
                ...cost,
                date: projectedDateStr,
                type: 'cost',
                originalDate: cost.date // Keep track if needed
              });
            }

            // Next month
            iterDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 1);
          }
        } else {
          // Normal cost, check date range
          if (cost.date >= start && cost.date <= end) {
            records.push({ ...cost, type: 'cost' });
          }
        }
      });
    }

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return records;
  }, [data, filterPeriod, filterType, selectedAppId, customStartDate, customEndDate]);

  const totals = useMemo(() => {
    const totalEarnings = filteredRecords
      .filter(r => r.type === 'earning')
      .reduce((sum, record) => sum + (record as EarningsRecord).grossEarnings, 0);

    const totalCosts = filteredRecords
      .filter(r => r.type === 'cost')
      .reduce((sum, record) => sum + (record as Cost).value, 0);

    return { totalEarnings, totalCosts, balance: totalEarnings - totalCosts };
  }, [filteredRecords]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const renderRecordCard = ({ item }: { item: any }) => {
    const isEarning = item.type === 'earning';
    const isExpanded = expandedId === item.id;
    const app = isEarning ? data.faturamentoApps.find((app: any) => app.id === item.appId) : null;

    // Calculate extra metrics for Earnings
    let metaStatus = false;
    let avgValuePerKm = 0;
    let fixedCostShare = 0;
    let realProfit = 0;

    if (isEarning) {
      const progress = getRecordProgress(item);
      metaStatus = progress.isAchieved;
      avgValuePerKm = item.kmDriven > 0 ? item.grossEarnings / item.kmDriven : 0;

      // Calculate Fixed Cost Share (Proportional to hours worked)
      const monthlyFixedCosts = getTotalMonthlyCosts(item.date + 'T12:00:00');
      const hoursPerMonth = data.workSchedule.summary.hoursPerMonth;
      const costPerHour = hoursPerMonth > 0 ? monthlyFixedCosts / hoursPerMonth : 0;
      fixedCostShare = costPerHour * (item.hoursWorked || 0);

      // Real Profit = Gross - Variable - Fixed Share
      realProfit = item.grossEarnings - (item.totalVariableCosts || 0) - fixedCostShare;
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardIcon}>
            <MaterialIcons
              name={isEarning ? 'arrow-upward' : 'arrow-downward'}
              size={24}
              color={isEarning ? (app?.color || '#00A85A') : '#FF3B30'}
            />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle}>{isEarning ? (app ? app.name : 'Ganho') : item.categoryName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              {isEarning && item.kmDriven > 0 && (
                <Text style={styles.cardDate}>•  {item.kmDriven} km</Text>
              )}
            </View>

            {isEarning && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: metaStatus ? 'rgba(0, 168, 90, 0.1)' : 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                <MaterialIcons
                  name={metaStatus ? 'check-circle' : 'info'}
                  size={12}
                  color={metaStatus ? '#00A85A' : '#F59E0B'}
                />
                <Text style={{ fontSize: 10, color: metaStatus ? '#00A85A' : '#F59E0B', marginLeft: 4, fontWeight: '600' }}>
                  {metaStatus ? 'Meta Atingida' : 'Meta não atingida'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.cardAmount, { color: isEarning ? '#00A85A' : '#FF3B30' }]}>
              {isEarning ? `+ ${formatCurrency(item.netEarnings)}` : `- ${formatCurrency(item.value)}`}
            </Text>
            {isEarning && (
              <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right' }}>
                Lucro Real: {formatCurrency(realProfit)}
              </Text>
            )}
            <MaterialIcons
              name={isExpanded ? 'expand-less' : 'expand-more'}
              size={20}
              color="#6B7280"
              style={{ marginTop: 4 }}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.cardExpanded}>
            <View style={styles.divider} />
            {isEarning ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ganho Bruto:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(item.grossEarnings)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Custos Var.:</Text>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>- {formatCurrency(item.totalVariableCosts || 0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Custo Fixo (Est.):</Text>
                  <Text style={[styles.detailValue, { color: '#EF4444' }]}>- {formatCurrency(fixedCostShare)}</Text>
                </View>
                <View style={[styles.divider, { marginVertical: 4, opacity: 0.5 }]} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Lucro Real:</Text>
                  <Text style={[styles.detailValue, { color: realProfit >= 0 ? '#00A85A' : '#EF4444', fontWeight: 'bold' }]}>{formatCurrency(realProfit)}</Text>
                </View>

                <View style={[styles.divider, { marginTop: 8 }]} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>KM Rodado:</Text>
                  <Text style={styles.detailValue}>{item.kmDriven || 0} km</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Horas Trab.:</Text>
                  <Text style={styles.detailValue}>{item.hoursWorked || 0} h</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Média R$/KM:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(avgValuePerKm)}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Descrição:</Text>
                  <Text style={styles.detailValue}>{item.description || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fixo:</Text>
                  <Text style={styles.detailValue}>{item.isFixed ? 'Sim' : 'Não'}</Text>
                </View>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (period: FilterPeriod, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filterPeriod === period && styles.filterButtonActive]}
      onPress={() => setFilterPeriod(period)}
    >
      <Text style={[styles.filterButtonText, filterPeriod === period && styles.filterButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderTypeFilterButton = (type: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.typeFilterButton, filterType === type && styles.typeFilterButtonActive]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[styles.typeFilterButtonText, filterType === type && styles.typeFilterButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Resumo Total */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Balanço do Período</Text>
        <Text style={styles.summaryBalance}>{formatCurrency(totals.balance)}</Text>
        <View style={styles.summaryDetails}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="arrow-upward" size={16} color="#00A85A" />
            <Text style={styles.summaryItemText}>Ganhos: {formatCurrency(totals.totalEarnings)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="arrow-downward" size={16} color="#FF3B30" />
            <Text style={styles.summaryItemText}>Custos: {formatCurrency(totals.totalCosts)}</Text>
          </View>
        </View>
      </View>

      {/* Filtros de Período */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('today', 'Hoje')}
        {renderFilterButton('week', 'Semana')}
        {renderFilterButton('month', 'Mês')}
        {renderFilterButton('custom', 'Personalizado')}
      </View>

      {/* Inputs de Data Personalizada */}
      {filterPeriod === 'custom' && (
        <View style={styles.customDateContainer}>
          <View style={styles.dateInputGroup}>
            <Text style={styles.dateLabel}>De:</Text>
            <TextInput
              style={styles.dateInput}
              value={customStartDate}
              onChangeText={setCustomStartDate}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.dateInputGroup}>
            <Text style={styles.dateLabel}>Até:</Text>
            <TextInput
              style={styles.dateInput}
              value={customEndDate}
              onChangeText={setCustomEndDate}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Filtros de Tipo (Ganhos/Custos) */}
      <View style={styles.typeFiltersContainer}>
        {renderTypeFilterButton('all', 'Todos')}
        {renderTypeFilterButton('earnings', 'Ganhos')}
        {renderTypeFilterButton('costs', 'Custos')}
      </View>

      {/* Filtro de Apps (Horizontal Scroll) */}
      <View style={styles.appFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.appFilterContent}>
          <TouchableOpacity
            style={[styles.appChip, !selectedAppId && styles.appChipActive]}
            onPress={() => setSelectedAppId(null)}
          >
            <Text style={[styles.appChipText, !selectedAppId && styles.appChipTextActive]}>Todos Apps</Text>
          </TouchableOpacity>

          {data.faturamentoApps.map(app => (
            <TouchableOpacity
              key={app.id}
              style={[
                styles.appChip,
                selectedAppId === app.id && { backgroundColor: app.color + '20', borderColor: app.color } // Light background
              ]}
              onPress={() => setSelectedAppId(selectedAppId === app.id ? null : app.id)}
            >
              <Text style={[
                styles.appChipText,
                selectedAppId === app.id && { color: app.color, fontWeight: 'bold' }
              ]}>
                {app.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista */}
      {filteredRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="history" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Nenhum registro encontrado</Text>
          <Text style={styles.emptySubtitle}>Ajuste os filtros para visualizar histórico.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderRecordCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  summaryCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  summaryBalance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryItemText: {
    fontSize: 14,
    color: '#D1D5DB',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#00A85A',
  },
  filterButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  customDateContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  dateInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dateLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  dateInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  typeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  typeFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typeFilterButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00A85A',
  },
  typeFilterButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  typeFilterButtonTextActive: {
    color: '#00A85A',
  },
  appFilterContainer: {
    marginBottom: 12,
  },
  appFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  appChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1F2937',
  },
  appChipActive: {
    backgroundColor: '#374151',
    borderColor: '#9CA3AF',
  },
  appChipText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  appChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 16,
    width: 40,
    alignItems: 'center',
  },
  cardDetails: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardExpanded: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
