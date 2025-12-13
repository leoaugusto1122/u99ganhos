import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
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
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Category, Vehicle, CostType } from '@/services/types';

interface CostModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (
    categoryId: string,
    value: number,
    description: string | undefined,
    date: string,
    type: CostType,
    configOptions?: {
      vehicleId?: string;
      installments?: number;
      intervalKm?: number;
      intervalDays?: number;
    }
  ) => void;
  categories: Category[];
  vehicles: Vehicle[];
}

export default function CostModal({ visible, onClose, onSave, categories, vehicles }: CostModalProps) {
  const router = useRouter();

  // Basic Form
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Cost Configuration
  const [costType, setCostType] = useState<CostType>('unique');

  // Config Params
  const [installments, setInstallments] = useState('2');
  const [intervalKm, setIntervalKm] = useState('5000');
  const [intervalDays, setIntervalDays] = useState('30');

  useEffect(() => {
    if (visible) {
      setDateStr(new Date().toLocaleDateString('pt-BR'));
      // Pre-select active vehicle if only one exists?
      if (vehicles.length === 1 && vehicles[0].active) {
        setSelectedVehicleId(vehicles[0].id);
      }
    }
  }, [visible, vehicles]);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message });
    } else {
      Alert.alert(title, message);
    }
  };

  const formatCurrency = (text: string) => {
    const numbers = text.replace(/[^\d]/g, '');
    if (numbers.length === 0) return '';
    const cents = parseInt(numbers);
    const reais = cents / 100;
    return reais.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseFormattedValue = (formattedValue: string): number => {
    if (!formattedValue) return 0;
    const cleanValue = formattedValue.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const handleValueChange = (text: string) => {
    const formatted = formatCurrency(text);
    setValue(formatted);
  };

  const handleSave = () => {
    if (!selectedCategoryId) {
      showAlert('Erro', 'Por favor, selecione uma categoria');
      return;
    }

    const numericValue = parseFormattedValue(value);
    if (numericValue <= 0) {
      showAlert('Erro', 'Por favor, digite um valor válido maior que zero');
      return;
    }

    const [day, month, year] = dateStr.split('/');
    const formattedDate = `${year}-${month}-${day}`;

    if (!day || !month || !year || isNaN(Date.parse(formattedDate))) {
      showAlert('Erro', 'Data inválida. Use o formato DD/MM/AAAA');
      return;
    }

    // Validation for specific types
    if (costType === 'installments' && (!installments || parseInt(installments) < 2)) {
      showAlert('Erro', 'Número de parcelas inválido');
      return;
    }
    if (costType === 'km_based' && (!intervalKm || parseInt(intervalKm) <= 0)) {
      showAlert('Erro', 'Intervalo de KM inválido');
      return;
    }
    if (costType === 'custom_days' && (!intervalDays || parseInt(intervalDays) <= 0)) {
      showAlert('Erro', 'Intervalo de dias inválido');
      return;
    }
    if ((costType === 'km_based') && !selectedVehicleId) {
      showAlert('Erro', 'Custos baseados em KM exigem um veículo vinculado.');
      return;
    }

    const configOptions = {
      vehicleId: selectedVehicleId,
      installments: costType === 'installments' ? parseInt(installments) : undefined,
      intervalKm: costType === 'km_based' ? parseInt(intervalKm) : undefined,
      intervalDays: costType === 'custom_days' ? parseInt(intervalDays) : undefined,
    };

    onSave(
      selectedCategoryId,
      numericValue,
      description.trim() || undefined,
      formattedDate,
      costType,
      configOptions
    );

    handleClose();
  };

  const handleClose = () => {
    setSelectedCategoryId('');
    setValue('');
    setDescription('');
    setSelectedVehicleId(undefined);
    setCostType('unique');
    setInstallments('2');
    onClose();
  };

  const renderCostTypeOption = (type: CostType, icon: any, label: string) => (
    <TouchableOpacity
      style={[styles.typeOption, costType === type && styles.typeOptionSelected]}
      onPress={() => setCostType(type)}
    >
      <View style={[styles.typeIconContainer, costType === type && styles.typeIconContainerSelected]}>
        {icon}
      </View>
      <Text style={[styles.typeLabel, costType === type && styles.typeLabelSelected]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Novo Custo</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

              {/* Vehicle Selection */}
              {vehicles.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.label}>Veículo (Opcional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                    <TouchableOpacity
                      style={[styles.vehicleChip, !selectedVehicleId && styles.vehicleChipSelected]}
                      onPress={() => setSelectedVehicleId(undefined)}
                    >
                      <Text style={[styles.vehicleText, !selectedVehicleId && styles.vehicleTextSelected]}>Nenhum</Text>
                    </TouchableOpacity>
                    {vehicles.map(v => (
                      <TouchableOpacity
                        key={v.id}
                        style={[styles.vehicleChip, selectedVehicleId === v.id && styles.vehicleChipSelected]}
                        onPress={() => setSelectedVehicleId(v.id)}
                      >
                        <FontAwesome5 name={v.type === 'moto' ? 'motorcycle' : 'car'} size={14} color={selectedVehicleId === v.id ? '#FFF' : '#6B7280'} />
                        <Text style={[styles.vehicleText, selectedVehicleId === v.id && styles.vehicleTextSelected]}>{v.model}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Category Selection */}
              <View style={styles.section}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Categoria *</Text>
                  <TouchableOpacity onPress={() => { handleClose(); router.push('/configuracoes'); }} style={styles.newCatBtn}>
                    <MaterialIcons name="add" size={14} color="#00A85A" />
                    <Text style={styles.newCatText}>Nova</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                  {categories.length === 0 ? (
                    <Text style={styles.emptyText}>Nenhuma categoria.</Text>
                  ) : (
                    categories.map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryChip, selectedCategoryId === cat.id && styles.categoryChipSelected]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text style={[styles.categoryText, selectedCategoryId === cat.id && styles.categoryTextSelected]}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>

              <View style={styles.divider} />

              {/* Cost Type Selection */}
              <Text style={styles.label}>Tipo de Lançamento</Text>
              <View style={styles.typesContainer}>
                {renderCostTypeOption('unique', <MaterialIcons name="looks-one" size={20} color={costType === 'unique' ? '#FFF' : '#6B7280'} />, 'Único')}
                {renderCostTypeOption('fixed_monthly', <MaterialIcons name="date-range" size={20} color={costType === 'fixed_monthly' ? '#FFF' : '#6B7280'} />, 'Mensal')}
                {renderCostTypeOption('installments', <MaterialIcons name="view-column" size={20} color={costType === 'installments' ? '#FFF' : '#6B7280'} />, 'Parcelado')}
                {renderCostTypeOption('km_based', <MaterialIcons name="commute" size={20} color={costType === 'km_based' ? '#FFF' : '#6B7280'} />, 'Por KM')}
                {renderCostTypeOption('custom_days', <MaterialIcons name="update" size={20} color={costType === 'custom_days' ? '#FFF' : '#6B7280'} />, 'Dias')}
              </View>

              {/* Dynamic Options */}
              {costType === 'installments' && (
                <View style={styles.dynamicOption}>
                  <Text style={styles.labelSmall}>Número de Parcelas</Text>
                  <View style={styles.counter}>
                    <TouchableOpacity onPress={() => setInstallments(p => Math.max(2, parseInt(p || '2') - 1).toString())}>
                      <MaterialIcons name="remove-circle-outline" size={24} color="#6B7280" />
                    </TouchableOpacity>
                    <TextInput style={styles.smallInput} value={installments} onChangeText={setInstallments} keyboardType="numeric" />
                    <TouchableOpacity onPress={() => setInstallments(p => (parseInt(p || '0') + 1).toString())}>
                      <MaterialIcons name="add-circle-outline" size={24} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {costType === 'km_based' && (
                <View style={styles.dynamicOption}>
                  <Text style={styles.labelSmall}>Repetir a cada (KM)</Text>
                  <TextInput style={styles.input} value={intervalKm} onChangeText={setIntervalKm} keyboardType="numeric" placeholder="Ex: 5000" />
                  <Text style={styles.hint}>O custo será gerado automaticamente quando o veículo atingir a KM.</Text>
                </View>
              )}
              {costType === 'custom_days' && (
                <View style={styles.dynamicOption}>
                  <Text style={styles.labelSmall}>Repetir a cada (Dias)</Text>
                  <TextInput style={styles.input} value={intervalDays} onChangeText={setIntervalDays} keyboardType="numeric" placeholder="Ex: 15" />
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.label}>Valor e Detalhes</Text>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.subLabel}>Data</Text>
                  <TextInput style={styles.input} value={dateStr} onChangeText={setDateStr} placeholder="DD/MM/AAAA" keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.subLabel}>Valor (R$)</Text>
                  <TextInput style={styles.input} value={value} onChangeText={handleValueChange} placeholder="0,00" keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.subLabel}>Descrição</Text>
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Detalhes do custo..." multiline />

            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveText}>Salvar</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Web Alert */}
      {Platform.OS === 'web' && (
        <Modal visible={alertConfig.visible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity style={styles.alertBtn} onPress={() => setAlertConfig(p => ({ ...p, visible: false }))}>
                <Text style={styles.alertBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#FFF', borderRadius: 16, width: '100%', maxWidth: 450, maxHeight: '90%', elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeButton: { padding: 4 },
  content: { padding: 20 },
  section: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  labelSmall: { fontSize: 14, fontWeight: '500', color: '#4B5563', marginBottom: 4 },
  subLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4, marginTop: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

  // Vehicles
  vehicleScroll: { flexDirection: 'row', marginBottom: 4 },
  vehicleChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, gap: 6 },
  vehicleChipSelected: { backgroundColor: '#3B82F6' },
  vehicleText: { fontSize: 14, color: '#4B5563' },
  vehicleTextSelected: { color: '#FFF', fontWeight: '600' },

  // Categories
  newCatBtn: { flexDirection: 'row', alignItems: 'center', borderColor: '#34D399', borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  newCatText: { fontSize: 12, color: '#059669', marginLeft: 2 },
  categoryScroll: { gap: 8 },
  categoryChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 8 },
  categoryChipSelected: { backgroundColor: '#10B981' },
  categoryText: { fontSize: 14, color: '#374151' },
  categoryTextSelected: { color: '#FFF', fontWeight: '600' },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' },

  // Types
  typesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  typeOption: { width: '18%', alignItems: 'center', gap: 4 },
  typeOptionSelected: {},
  typeIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  typeIconContainerSelected: { backgroundColor: '#6366F1' },
  typeLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center' },
  typeLabelSelected: { color: '#6366F1', fontWeight: '600' },

  // Inputs
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 16, color: '#111827', backgroundColor: '#FFF' },
  smallInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 8, width: 60, textAlign: 'center', fontSize: 16 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },

  // Dynamic
  dynamicOption: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },

  footer: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFF', fontWeight: '600' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { backgroundColor: '#FFF', padding: 20, borderRadius: 8, minWidth: 300, alignItems: 'center' },
  alertTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  alertMessage: { fontSize: 14, color: '#4B5563', marginBottom: 16, textAlign: 'center' },
  alertBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 4 },
  alertBtnText: { color: '#FFF', fontWeight: '600' },
});