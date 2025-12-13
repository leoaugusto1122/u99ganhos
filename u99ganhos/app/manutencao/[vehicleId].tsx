import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Modal,
    TextInput,
    Alert,
    Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { Maintenance } from '@/services/types';

export default function ManutencaoVeiculoScreen() {
    const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
    const router = useRouter();
    const {
        data,
        getVehicleMaintenances,
        addMaintenance,
        updateMaintenance,
        deleteMaintenance,
        completeMaintenance,
    } = useFinance();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [intervalKm, setIntervalKm] = useState('');
    const [intervalDays, setIntervalDays] = useState('');
    const [lastKm, setLastKm] = useState('');
    const [lastDate, setLastDate] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');

    const vehicle = useMemo(() => {
        return data.vehicles.find(v => v.id === vehicleId);
    }, [data.vehicles, vehicleId]);

    const maintenances = useMemo(() => {
        return getVehicleMaintenances(vehicleId || '');
    }, [vehicleId, data.maintenances, getVehicleMaintenances]);

    const groupedMaintenances = useMemo(() => {
        const overdue = maintenances.filter(m => m.active && m.status === 'overdue');
        const urgent = maintenances.filter(m => m.active && m.status === 'urgent');
        const upcoming = maintenances.filter(m => m.active && m.status === 'upcoming');
        const ok = maintenances.filter(m => m.active && m.status === 'ok');

        return { overdue, urgent, upcoming, ok };
    }, [maintenances]);

    const showAlert = (title: string, message: string, onConfirm?: () => void) => {
        if (Platform.OS === 'web') {
            if (onConfirm) {
                if (confirm(`${title}\n\n${message}`)) onConfirm();
            } else {
                alert(`${title}\n\n${message}`);
            }
        } else {
            if (onConfirm) {
                Alert.alert(title, message, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Confirmar', onPress: onConfirm }
                ]);
            } else {
                Alert.alert(title, message);
            }
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setCategory('');
        setIntervalKm('');
        setIntervalDays('');
        setLastKm('');
        setLastDate('');
        setEstimatedCost('');
        setEditingMaintenance(null);
    };

    const handleOpenModal = (maintenance?: Maintenance) => {
        if (maintenance) {
            setEditingMaintenance(maintenance);
            setName(maintenance.name);
            setDescription(maintenance.description || '');
            setCategory(maintenance.category || '');
            setIntervalKm(maintenance.intervalKm?.toString() || '');
            setIntervalDays(maintenance.intervalDays?.toString() || '');
            setLastKm(maintenance.lastKm?.toString() || '');
            setLastDate(maintenance.lastDate || '');
            setEstimatedCost(maintenance.estimatedCost?.toString() || '');
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const handleSave = () => {
        if (!name.trim()) {
            showAlert('Erro', 'Digite o nome da manutenção');
            return;
        }

        if (!intervalKm && !intervalDays) {
            showAlert('Erro', 'Defina pelo menos um intervalo (KM ou Dias)');
            return;
        }

        const maintenanceData = {
            vehicleId: vehicleId || '',
            name: name.trim(),
            description: description.trim() || undefined,
            category: category.trim() || undefined,
            intervalKm: intervalKm ? parseInt(intervalKm) : undefined,
            intervalDays: intervalDays ? parseInt(intervalDays) : undefined,
            lastKm: lastKm ? parseInt(lastKm) : undefined,
            lastDate: lastDate || undefined,
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
            active: true,
        };

        let success;
        if (editingMaintenance) {
            success = updateMaintenance(editingMaintenance.id, maintenanceData);
        } else {
            success = addMaintenance(maintenanceData);
        }

        if (success) {
            setModalVisible(false);
            resetForm();
        } else {
            showAlert('Erro', 'Não foi possível salvar a manutenção');
        }
    };

    const handleComplete = (maintenance: Maintenance) => {
        if (Platform.OS === 'web') {
            const km = prompt('Digite a KM atual do veículo:', vehicle?.currentKm.toString());
            if (km) {
                completeMaintenance(maintenance.id, parseInt(km));
            }
        } else {
            Alert.prompt(
                'Concluir Manutenção',
                'Digite a KM atual:',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Concluir',
                        onPress: (value?: string) => {
                            if (value) {
                                completeMaintenance(maintenance.id, parseInt(value));
                            }
                        }
                    }
                ],
                'plain-text',
                vehicle?.currentKm.toString()
            );
        }
    };

    const handleDelete = (id: string) => {
        showAlert('Excluir Manutenção', 'Tem certeza?', () => {
            deleteMaintenance(id);
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'overdue': return '#EF4444';
            case 'urgent': return '#F59E0B';
            case 'upcoming': return '#3B82F6';
            default: return '#10B981';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'overdue': return 'Atrasada';
            case 'urgent': return 'Urgente';
            case 'upcoming': return 'Próxima';
            default: return 'OK';
        }
    };

    const getRemainingText = (m: Maintenance) => {
        if (!vehicle) return '';

        const parts = [];
        if (m.nextKm !== undefined) {
            const kmRemaining = m.nextKm - vehicle.currentKm;
            parts.push(`${kmRemaining.toLocaleString('pt-BR')} km`);
        }
        if (m.nextDate) {
            const daysRemaining = Math.floor(
                (new Date(m.nextDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            parts.push(`${daysRemaining} dias`);
        }
        return parts.length > 0 ? `Faltam: ${parts.join(' ou ')}` : '';
    };

    const renderMaintenanceItem = ({ item }: { item: Maintenance }) => (
        <View style={[styles.maintenanceCard, { borderLeftColor: getStatusColor(item.status) }]}>
            <View style={styles.maintenanceHeader}>
                <View style={styles.maintenanceInfo}>
                    <Text style={styles.maintenanceName}>{item.name}</Text>
                    {item.description && (
                        <Text style={styles.maintenanceDesc}>{item.description}</Text>
                    )}
                    <View style={styles.maintenanceDetails}>
                        {item.intervalKm && (
                            <Text style={styles.detailText}>
                                <MaterialIcons name="speed" size={14} color="#9CA3AF" /> {item.intervalKm.toLocaleString('pt-BR')} km
                            </Text>
                        )}
                        {item.intervalDays && (
                            <Text style={styles.detailText}>
                                <MaterialIcons name="event" size={14} color="#9CA3AF" /> {item.intervalDays} dias
                            </Text>
                        )}
                    </View>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)} • {getRemainingText(item)}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <MaterialIcons
                        name={item.status === 'overdue' ? 'error' : item.status === 'urgent' ? 'warning' : 'schedule'}
                        size={20}
                        color="#FFF"
                    />
                </View>
            </View>

            <View style={styles.maintenanceActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleComplete(item)}
                >
                    <MaterialIcons name="check-circle" size={18} color="#10B981" />
                    <Text style={styles.actionText}>Concluir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleOpenModal(item)}
                >
                    <MaterialIcons name="edit" size={18} color="#3B82F6" />
                    <Text style={styles.actionText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id)}
                >
                    <MaterialIcons name="delete" size={18} color="#EF4444" />
                    <Text style={styles.actionText}>Excluir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSection = (title: string, items: Maintenance[]) => {
        if (items.length === 0) return null;

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title} ({items.length})</Text>
                <FlatList
                    data={items}
                    renderItem={renderMaintenanceItem}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                />
            </View>
        );
    };

    if (!vehicle) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        headerShown: true,
                        title: 'Veículo não encontrado',
                        headerStyle: { backgroundColor: '#1F2937' },
                        headerTintColor: '#FFF',
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                                <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color="#EF4444" />
                    <Text style={styles.errorText}>Veículo não encontrado</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: `Manutenções - ${vehicle.brand} ${vehicle.model}`,
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

            <ScrollView style={styles.content}>
                {/* Vehicle Header */}
                <View style={styles.vehicleHeader}>
                    <Text style={styles.vehicleTitle}>{vehicle.brand} {vehicle.model}</Text>
                    <Text style={styles.vehicleInfo}>{vehicle.year} • {vehicle.plate}</Text>
                    <Text style={styles.vehicleKm}>KM Atual: {vehicle.currentKm.toLocaleString('pt-BR')}</Text>
                </View>

                {/* Add Button */}
                <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
                    <MaterialIcons name="add" size={24} color="#FFF" />
                    <Text style={styles.addButtonText}>Nova Manutenção</Text>
                </TouchableOpacity>

                {/* Maintenance Groups */}
                {maintenances.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="build" size={48} color="#6B7280" />
                        <Text style={styles.emptyText}>Nenhuma manutenção cadastrada</Text>
                        <Text style={styles.emptyHint}>Adicione manutenções para rastrear automaticamente</Text>
                    </View>
                ) : (
                    <>
                        {renderSection('⚠️ Atrasadas', groupedMaintenances.overdue)}
                        {renderSection('🔥 Urgentes', groupedMaintenances.urgent)}
                        {renderSection('📅 Próximas', groupedMaintenances.upcoming)}
                        {renderSection('✅ Em Dia', groupedMaintenances.ok)}
                    </>
                )}
            </ScrollView>

            {/* Maintenance Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingMaintenance ? 'Editar Manutenção' : 'Nova Manutenção'}
                            </Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <MaterialIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Nome *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Ex: Troca de Óleo, Revisão"
                                placeholderTextColor="#9CA3AF"
                            />

                            <Text style={styles.inputLabel}>Descrição</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Detalhes adicionais..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                            />

                            <Text style={styles.inputLabel}>Categoria</Text>
                            <TextInput
                                style={styles.input}
                                value={category}
                                onChangeText={setCategory}
                                placeholder="Ex: Motor, Suspensão, Freios"
                                placeholderTextColor="#9CA3AF"
                            />

                            <Text style={styles.sectionHeader}>Intervalos *</Text>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>A cada (KM)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={intervalKm}
                                        onChangeText={setIntervalKm}
                                        placeholder="5000"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>A cada (Dias)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={intervalDays}
                                        onChangeText={setIntervalDays}
                                        placeholder="180"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={styles.sectionHeader}>Última Vez Realizada</Text>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>KM</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={lastKm}
                                        onChangeText={setLastKm}
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Data</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={lastDate}
                                        onChangeText={setLastDate}
                                        placeholder="AAAA-MM-DD"
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                            </View>

                            <Text style={styles.inputLabel}>Custo Estimado (R$)</Text>
                            <TextInput
                                style={styles.input}
                                value={estimatedCost}
                                onChangeText={setEstimatedCost}
                                placeholder="150.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="decimal-pad"
                            />
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setModalVisible(false); resetForm(); }}
                            >
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    content: { flex: 1 },

    vehicleHeader: {
        backgroundColor: '#1F2937',
        padding: 20,
        margin: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    vehicleTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    vehicleInfo: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    vehicleKm: { fontSize: 16, color: '#10B981', fontWeight: '600', marginTop: 8 },

    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00A85A',
        marginHorizontal: 16,
        padding: 14,
        borderRadius: 12,
        justifyContent: 'center',
        marginBottom: 16,
    },
    addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },

    section: { marginHorizontal: 16, marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12 },

    maintenanceCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
    },
    maintenanceHeader: { flexDirection: 'row', marginBottom: 12 },
    maintenanceInfo: { flex: 1 },
    maintenanceName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    maintenanceDesc: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    maintenanceDetails: { flexDirection: 'row', gap: 12, marginTop: 8 },
    detailText: { fontSize: 12, color: '#9CA3AF' },
    statusText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
    statusBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },

    maintenanceActions: { flexDirection: 'row', gap: 8 },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#374151',
        padding: 8,
        borderRadius: 8,
        gap: 4,
    },
    actionText: { fontSize: 12, color: '#FFF', fontWeight: '500' },

    emptyState: { alignItems: 'center', padding: 48 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF', marginTop: 12 },
    emptyHint: { fontSize: 14, color: '#6B7280', marginTop: 4 },

    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 18, fontWeight: '600', color: '#EF4444', marginTop: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modal: { backgroundColor: '#1F2937', borderRadius: 16, maxHeight: '90%' },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    modalContent: { padding: 20, maxHeight: 500 },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        gap: 12,
    },

    inputLabel: { fontSize: 14, fontWeight: '600', color: '#FFF', marginBottom: 8, marginTop: 12 },
    sectionHeader: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 16, marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#FFF',
        backgroundColor: '#111827',
    },
    textArea: { minHeight: 60, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },

    cancelBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    cancelText: { color: '#9CA3AF', fontWeight: '600' },
    saveBtn: {
        flex: 2,
        backgroundColor: '#00A85A',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveText: { color: '#FFF', fontWeight: '600' },
});
