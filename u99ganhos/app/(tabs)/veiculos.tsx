import React, { useState, useMemo } from 'react';
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
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';

export default function VeiculosScreen() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);

    // Form states
    const [vehicleType, setVehicleType] = useState<'moto' | 'car'>('moto');
    const [brand, setBrand] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [plate, setPlate] = useState('');
    const [currentKm, setCurrentKm] = useState('');
    const [avgKmPerLiter, setAvgKmPerLiter] = useState('');

    const { data, addVehicle, updateVehicle, deleteVehicle, updateVehicleKm, getVehicleMaintenances } = useFinance();

    const vehiclesWithStats = useMemo(() => {
        return data.vehicles.map(vehicle => {
            const maintenances = getVehicleMaintenances(vehicle.id).filter(m => m.active);
            const overdue = maintenances.filter(m => m.status === 'overdue').length;
            const urgent = maintenances.filter(m => m.status === 'urgent').length;
            const upcoming = maintenances.filter(m => m.status === 'upcoming').length;

            return {
                ...vehicle,
                maintenanceStats: { overdue, urgent, upcoming, total: maintenances.length }
            };
        });
    }, [data.vehicles, data.maintenances, getVehicleMaintenances]);

    const showAlert = (title: string, message: string, onConfirm?: () => void) => {
        if (Platform.OS === 'web') {
            if (onConfirm) {
                if (confirm(`${title}\n\n${message}`)) {
                    onConfirm();
                }
            } else {
                alert(`${title}\n\n${message}`);
            }
        } else {
            if (onConfirm) {
                Alert.alert(title, message, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Confirmar', style: 'destructive', onPress: onConfirm }
                ]);
            } else {
                Alert.alert(title, message);
            }
        }
    };

    const resetForm = () => {
        setVehicleType('moto');
        setBrand('');
        setModel('');
        setYear('');
        setPlate('');
        setCurrentKm('');
        setAvgKmPerLiter('');
        setEditingVehicle(null);
    };

    const handleOpenModal = (vehicle?: any) => {
        if (vehicle) {
            setEditingVehicle(vehicle);
            setVehicleType(vehicle.type);
            setBrand(vehicle.brand);
            setModel(vehicle.model);
            setYear(vehicle.year.toString());
            setPlate(vehicle.plate);
            setCurrentKm(vehicle.currentKm.toString());
            setAvgKmPerLiter(vehicle.avgKmPerLiter?.toString() || '');
        } else {
            resetForm();
        }
        setModalVisible(true);
    };

    const handleSave = () => {
        if (!brand.trim() || !model.trim() || !year || !plate.trim() || !currentKm) {
            showAlert('Erro', 'Preencha todos os campos obrigatórios');
            return;
        }

        const yearNum = parseInt(year);
        const kmNum = parseInt(currentKm);
        const avgKmNum = avgKmPerLiter ? parseFloat(avgKmPerLiter) : undefined;

        if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
            showAlert('Erro', 'Ano inválido');
            return;
        }

        if (isNaN(kmNum) || kmNum < 0) {
            showAlert('Erro', 'Quilometragem inválida');
            return;
        }

        let success;
        if (editingVehicle) {
            success = updateVehicle(editingVehicle.id, {
                type: vehicleType,
                brand: brand.trim(),
                model: model.trim(),
                year: yearNum,
                plate: plate.trim().toUpperCase(),
                currentKm: kmNum,
                avgKmPerLiter: avgKmNum
            });
        } else {
            success = addVehicle({
                type: vehicleType,
                brand: brand.trim(),
                model: model.trim(),
                year: yearNum,
                plate: plate.trim().toUpperCase(),
                currentKm: kmNum,
                avgKmPerLiter: avgKmNum,
                active: true
            });
        }

        if (success) {
            setModalVisible(false);
            resetForm();
        } else {
            showAlert('Erro', 'Não foi possível salvar o veículo');
        }
    };

    const handleDelete = (id: string) => {
        showAlert('Excluir Veículo', 'Tem certeza? Esta ação não pode ser desfeita.', () => {
            deleteVehicle(id);
        });
    };

    const handleUpdateKm = (id: string) => {
        if (Platform.OS === 'web') {
            const newKm = prompt('Digite a nova quilometragem:');
            if (newKm) {
                const km = parseInt(newKm);
                if (!isNaN(km) && km >= 0) {
                    updateVehicleKm(id, km);
                } else {
                    alert('Quilometragem inválida');
                }
            }
        } else {
            Alert.prompt(
                'Atualizar KM',
                'Digite a nova quilometragem:',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Atualizar',
                        onPress: (value?: string) => {
                            const km = parseInt(value || '0');
                            if (!isNaN(km) && km >= 0) {
                                updateVehicleKm(id, km);
                            } else {
                                Alert.alert('Erro', 'Quilometragem inválida');
                            }
                        }
                    }
                ],
                'plain-text',
                '',
                'numeric'
            );
        }
    };

    const renderVehicleItem = ({ item }: { item: any }) => (
        <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
                <View style={styles.vehicleIconContainer}>
                    <FontAwesome5
                        name={item.type === 'moto' ? 'motorcycle' : 'car'}
                        size={32}
                        color="#00A85A"
                    />
                </View>
                <View style={styles.vehicleInfo}>
                    <Text style={styles.vehicleModel}>{item.brand} {item.model}</Text>
                    <Text style={styles.vehicleDetails}>{item.year} • {item.plate}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.active ? '#059669' : '#6B7280' }]}>
                    <Text style={styles.statusText}>{item.active ? 'Ativo' : 'Inativo'}</Text>
                </View>
            </View>

            <View style={styles.vehicleStats}>
                <View style={styles.statItem}>
                    <MaterialIcons name="speed" size={20} color="#9CA3AF" />
                    <View style={styles.statContent}>
                        <Text style={styles.statLabel}>KM Atual</Text>
                        <Text style={styles.statValue}>{item.currentKm.toLocaleString('pt-BR')}</Text>
                    </View>
                </View>
                {item.avgKmPerLiter && (
                    <View style={styles.statItem}>
                        <MaterialIcons name="local-gas-station" size={20} color="#9CA3AF" />
                        <View style={styles.statContent}>
                            <Text style={styles.statLabel}>Média</Text>
                            <Text style={styles.statValue}>{item.avgKmPerLiter} km/L</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Maintenance Summary */}
            {/* Maintenance Summary */}
            {item.maintenanceStats?.total > 0 && (
                <TouchableOpacity
                    style={[
                        styles.maintenanceAlert,
                        !(item.maintenanceStats.overdue > 0 || item.maintenanceStats.urgent > 0 || item.maintenanceStats.upcoming > 0) && {
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderLeftColor: '#10B981'
                        }
                    ]}
                    onPress={() => router.push(`/manutencao/${item.id}` as any)}
                    activeOpacity={0.7}
                >
                    <MaterialIcons
                        name="build"
                        size={16}
                        color={(item.maintenanceStats.overdue > 0 || item.maintenanceStats.urgent > 0 || item.maintenanceStats.upcoming > 0) ? "#F59E0B" : "#10B981"}
                    />
                    <Text style={[
                        styles.maintenanceText,
                        !(item.maintenanceStats.overdue > 0 || item.maintenanceStats.urgent > 0 || item.maintenanceStats.upcoming > 0) && { color: '#10B981' }
                    ]}>
                        {item.maintenanceStats.overdue > 0
                            ? `${item.maintenanceStats.overdue} Atrasada(s)`
                            : item.maintenanceStats.urgent > 0
                                ? `${item.maintenanceStats.urgent} Urgente(s)`
                                : item.maintenanceStats.upcoming > 0
                                    ? `${item.maintenanceStats.upcoming} Próxima(s)`
                                    : `${item.maintenanceStats.total} Manutenção(ões) em dia`
                        }
                    </Text>
                    {item.maintenanceStats.overdue > 0 && <MaterialIcons name="error" size={16} color="#EF4444" style={{ marginLeft: 'auto' }} />}
                    {!(item.maintenanceStats.overdue > 0 || item.maintenanceStats.urgent > 0 || item.maintenanceStats.upcoming > 0) &&
                        <MaterialIcons name="check-circle" size={16} color="#10B981" style={{ marginLeft: 'auto' }} />
                    }
                </TouchableOpacity>
            )}

            <View style={styles.vehicleActions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleUpdateKm(item.id)}
                >
                    <MaterialIcons name="update" size={20} color="#00A85A" />
                    <Text style={styles.actionBtnText}>Atualizar KM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenModal(item)}
                >
                    <MaterialIcons name="edit" size={20} color="#3B82F6" />
                    <Text style={styles.actionBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item.id)}
                >
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                    <Text style={styles.actionBtnText}>Excluir</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>



            <ScrollView style={styles.content}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleOpenModal()}
                >
                    <MaterialIcons name="add" size={24} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Adicionar Veículo</Text>
                </TouchableOpacity>

                {data.vehicles.length === 0 ? (
                    <View style={styles.emptyState}>
                        <FontAwesome5 name="car" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>Nenhum veículo cadastrado</Text>
                        <Text style={styles.emptySubtitle}>
                            Adicione seus veículos para gerenciar custos e manutenção
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={vehiclesWithStats}
                        renderItem={renderVehicleItem}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                    />
                )}
            </ScrollView>

            {/* Vehicle Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                            </Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <MaterialIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Type Selection */}
                            <Text style={styles.inputLabel}>Tipo *</Text>
                            <View style={styles.typeSelector}>
                                <TouchableOpacity
                                    style={[styles.typeOption, vehicleType === 'moto' && styles.typeOptionActive]}
                                    onPress={() => setVehicleType('moto')}
                                >
                                    <FontAwesome5 name="motorcycle" size={24} color={vehicleType === 'moto' ? '#FFF' : '#6B7280'} />
                                    <Text style={[styles.typeText, vehicleType === 'moto' && styles.typeTextActive]}>Moto</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeOption, vehicleType === 'car' && styles.typeOptionActive]}
                                    onPress={() => setVehicleType('car')}
                                >
                                    <FontAwesome5 name="car" size={24} color={vehicleType === 'car' ? '#FFF' : '#6B7280'} />
                                    <Text style={[styles.typeText, vehicleType === 'car' && styles.typeTextActive]}>Carro</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Marca *</Text>
                            <TextInput
                                style={styles.input}
                                value={brand}
                                onChangeText={setBrand}
                                placeholder="Ex: Honda, Toyota..."
                                placeholderTextColor="#9CA3AF"
                            />

                            <Text style={styles.inputLabel}>Modelo *</Text>
                            <TextInput
                                style={styles.input}
                                value={model}
                                onChangeText={setModel}
                                placeholder="Ex: CG 160, Corolla..."
                                placeholderTextColor="#9CA3AF"
                            />

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Ano *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={year}
                                        onChangeText={setYear}
                                        placeholder="2023"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        maxLength={4}
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Placa (Mercosul) *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={plate}
                                        onChangeText={(text) => setPlate(text.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                        placeholder="ABC1D23"
                                        placeholderTextColor="#9CA3AF"
                                        maxLength={7}
                                        autoCapitalize="characters"
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>KM Atual *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={currentKm}
                                        onChangeText={setCurrentKm}
                                        placeholder="50000"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfInput}>
                                    <Text style={styles.inputLabel}>Média (km/L)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={avgKmPerLiter}
                                        onChangeText={setAvgKmPerLiter}
                                        placeholder="12.5"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setModalVisible(false); resetForm(); }}
                            >
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveBtn}
                                onPress={handleSave}
                            >
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
    content: { flex: 1, padding: 16 },
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
    addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },

    vehicleCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 16 },
    vehicleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    vehicleIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehicleInfo: { flex: 1, marginLeft: 12 },
    vehicleModel: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    vehicleDetails: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontWeight: '600', color: '#FFF' },

    vehicleStats: { flexDirection: 'row', marginBottom: 16, gap: 16 },
    statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', padding: 12, borderRadius: 8 },
    statContent: { marginLeft: 8, flex: 1 },
    statLabel: { fontSize: 12, color: '#9CA3AF' },
    statValue: { fontSize: 16, fontWeight: '600', color: '#FFF', marginTop: 2 },

    vehicleActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#374151', padding: 10, borderRadius: 8, gap: 4 },
    actionBtnText: { fontSize: 12, color: '#FFF', fontWeight: '500' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
    modal: { backgroundColor: '#1F2937', borderRadius: 16, width: '100%', maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    modalContent: { padding: 16 }, // Removed fixed maxHeight
    modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#374151', gap: 12 },

    inputLabel: { fontSize: 14, fontWeight: '600', color: '#FFF', marginBottom: 8, marginTop: 12 },
    input: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#FFF',
        backgroundColor: '#111827',
    },
    row: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },

    typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    typeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#374151',
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 8,
    },
    typeOptionActive: { backgroundColor: '#059669', borderColor: '#10B981' },
    typeText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
    typeTextActive: { color: '#FFF' },

    cancelBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#374151' },
    cancelText: { color: '#9CA3AF', fontWeight: '600' },
    saveBtn: { flex: 2, backgroundColor: '#00A85A', padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    saveText: { color: '#FFF', fontWeight: '600' },

    maintenanceAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 8,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B'
    },
    maintenanceText: {
        fontSize: 14,
        color: '#F59E0B',
        fontWeight: '500'
    }
});
