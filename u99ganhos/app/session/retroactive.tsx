import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Platform,
    KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFinance } from '@/hooks/useFinance';

export default function RetroactiveSessionScreen() {
    const router = useRouter();
    const { data, createRetroactiveSession } = useFinance();

    const [date, setDate] = useState(new Date());
    const [startTime, setStartTime] = useState(() => {
        const d = new Date();
        d.setHours(8, 0, 0, 0);
        return d;
    });
    const [endTime, setEndTime] = useState(() => {
        const d = new Date();
        d.setHours(17, 0, 0, 0);
        return d;
    });
    const [vehicleId, setVehicleId] = useState<string | undefined>(data.vehicles.find(v => v.active)?.id || data.vehicles[0]?.id);
    const [totalKm, setTotalKm] = useState('');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const handleSave = () => {
        if (!vehicleId) {
            Alert.alert('Erro', 'Selecione um veículo.');
            return;
        }
        if (!totalKm) {
            Alert.alert('Erro', 'Informe o KM total rodado.');
            return;
        }

        const km = parseFloat(totalKm.replace(',', '.'));
        if (isNaN(km) || km < 0) {
            Alert.alert('Erro', 'KM inválido.');
            return;
        }

        const formatTime = (d: Date) => {
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };

        const sessionData = {
            date: date.toISOString().split('T')[0],
            startTime: formatTime(startTime),
            endTime: formatTime(endTime),
            vehicleId,
            totalKm: km
        };

        const newSession = createRetroactiveSession(sessionData);

        if (newSession) {
            Alert.alert(
                'Sessão Criada',
                'Agora você pode registrar os ganhos deste dia.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.replace({ pathname: '/session/summary', params: { sessionId: newSession.id } })
                    }
                ]
            );
        } else {
            Alert.alert('Erro', 'Falha ao criar sessão.');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const onStartTimeChange = (event: any, selectedDate?: Date) => {
        setShowStartTimePicker(false);
        if (selectedDate) {
            setStartTime(selectedDate);
        }
    };

    const onEndTimeChange = (event: any, selectedDate?: Date) => {
        setShowEndTimePicker(false);
        if (selectedDate) {
            setEndTime(selectedDate);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Sessão Retroativa</Text>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.description}>
                    Esqueceu de registrar um dia de trabalho? Crie uma sessão manual abaixo.
                </Text>

                {/* Date */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Data</Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <MaterialIcons name="calendar-today" size={20} color="#9CA3AF" />
                        <Text style={styles.dateText}>{date.toLocaleDateString('pt-BR')}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                {/* Time Range */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Início</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowStartTimePicker(true)}
                        >
                            <MaterialIcons name="access-time" size={20} color="#9CA3AF" />
                            <Text style={styles.dateText}>
                                {String(startTime.getHours()).padStart(2, '0')}:{String(startTime.getMinutes()).padStart(2, '0')}
                            </Text>
                        </TouchableOpacity>
                        {showStartTimePicker && (
                            <DateTimePicker
                                value={startTime}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={onStartTimeChange}
                            />
                        )}
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.label}>Fim</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowEndTimePicker(true)}
                        >
                            <MaterialIcons name="access-time" size={20} color="#9CA3AF" />
                            <Text style={styles.dateText}>
                                {String(endTime.getHours()).padStart(2, '0')}:{String(endTime.getMinutes()).padStart(2, '0')}
                            </Text>
                        </TouchableOpacity>
                        {showEndTimePicker && (
                            <DateTimePicker
                                value={endTime}
                                mode="time"
                                is24Hour={true}
                                display="default"
                                onChange={onEndTimeChange}
                            />
                        )}
                    </View>
                </View>

                {/* Vehicle */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Veículo</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
                        {data.vehicles.map(vehicle => (
                            <TouchableOpacity
                                key={vehicle.id}
                                style={[
                                    styles.vehicleOption,
                                    vehicleId === vehicle.id && styles.vehicleOptionSelected
                                ]}
                                onPress={() => setVehicleId(vehicle.id)}
                            >
                                <FontAwesome5
                                    name={vehicle.type === 'moto' ? 'motorcycle' : 'car'}
                                    size={16}
                                    color={vehicleId === vehicle.id ? '#FFF' : '#9CA3AF'}
                                />
                                <Text style={[
                                    styles.vehicleText,
                                    vehicleId === vehicle.id && styles.vehicleTextSelected
                                ]}>
                                    {vehicle.model}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Total KM */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>KM Total Rodado</Text>
                    <View style={styles.kmInputContainer}>
                        <MaterialIcons name="speed" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.kmInput}
                            value={totalKm}
                            onChangeText={setTotalKm}
                            placeholder="0"
                            placeholderTextColor="#6B7280"
                            keyboardType="numeric"
                        />
                        <Text style={styles.kmSuffix}>km</Text>
                    </View>
                    <Text style={styles.helperText}>
                        O KM do veículo será atualizado somando este valor.
                    </Text>
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>Criar Sessão e Adicionar Ganhos</Text>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#1F2937',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    description: {
        color: '#9CA3AF',
        fontSize: 14,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    dateInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        padding: 12,
        borderRadius: 8,
        gap: 10,
    },
    dateText: {
        color: '#FFF',
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    vehicleScroll: {
        flexDirection: 'row',
    },
    vehicleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginRight: 8,
        gap: 8,
    },
    vehicleOptionSelected: {
        backgroundColor: '#00A85A',
    },
    vehicleText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
    vehicleTextSelected: {
        color: '#FFF',
    },
    kmInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    kmInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        paddingVertical: 12,
    },
    kmSuffix: {
        color: '#9CA3AF',
        fontSize: 16,
        fontWeight: '500',
    },
    helperText: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 6,
    },
    saveButton: {
        backgroundColor: '#00A85A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 8,
        marginBottom: 40,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
