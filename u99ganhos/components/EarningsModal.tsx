import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
  FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EarningsRecord } from '@/services/types';
import { useFinance } from '@/hooks/useFinance';

interface EarningsModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (record: {
    date: string;
    appId: string;
    kmDriven: number;
    grossEarnings: number;
    hoursWorked: number;
    extraExpenses: number;
  }) => void;
  initialData?: EarningsRecord | null;
  prefilledKm?: number;
}

export default function EarningsModal({ visible, onClose, onSave, initialData, prefilledKm }: EarningsModalProps) {
  const { data } = useFinance();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appId, setAppId] = useState('');
  const [kmDriven, setKmDriven] = useState('');
  const [grossEarnings, setGrossEarnings] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [extraExpenses, setExtraExpenses] = useState('');
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  useEffect(() => {
    if (visible) {
      if (initialData) {
        // Editing existing record
        setDate(new Date(initialData.date + 'T00:00:00'));
        setAppId(initialData.appId);
        setKmDriven(initialData.kmDriven.toString());
        setGrossEarnings(formatCurrencyFromNumber(initialData.grossEarnings));
        setHoursWorked(initialData.hoursWorked.toString());
        setExtraExpenses(initialData.extraExpenses > 0 ? formatCurrencyFromNumber(initialData.extraExpenses) : '');
      } else {
        // Creating new record
        setDate(new Date());
        // Selecionar o primeiro app ativo como padrão, se existir
        const activeApp = data.faturamentoApps.find(app => app.isActive);
        if (activeApp) {
          setAppId(activeApp.id);
        } else {
          setAppId('');
        }
        // Use prefilled KM if provided (from GPS tracker)
        setKmDriven(prefilledKm ? prefilledKm.toString() : '');
        setGrossEarnings('');
        setHoursWorked('');
        setExtraExpenses('');
      }
    }
  }, [visible, initialData, prefilledKm, data.faturamentoApps]);

  const formatCurrencyFromNumber = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message });
    } else {
      Alert.alert(title, message);
    }
  };

  const formatCurrency = (text: string) => {
    // Remove tudo que não for número
    const numbers = text.replace(/[^\d]/g, '');
    if (numbers.length === 0) return '';

    // Converte para número (centavos)
    const cents = parseInt(numbers);
    const reais = cents / 100;

    // Formata em moeda brasileira
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseFormattedValue = (formattedValue: string): number => {
    if (!formattedValue) return 0;

    // Remove separadores de milhares e substitui vírgula por ponto
    const cleanValue = formattedValue
      .replace(/\./g, '') // Remove pontos (separadores de milhares)
      .replace(',', '.'); // Substitui vírgula por ponto decimal

    const numericValue = parseFloat(cleanValue);

    console.log('Debug formatação ganhos:', {
      original: formattedValue,
      cleaned: cleanValue,
      numeric: numericValue
    });

    return isNaN(numericValue) ? 0 : numericValue;
  };

  const handleCurrencyChange = (text: string, setter: (value: string) => void) => {
    const formatted = formatCurrency(text);
    setter(formatted);
  };

  const handleSave = () => {
    if (!kmDriven || !grossEarnings || !hoursWorked || !appId) {
      showAlert('Erro', 'Por favor, preencha todos os campos obrigatórios (inclusive o app de ganho)');
      return;
    }

    // Validar data
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      showAlert('Erro', 'Não é possível cadastrar registros para datas futuras');
      return;
    }

    const km = parseFloat(kmDriven);
    const earnings = parseFormattedValue(grossEarnings);
    const hours = parseFloat(hoursWorked);
    const expenses = parseFormattedValue(extraExpenses);

    if (isNaN(km) || km <= 0) {
      showAlert('Erro', 'KM rodado deve ser um número válido maior que zero');
      return;
    }

    if (isNaN(earnings) || earnings <= 0) {
      showAlert('Erro', 'Ganho bruto deve ser um valor válido maior que zero');
      return;
    }

    if (isNaN(hours) || hours <= 0) {
      showAlert('Erro', 'Horas trabalhadas deve ser um número válido maior que zero');
      return;
    }

    // Validar se o appId existe e está ativo
    const selectedApp = data.faturamentoApps.find(app => app.id === appId);
    if (!selectedApp || !selectedApp.isActive) {
      showAlert('Erro', 'O app de ganho selecionado não está ativo');
      return;
    }

    const dateString = date.toISOString().split('T')[0];

    console.log('Salvando ganho:', {
      date: dateString,
      appId: selectedApp.id,
      kmDriven: km,
      grossEarnings: earnings,
      hoursWorked: hours,
      extraExpenses: expenses || 0
    });

    onSave({
      date: dateString,
      appId: selectedApp.id,
      kmDriven: km,
      grossEarnings: earnings,
      hoursWorked: hours,
      extraExpenses: expenses || 0,
      variableCosts: [] // Inicializar com array vazio como padrão
    });

    handleClose();
  };

  const handleClose = () => {
    if (!initialData) {
      // Only reset form when creating new record
      setKmDriven('');
      setGrossEarnings('');
      setHoursWorked('');
      setExtraExpenses('');
    }
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Função para renderizar o seletor de apps de ganho
  const renderAppSelector = () => {
    const activeApps = data.faturamentoApps.filter(app => app.isActive);

    if (activeApps.length === 0) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>App de Ganho *</Text>
          <View style={[styles.input, styles.disabledInput]}>
            <Text style={styles.disabledInputText}>Nenhum app ativo encontrado</Text>
          </View>
          <Text style={styles.appNote}>
            💡 Para registrar ganhos, você precisa ter pelo menos um app ativo.
            Vá para a aba "Categorias" > "Apps de Ganho" para adicionar.
          </Text>
        </View>
      );
    }

    const selectedApp = activeApps.find(app => app.id === appId);

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>App de Ganho *</Text>
        <TouchableOpacity
          style={[styles.appSelector, !selectedApp && styles.appSelectorError]}
          onPress={() => setShowAppSelector(true)}
        >
          {selectedApp ? (
            <View style={styles.selectedAppContainer}>
              <Text style={[styles.appIcon, { color: selectedApp.color }]}>{selectedApp.icon}</Text>
              <Text style={styles.selectedAppText}>{selectedApp.name}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Selecione um app de ganho</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.appNote}>
          📱 Selecione o app de onde o ganho foi obtido
        </Text>
      </View>
    );
  };

  const renderAppSelectorModal = () => {
    if (!showAppSelector) return null;

    const activeApps = data.faturamentoApps.filter(app => app.isActive);

    return (
      <Modal
        visible={showAppSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppSelector(false)}
      >
        <TouchableOpacity
          style={styles.appSelectorOverlay}
          onPress={() => setShowAppSelector(false)}
        >
          <View style={styles.appSelectorModal}>
            <View style={styles.appSelectorHeader}>
              <Text style={styles.appSelectorTitle}>Selecione o App</Text>
              <TouchableOpacity onPress={() => setShowAppSelector(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeApps}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.appItem,
                    appId === item.id && styles.appItemSelected
                  ]}
                  onPress={() => {
                    setAppId(item.id);
                    setShowAppSelector(false);
                  }}
                >
                  <Text style={[styles.appIcon, { color: item.color }]}>{item.icon}</Text>
                  <Text style={styles.appName}>{item.name}</Text>
                  {appId === item.id && (
                    <MaterialIcons name="check" size={20} color="#00A85A" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const [showAppSelector, setShowAppSelector] = useState(false);

  const modalTitle = initialData ? 'Editar Registro' : 'Registrar Ganho';

  // Custom Calendar Component
  const renderCustomCalendar = () => {
    if (!showDatePicker) return null;

    const today = new Date();
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Create calendar grid
    const calendarDays = [];

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(day);
    }

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const isDateDisabled = (day: number) => {
      const checkDate = new Date(currentYear, currentMonth, day);
      return checkDate > today;
    };

    const isSelectedDate = (day: number) => {
      return date.getDate() === day &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear;
    };

    const navigateMonth = (direction: number) => {
      const newDate = new Date(date);
      newDate.setMonth(currentMonth + direction);
      setDate(newDate);
    };

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.calendarNavButton}>
            <MaterialIcons name="chevron-left" size={24} color="#00A85A" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.calendarNavButton}>
            <MaterialIcons name="chevron-right" size={24} color="#00A85A" />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarDayNames}>
          {dayNames.map(dayName => (
            <Text key={dayName} style={styles.calendarDayName}>{dayName}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                day && isSelectedDate(day) && styles.calendarDaySelected,
                day && isDateDisabled(day) && styles.calendarDayDisabled
              ]}
              onPress={() => {
                if (day && !isDateDisabled(day)) {
                  const newDate = new Date(currentYear, currentMonth, day);
                  setDate(newDate);
                  setShowDatePicker(false);
                }
              }}
              disabled={!day || isDateDisabled(day)}
            >
              {day && (
                <Text style={[
                  styles.calendarDayText,
                  isSelectedDate(day) && styles.calendarDayTextSelected,
                  isDateDisabled(day) && styles.calendarDayTextDisabled
                ]}>
                  {day}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.calendarFooter}>
          <TouchableOpacity
            style={styles.calendarCancelButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.calendarCancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calendarConfirmButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.calendarConfirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>{modalTitle}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Data *</Text>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <MaterialIcons name="event" size={20} color="#6B7280" />
                  <Text style={styles.dateSelectorText}>
                    {date.toLocaleDateString('pt-BR')}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.datePreview}>{formatDate(date)}</Text>

                {renderCustomCalendar()}
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>KM rodado *</Text>
                <TextInput
                  style={styles.input}
                  value={kmDriven}
                  onChangeText={setKmDriven}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Ganho bruto (R$) *</Text>
                <View style={styles.currencyContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={styles.currencyInput}
                    value={grossEarnings}
                    onChangeText={(text) => handleCurrencyChange(text, setGrossEarnings)}
                    placeholder="0,00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                {grossEarnings && (
                  <Text style={styles.valuePreview}>
                    Valor: R$ {grossEarnings}
                  </Text>
                )}
              </View>

              {renderAppSelector()}

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Horas trabalhadas *</Text>
                <TextInput
                  style={styles.input}
                  value={hoursWorked}
                  onChangeText={setHoursWorked}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Gastos extras (opcional)</Text>
                <View style={styles.currencyContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={styles.currencyInput}
                    value={extraExpenses}
                    onChangeText={(text) => handleCurrencyChange(text, setExtraExpenses)}
                    placeholder="0,00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                {extraExpenses && (
                  <Text style={styles.valuePreview}>
                    Valor: R$ {extraExpenses}
                  </Text>
                )}
              </View>

              <Text style={styles.note}>* Campos obrigatórios</Text>
              <Text style={styles.dateNote}>📅 Clique no campo de data para selecionar</Text>
              <Text style={styles.appNote}>📱 Clique no campo "App de Ganho" para selecionar</Text>
            </ScrollView>

            {renderAppSelectorModal()}

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveText}>
                  {initialData ? 'Atualizar' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <Modal visible={alertConfig.visible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
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
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  datePreview: {
    fontSize: 12,
    color: '#00A85A',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#6B7280',
    paddingLeft: 12,
    fontWeight: '500',
  },
  currencyInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  valuePreview: {
    fontSize: 14,
    color: '#00A85A',
    marginTop: 8,
    fontWeight: '500',
  },
  note: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  dateNote: {
    fontSize: 12,
    color: '#00A85A',
    marginTop: 4,
  },
  appNote: {
    fontSize: 12,
    color: '#00A85A',
    marginTop: 4,
  },
  appSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  appSelectorError: {
    borderColor: '#FF3B30',
  },
  selectedAppContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  selectedAppText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    color: '#9CA3AF',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
  },
  disabledInputText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 10,
  },
  appSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appSelectorModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  appSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  appSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  appItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  appName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#00A85A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Custom Calendar Styles
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendarDayNames: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 1,
  },
  calendarDaySelected: {
    backgroundColor: '#00A85A',
  },
  calendarDayDisabled: {
    backgroundColor: '#F3F4F6',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#111827',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  calendarDayTextDisabled: {
    color: '#9CA3AF',
  },
  calendarFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  calendarCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  calendarCancelText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  calendarConfirmButton: {
    backgroundColor: '#00A85A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  calendarConfirmText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Alert styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    minWidth: 280,
    alignItems: 'center',
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
});