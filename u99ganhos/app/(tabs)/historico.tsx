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
  Modal,
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
  const [appliedCustomDate, setAppliedCustomDate] = useState({ start: '', end: '' });
  const [showCustomFilterModal, setShowCustomFilterModal] = useState(false);

  // Expanded Card State
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, getRecordProgress, getTotalMonthlyCosts } = useFinance();

  const handleApplyCustomFilter = () => {
    if (customStartDate.length === 10 && customEndDate.length === 10) {
      setAppliedCustomDate({ start: customStartDate, end: customEndDate });
    } else {
      Alert.alert('Data inválida', 'Preencha as datas no formato DD/MM/AAAA');
    }
  };

  const formatInputDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    if (cleaned.length > 4) {
      formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
    }
    return formatted;
  };

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
        // Standard "Month" view: Rolling 30 days
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        return { start: monthAgo.toISOString().split('T')[0], end: todayStr };
      case 'custom':
        if (!appliedCustomDate.start || !appliedCustomDate.end) return { start: '', end: '' };

        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parseDate = (d: string) => {
          const [day, month, year] = d.split('/');
          return `${year}-${month}-${day}`;
        };
        return { start: parseDate(appliedCustomDate.start), end: parseDate(appliedCustomDate.end) };
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
      earnings = earnings.filter(r => r.date >= start && r.date <= end);
      records.push(...earnings);
    }

    if (filterType === 'all' || filterType === 'costs') {
      const costs = data.costs;

      costs.forEach(cost => {
        if (cost.isFixed) {
          // Project fixed costs into the range, but ONLY FUTURE relative to cost creation
          const costOriginalDate = new Date(cost.date + 'T12:00:00');
          const costDay = costOriginalDate.getDate();

          let iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          while (iterDate <= endDate) {
            const year = iterDate.getFullYear();
            const month = iterDate.getMonth();

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let targetDay = costDay;
            if (targetDay > daysInMonth) targetDay = daysInMonth;

            const projectedDate = new Date(year, month, targetDay);
            const projectedDateStr = projectedDate.toISOString().split('T')[0];

            // CRITICAL FIX: Ensure projection is NOT before the original start date
            if (projectedDate >= costOriginalDate) {
              if (projectedDateStr >= start && projectedDateStr <= end) {
                records.push({
                  ...cost,
                  id: `${cost.id}_${projectedDateStr}`,
                  date: projectedDateStr,
                  type: 'cost',
                  originalDate: cost.date
                });
              }
            }
            iterDate = new Date(iterDate.getFullYear(), iterDate.getMonth() + 1, 1);
          }
        } else {
          if (cost.date >= start && cost.date <= end) {
            records.push({ ...cost, type: 'cost' });
          }
        }
      });
    }

    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return records;
  }, [data, filterPeriod, filterType, selectedAppId, appliedCustomDate, customStartDate, customEndDate]);

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

    let metaStatus = false;
    let avgValuePerKm = 0;
    let fixedCostShare = 0;
    let realProfit = 0;
    let totalCost = 0;

    if (isEarning) {
      const progress = getRecordProgress(item);
      metaStatus = progress.isAchieved;
      avgValuePerKm = item.kmDriven > 0 ? item.grossEarnings / item.kmDriven : 0;

      const monthlyFixedCosts = getTotalMonthlyCosts(item.date + 'T12:00:00');
      const hoursPerMonth = data.workSchedule.summary.hoursPerMonth;
      const costPerHour = hoursPerMonth > 0 ? monthlyFixedCosts / hoursPerMonth : 0;
      fixedCostShare = costPerHour * (item.hoursWorked || 0);
      realProfit = item.grossEarnings - (item.totalVariableCosts || 0) - fixedCostShare;
      totalCost = (item.totalVariableCosts || 0) + fixedCostShare;
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

            <View style={{ gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                {isEarning && item.kmDriven > 0 && (
                  <Text style={styles.cardDate}>• {item.kmDriven} km</Text>
                )}
              </View>

              {/* Description for Costs */}
              {!isEarning && item.description ? (
                <Text style={[styles.cardDate, { color: '#D1D5DB', fontStyle: 'italic' }]} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}

              {/* Earnings Summary Row */}
              {isEarning && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={[styles.cardDate, { color: '#9CA3AF' }]}>
                    Bruto: <Text style={{ color: '#E5E7EB' }}>{formatCurrency(item.grossEarnings)}</Text>
                  </Text>
                  <Text style={[styles.cardDate, { color: '#9CA3AF' }]}>
                    Custo: <Text style={{ color: '#EF4444' }}>{formatCurrency(totalCost)}</Text>
                  </Text>
                </View>
              )}
            </View>

            {isEarning && metaStatus && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <MaterialIcons name="check-circle" size={12} color="#00A85A" />
                <Text style={{ fontSize: 10, color: '#00A85A', marginLeft: 4, fontWeight: '600' }}>Meta Atingida</Text>
              </View>
            )}
          </View>

          <View style={styles.cardRight}>
            <Text style={[styles.cardAmount, { color: isEarning ? '#00A85A' : '#FF3B30' }]}>
              {isEarning ? formatCurrency(realProfit) : `- ${formatCurrency(item.value)}`}
            </Text>
            {isEarning && (
              <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'right' }}>
                Lucro Real
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
                {item.categoryName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Categoria:</Text>
                    <Text style={styles.detailValue}>{item.categoryName}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Modified Filter Button Render to open Modal for Custom
  const renderFilterButton = (period: FilterPeriod, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, filterPeriod === period && styles.filterButtonActive]}
      onPress={() => {
        if (period === 'custom') {
          setShowCustomFilterModal(true);
          setFilterPeriod('custom');
        } else {
          setFilterPeriod(period);
        }
      }}
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

      {/* Filtros de Tipo */}
      <View style={styles.typeFiltersContainer}>
        {renderTypeFilterButton('all', 'Todos')}
        {renderTypeFilterButton('earnings', 'Ganhos')}
        {renderTypeFilterButton('costs', 'Custos')}
      </View>

      {/* Modal de Filtro Personalizado */}
      <Modal
        visible={showCustomFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtro Personalizado</Text>
              <TouchableOpacity onPress={() => setShowCustomFilterModal(false)}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.sectionLabel}>Período:</Text>
              <View style={styles.customDateContainer}>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>De:</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={customStartDate}
                    onChangeText={(t) => setCustomStartDate(formatInputDate(t))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={styles.dateInputGroup}>
                  <Text style={styles.dateLabel}>Até:</Text>
                  <TextInput
                    style={styles.dateInput}
                    value={customEndDate}
                    onChangeText={(t) => setCustomEndDate(formatInputDate(t))}
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>

              <Text style={styles.sectionLabel}>Aplicativo:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.modalAppList}
              >
                <TouchableOpacity
                  style={[styles.appChip, !selectedAppId && styles.appChipActive]}
                  onPress={() => setSelectedAppId(null)}
                >
                  <Text style={[styles.appChipText, !selectedAppId && styles.appChipTextActive]}>Todos</Text>
                </TouchableOpacity>

                {data.faturamentoApps.map(app => (
                  <TouchableOpacity
                    key={app.id}
                    style={[
                      styles.appChip,
                      selectedAppId === app.id && { backgroundColor: app.color + '20', borderColor: app.color }
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

              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => {
                  handleApplyCustomFilter();
                  // Close only if valid? HandleApply checks validity.
                  if (customStartDate.length === 10 && customEndDate.length === 10) {
                    setShowCustomFilterModal(false);
                  }
                }}
              >
                <Text style={styles.modalApplyButtonText}>Aplicar Filtro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  // ... existing styles ...
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white'
  },
  modalBody: {
    gap: 16
  },
  modalAppList: {
    gap: 8,
    paddingBottom: 8
  },
  modalApplyButton: {
    backgroundColor: '#00A85A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  modalApplyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
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
  customFilterWrapper: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  customDateContainer: {
    flexDirection: 'row',
    gap: 12, // Increased gap for modal
    marginBottom: 0,
  },
  dateInputGroup: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  dateInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  applyFilterButton: {
    backgroundColor: '#374151',
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterButtonActive: {
    backgroundColor: '#00A85A',
  },
  applyFilterText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  clearFilterButton: {
    backgroundColor: '#374151',
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: '#9CA3AF',
    fontSize: 14, // Slightly larger for modal
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
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
    backgroundColor: '#1F2937', // Or lighter in modal?
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
