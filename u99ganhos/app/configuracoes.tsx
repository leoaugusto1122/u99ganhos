import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  Platform
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import CategoryModal from '@/components/CategoryModal';

type TabType = 'categoria' | 'horario' | 'apps' | 'custos' | 'permissoes';

const CATEGORY_TYPES = [
  { key: 'fixed', label: 'Custos Fixos', color: '#FF3B30' },
  { key: 'variable', label: 'Custos Variáveis', color: '#FF9500' },
  { key: 'emergency', label: 'Emergência', color: '#DC143C' }
] as const;

const APP_COLORS = [
  '#000000', '#FF3B30', '#FF9500', '#FFCC02', '#34C759',
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D92', '#A2845E'
];

const APP_ICONS = ['🚗', '🚖', '🍔', '🛵', '🚙', '📦', '🏪', '💼', '🎯', '⭐'];

export default function ConfiguracoesScreen() {
  const { section } = useLocalSearchParams<{ section: TabType }>();
  const [activeTab, setActiveTab] = useState<TabType>(section || 'categoria');

  // Update activeTab if section param changes
  React.useEffect(() => {
    if (section) {
      setActiveTab(section);
    }
  }, [section]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; type: any } | null>(null);
  const [editingApp, setEditingApp] = useState<{ id: string; name: string; color: string; icon: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // App modal states
  const [appName, setAppName] = useState('');
  const [appColor, setAppColor] = useState(APP_COLORS[0]);
  const [appIcon, setAppIcon] = useState(APP_ICONS[0]);

  const {
    data,
    addCategory,
    updateCategory,
    deleteCategory,
    updateWorkDay,
    saveWorkSchedule,
    addFaturamentoApp,
    updateFaturamentoApp,
    deleteFaturamentoApp,
    toggleAppStatus,
    deleteCost,
    getTotalMonthlyCosts,
    permissions,
    requestPermissions,
    checkPermissions
  } = useFinance();

  React.useEffect(() => {
    checkPermissions();
  }, []);

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    if (Platform.OS === 'web') {
      if (confirm(`${title}\n\n${message}`)) {
        onConfirm?.();
      }
    } else {
      Alert.alert(title, message, onConfirm ? [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: onConfirm }
      ] : undefined);
    }
  };

  const handleSaveCategory = (name: string, type: any): boolean => {
    if (editingCategory) {
      const success = updateCategory(editingCategory.id, name);
      if (success) {
        setEditingCategory(null);
      }
      return success;
    } else {
      return addCategory(name);
    }
  };

  const handleEditCategory = (id: string, name: string, type: any) => {
    setEditingCategory({ id, name, type });
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = (id: string) => {
    showAlert('Excluir Categoria', 'Tem certeza? Esta ação não pode ser desfeita.', () => {
      deleteCategory(id);
    });
  };

  const handleWorkDayChange = (dayIndex: number, enabled: boolean, hours?: number) => {
    updateWorkDay(dayIndex, enabled, hours);
  };

  const handleSaveSchedule = () => {
    saveWorkSchedule();
  };

  const handleSaveApp = () => {
    if (!appName.trim()) {
      showAlert('Erro', 'Digite o nome do app');
      return;
    }

    let success;
    if (editingApp) {
      success = updateFaturamentoApp(editingApp.id, appName.trim(), appColor, appIcon);
    } else {
      success = addFaturamentoApp(appName.trim(), appColor, appIcon);
    }

    if (success) {
      setAppModalVisible(false);
      setAppName('');
      setAppColor(APP_COLORS[0]);
      setAppIcon(APP_ICONS[0]);
      setEditingApp(null);
    } else {
      showAlert('Erro', 'Este app já existe');
    }
  };

  const handleEditApp = (app: any) => {
    setEditingApp(app);
    setAppName(app.name);
    setAppColor(app.color);
    setAppIcon(app.icon);
    setAppModalVisible(true);
  };

  const handleDeleteApp = (id: string) => {
    showAlert('Excluir App', 'Tem certeza? Todos os registros deste app serão perdidos.', () => {
      deleteFaturamentoApp(id);
    });
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'categoria': return 'Categorias';
      case 'apps': return 'Apps de Faturamento';
      case 'horario': return 'Horário de Trabalho';
      case 'custos': return 'Custos Mensais';
      case 'permissoes': return 'Permissões do Sistema';
      default: return 'Configurações';
    }
  };

  const renderCategoryItem = ({ item }: { item: any }) => {
    const typeConfig = CATEGORY_TYPES.find(t => t.key === item.type);
    return (
      <View style={styles.categoryItem}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <View style={[styles.categoryTypeBadge, { backgroundColor: typeConfig?.color || '#6B7280' }]}>
            <Text style={styles.categoryTypeText}>{typeConfig?.label || 'Desconhecido'}</Text>
          </View>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditCategory(item.id, item.name, item.type)}
          >
            <MaterialIcons name="edit" size={20} color="#00A85A" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteCategory(item.id)}
          >
            <MaterialIcons name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAppItem = ({ item }: { item: any }) => (
    <View style={styles.appItem}>
      <View style={styles.appInfo}>
        <View style={[styles.appIcon, { backgroundColor: item.color }]}>
          <Text style={styles.appIconText}>{item.icon}</Text>
        </View>
        <View style={styles.appDetails}>
          <Text style={styles.appName}>{item.name}</Text>
          <Text style={[styles.appStatus, { color: item.isActive ? '#00A85A' : '#FF3B30' }]}>
            {item.isActive ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>
      <View style={styles.appActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleAppStatus(item.id)}
        >
          <MaterialIcons
            name={item.isActive ? 'visibility-off' : 'visibility'}
            size={20}
            color={item.isActive ? '#FF9500' : '#00A85A'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditApp(item)}
        >
          <MaterialIcons name="edit" size={20} color="#00A85A" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteApp(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCostItem = ({ item }: { item: any }) => (
    <View style={styles.costItem}>
      <View style={styles.costInfo}>
        <View style={styles.costHeader}>
          <Text style={styles.costCategory}>{item.categoryName}</Text>
          <Text style={styles.costValue}>
            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        {item.description && (
          <Text style={styles.costDescription}>{item.description}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => {
          showAlert('Excluir Custo', 'Tem certeza? Esta ação não pode ser desfeita.', () => {
            deleteCost(item.id);
          });
        }}
      >
        <MaterialIcons name="delete" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const renderWorkDayItem = (day: any, index: number) => (
    <View key={index} style={styles.workDayItem}>
      <View style={styles.workDayInfo}>
        <TouchableOpacity
          style={[styles.checkbox, day.enabled && styles.checkboxActive]}
          onPress={() => handleWorkDayChange(index, !day.enabled, day.enabled ? day.hours : 4)}
        >
          {day.enabled && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
        </TouchableOpacity>
        <Text style={styles.workDayName}>{day.day}</Text>
      </View>
      {day.enabled && (
        <View style={styles.hoursContainer}>
          <TextInput
            style={styles.hoursInput}
            value={day.hours.toString()}
            onChangeText={(text) => {
              let hours = parseInt(text) || 0;
              if (hours > 24) hours = 24;
              if (hours < 0) hours = 0;
              handleWorkDayChange(index, day.enabled, hours);
            }}
            keyboardType="numeric"
            placeholder="4"
            selectTextOnFocus={true}
            maxLength={2}
          />
          <Text style={styles.hoursLabel}>horas</Text>
        </View>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'categoria':
        return (
          <View style={[styles.tabContent, { flex: 1 }]}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEditingCategory(null);
                setCategoryModalVisible(true);
              }}
            >
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Adicionar Categoria</Text>
            </TouchableOpacity>

            {data.categories.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="category" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Nenhuma categoria cadastrada</Text>
                <Text style={styles.emptySubtitle}>
                  Adicione categorias para organizar seus custos
                </Text>
              </View>
            ) : (
              <FlatList
                data={data.categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      case 'apps':
        return (
          <View style={[styles.tabContent, { flex: 1 }]}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setEditingApp(null);
                setAppName('');
                setAppColor(APP_COLORS[0]);
                setAppIcon(APP_ICONS[0]);
                setAppModalVisible(true);
              }}
            >
              <MaterialIcons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Adicionar App</Text>
            </TouchableOpacity>

            <FlatList
              data={data.faturamentoApps}
              renderItem={renderAppItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          </View>
        );

      case 'horario':
        return (
          <ScrollView style={styles.tabContent} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Horário de trabalho</Text>
            <Text style={styles.sectionSubtitle}>Selecione seus dias de trabalho</Text>

            <View style={styles.workDaysContainer}>
              {data.workSchedule.workDays.map((day, index) => renderWorkDayItem(day, index))}
            </View>

            <View style={styles.scheduleActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveSchedule}>
                <Text style={styles.saveButtonText}>Salvar Configurações</Text>
              </TouchableOpacity>
            </View>

            {data.workSchedule.summary.daysPerWeek > 0 && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Resumo da Configuração</Text>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{data.workSchedule.summary.daysPerWeek}</Text>
                    <Text style={styles.summaryLabel}>dias/semana</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{data.workSchedule.summary.hoursPerWeek}h</Text>
                    <Text style={styles.summaryLabel}>horas/semana</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{data.workSchedule.summary.daysPerMonth}</Text>
                    <Text style={styles.summaryLabel}>dias/mês</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{data.workSchedule.summary.hoursPerMonth}h</Text>
                    <Text style={styles.summaryLabel}>horas/mês</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        );

      case 'custos':
        const filteredCosts = data.costs.filter(cost => {
          const costDate = new Date(cost.date);
          const targetMonth = selectedDate.getMonth();
          const targetYear = selectedDate.getFullYear();

          if (cost.isFixed) {
            // Include if created on or before this month
            const costMonthIndex = costDate.getFullYear() * 12 + costDate.getMonth();
            const targetMonthIndex = targetYear * 12 + targetMonth;
            return costMonthIndex <= targetMonthIndex;
          }

          // Normal costs: exact month match
          return costDate.getMonth() === targetMonth && costDate.getFullYear() === targetYear;
        });

        // Calculate total specifically for filtered view
        const currentTotal = filteredCosts.reduce((sum, cost) => sum + cost.value, 0);

        const navigateMonth = (direction: 'next' | 'prev') => {
          const newDate = new Date(selectedDate);
          newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
          setSelectedDate(newDate);
        };

        return (
          <View style={[styles.tabContent, { flex: 1 }]}>
            {/* Month Selector */}
            <View style={styles.monthSelector}>
              <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthButton}>
                <MaterialIcons name="chevron-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthButton}>
                <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total em {selectedDate.toLocaleDateString('pt-BR', { month: 'long' })}:</Text>
              <Text style={styles.totalValue}>
                R$ {currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {filteredCosts.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="attach-money" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Nenhum custo neste mês</Text>
                <Text style={styles.emptySubtitle}>
                  Navegue para outros meses ou adicione novos custos
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredCosts}
                renderItem={renderCostItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      case 'permissoes':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Permissões & Acesso</Text>
            <Text style={styles.sectionSubtitle}>
              Gerencie as permissões necessárias para o funcionamento correto do app.
            </Text>

            {/* Localização */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <View style={styles.permissionHeader}>
                  <MaterialIcons name="gps-fixed" size={24} color="#FFFFFF" />
                  <Text style={styles.permissionTitle}>Localização (GPS)</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Necessário para rastrear seus percursos e calcular quilometragem.
                </Text>
              </View>
              <View style={styles.permissionAction}>
                <Text style={[
                  styles.permissionStatus,
                  { color: permissions.location ? '#00A85A' : '#FF3B30' }
                ]}>
                  {permissions.location ? 'Ativo' : 'Inativo'}
                </Text>
                {!permissions.location && (
                  <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={() => requestPermissions('location')}
                  >
                    <Text style={styles.permissionButtonText}>Ativar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Armazenamento / Backup */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <View style={styles.permissionHeader}>
                  <MaterialIcons name="folder" size={24} color="#FFFFFF" />
                  <Text style={styles.permissionTitle}>Pasta de Backup</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Selecione uma pasta para salvar seus backups automaticamente (Somente Android).
                </Text>
              </View>
              <View style={styles.permissionAction}>
                <Text style={[
                  styles.permissionStatus,
                  { color: permissions.storage ? '#00A85A' : '#F59E0B' }
                ]}>
                  {permissions.storage ? 'Configurado' : 'Pendente'}
                </Text>
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={() => requestPermissions('storage')}
                >
                  <Text style={styles.permissionButtonText}>Configurar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notificações */}
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <View style={styles.permissionHeader}>
                  <MaterialIcons name="notifications" size={24} color="#FFFFFF" />
                  <Text style={styles.permissionTitle}>Notificações</Text>
                </View>
                <Text style={styles.permissionDesc}>
                  Receba alertas de manutenções e lembretes diários.
                </Text>
              </View>
              <View style={styles.permissionAction}>
                <Text style={[
                  styles.permissionStatus,
                  { color: permissions.notifications ? '#00A85A' : '#FF3B30' }
                ]}>
                  {permissions.notifications ? 'Ativo' : 'Desativado (Expo Go)'}
                </Text>
                {/* Button hidden as it is disabled in code */}
              </View>
            </View>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: getTitle() }} />



      <View style={styles.content}>
        {renderTabContent()}
      </View>

      <CategoryModal
        visible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        initialName={editingCategory?.name || ''}
        initialType={editingCategory?.type || 'fixed'}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
      />

      {/* App Modal */}
      <Modal visible={appModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.appModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingApp ? 'Editar App' : 'Novo App de Faturamento'}
              </Text>
              <TouchableOpacity onPress={() => setAppModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Nome do App</Text>
              <TextInput
                style={styles.modalInput}
                value={appName}
                onChangeText={setAppName}
                placeholder="Ex: Uber, 99, iFood..."
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.modalLabel}>Cor</Text>
              <View style={styles.colorGrid}>
                {APP_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      appColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setAppColor(color)}
                  >
                    {appColor === color && <MaterialIcons name="check" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Ícone</Text>
              <View style={styles.iconGrid}>
                {APP_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      appIcon === icon && styles.iconOptionSelected
                    ]}
                    onPress={() => setAppIcon(icon)}
                  >
                    <Text style={styles.iconOptionText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <View style={[styles.appIcon, { backgroundColor: appColor }]}>
                  <Text style={styles.appIconText}>{appIcon}</Text>
                </View>
                <Text style={styles.previewName}>{appName || 'Nome do App'}</Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAppModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveModalButton}
                onPress={handleSaveApp}
              >
                <Text style={styles.saveModalText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1F2937',
    paddingTop: 10,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#00A85A',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A85A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  categoryTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  appItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {
    fontSize: 20,
  },
  appDetails: {
    marginLeft: 12,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  appActions: {
    flexDirection: 'row',
  },
  workDayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  workDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#00A85A',
    borderColor: '#00A85A',
  },
  workDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursInput: {
    width: 60,
    backgroundColor: '#374151',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 8,
    borderRadius: 8,
    fontSize: 16,
  },
  hoursLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  workDaysContainer: {
    marginBottom: 16,
  },
  scheduleActions: {
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#00A85A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryContainer: {
    marginTop: 16,
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appModal: {
    width: '90%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContent: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
    marginBottom: 10,
  },
  iconOptionSelected: {
    backgroundColor: '#00A85A',
  },
  iconOptionText: {
    fontSize: 20,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Permission Styles
  permissionItem: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  permissionInfo: {
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  permissionDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  permissionAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  permissionButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  monthButton: {
    padding: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveModalButton: {
    backgroundColor: '#00A85A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  costInfo: {
    flex: 1,
  },
  costHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  costCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  costValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginRight: 16,
  },
  costDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  totalContainer: {
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
});
