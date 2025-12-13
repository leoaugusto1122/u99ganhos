import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinance } from '@/hooks/useFinance';
import ProfitConfigModal from '@/components/ProfitConfigModal';
import TrackerWidget from '@/components/TrackerWidget';
import TrackerHistory from '@/components/TrackerHistory';
import TrackerFAB from '@/components/TrackerFAB';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profitModalVisible, setProfitModalVisible] = useState(false);
  const [showMetaInfo, setShowMetaInfo] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const {
    getTodayEarnings,
    getTodayKm,
    getAverageKmPerDay,
    getDailyTarget,
    getDailyAccount,
    getTargetProgress,
    getDailySummary,
    updateProfitSettings,
    getTotalMonthlyCosts,
    checkRequiredSettings,
    data,
  } = useFinance();

  const getLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDate();
  const summary = getDailySummary(today);
  const todayKm = getTodayKm();
  const averageKm = getAverageKmPerDay();
  const dailyTarget = getDailyTarget();
  const targetProgress = getTargetProgress();
  const dailyAccount = getDailyAccount();

  // Calculate Avg Value/KM (Gross)
  const allRecords = data.earningsRecords;
  const totalGrossAllTime = allRecords.reduce((sum, r) => sum + r.grossEarnings, 0);
  const totalKmAllTime = allRecords.reduce((sum, r) => sum + (r.kmDriven || 0), 0);
  const avgValuePerKm = totalKmAllTime > 0 ? totalGrossAllTime / totalKmAllTime : 0;

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message });
    } else {
      Alert.alert(title, message);
    }
  };

  const formatDate = () => {
    const today = new Date();
    return today.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleSaveProfitSettings = (profitPercentage: number) => {
    updateProfitSettings(profitPercentage);
  };


  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Header - Resumo do Dia */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Resumo de Hoje</Text>
          <Text style={styles.headerDate}>{formatDate()}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Bruto</Text>
              <Text style={[styles.summaryValue, { color: '#ffffff' }]}>
                {formatCurrency(summary.totalGrossEarnings)}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Lucro</Text>
              <Text style={[styles.summaryValue, { color: '#00A85A' }]}>
                {formatCurrency(dailyAccount.profit)}
              </Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Custo</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {formatCurrency(dailyAccount.cost + summary.totalVariableCosts)}
              </Text>
            </View>
          </View>
        </View>

        {/* GPS Tracker Widget */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <TrackerWidget />
          <TrackerHistory />
        </View>

        {/* Meta Diária */}
        <View style={styles.card}>
          {/* ... (keep meta logic, replace todayEarnings with summary.totalNetEarnings if needed, but getTargetProgress handles it) */}
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardTitle}>Meta Diária</Text>
              <TouchableOpacity onPress={() => showAlert('Configuração de Lucro', 'Defina a % de lucro desejada sobre seus custos para calcular a meta diária automaticamente.\n\nClique no cifrão ($) para configurar.')}>
                <MaterialIcons name="info-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setProfitModalVisible(true)}>
              <MaterialIcons name="monetization-on" size={24} color="#00A85A" />
            </TouchableOpacity>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(targetProgress.percentage, 100)}%`,
                    backgroundColor: targetProgress.isAchieved ? '#00A85A' : '#FF3B30'
                  }
                ]}
              />
            </View>
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>0%</Text>
            <Text style={styles.progressLabel}>{`${targetProgress.percentage.toFixed(0)}%`}</Text>
            <Text style={styles.progressLabel}>100%</Text>
          </View>
          <View style={styles.metaValues}>
            <Text style={styles.metaValueText}>Meta: {formatCurrency(dailyTarget)}</Text>
            <Text style={styles.metaValueText}>Faltam: {formatCurrency(Math.max(0, dailyTarget - summary.totalNetEarnings))}</Text>
          </View>
        </View>

        {/* Indicadores */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Eficiência</Text>
          </View>
          <View style={styles.indicatorsRow}>
            <View style={styles.indicator}>
              <MaterialIcons name="speed" size={24} color="#F59E0B" />
              <Text style={styles.indicatorValue}>{todayKm} km</Text>
              <Text style={styles.indicatorLabel}>Rodado Hoje</Text>
            </View>
            <View style={styles.indicator}>
              <MaterialIcons name="trending-up" size={24} color="#007AFF" />
              <Text style={styles.indicatorValue}>{formatCurrency(avgValuePerKm)}</Text>
              <Text style={styles.indicatorLabel}>Média R$/KM</Text>
            </View>
            <View style={styles.indicator}>
              <MaterialIcons name="history" size={24} color="#9CA3AF" />
              <Text style={styles.indicatorValue}>{averageKm} km</Text>
              <Text style={styles.indicatorLabel}>Média KM/Dia</Text>
            </View>
          </View>
        </View>

        <ProfitConfigModal
          visible={profitModalVisible}
          onClose={() => setProfitModalVisible(false)}
          onSave={handleSaveProfitSettings}
          currentPercentage={data.profitSettings.profitPercentage}
        />

        {/* Web Alert Modal */}
        {Platform.OS === 'web' && (
          <View style={alertConfig.visible ? styles.alertOverlay : { display: 'none' }}>
            <View style={styles.alertModal}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button for GPS Tracker */}
      <TrackerFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  headerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#1F2937',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  metaValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaValueText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  indicatorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  indicator: {
    alignItems: 'center',
  },
  indicatorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  indicatorLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Alert styles
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    minWidth: 280,
    alignItems: 'center',
    margin: 20,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  alertButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#374151',
    marginHorizontal: 16,
  },
});
