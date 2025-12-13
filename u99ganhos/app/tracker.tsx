import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    FlatList,
    Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { locationService } from '@/services/locationService';
import TrackerStats from '@/components/TrackerStats';
import * as Location from 'expo-location';

export default function TrackerScreen() {
    const router = useRouter();
    const {
        data,
        startKMTracking,
        stopKMTracking,
        pauseKMTracking,
        resumeKMTracking,
        addGPSPoint,
        getCurrentSessionDistance,
        getCurrentSessionDuration,
        getTrackerSessions,
    } = useFinance();

    const [hasPermission, setHasPermission] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
    const [currentDistance, setCurrentDistance] = useState(0);
    const [currentDuration, setCurrentDuration] = useState(0);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

    // Check permissions on mount
    useEffect(() => {
        checkPermissions();
    }, []);

    // Update distance and duration when session is active
    useEffect(() => {
        if (data.activeSession?.status === 'active') {
            const interval = setInterval(() => {
                setCurrentDistance(getCurrentSessionDistance());
                setCurrentDuration(getCurrentSessionDuration());
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [data.activeSession, getCurrentSessionDistance, getCurrentSessionDuration]);

    // Start GPS tracking when session starts
    useEffect(() => {
        if (data.activeSession?.status === 'active') {
            startGPSTracking();
        } else {
            stopGPSTracking();
        }

        return () => stopGPSTracking();
    }, [data.activeSession?.status]);

    const checkPermissions = async () => {
        const granted = await locationService.hasPermissions();
        setHasPermission(granted);
    };

    const requestPermissions = async () => {
        const granted = await locationService.requestPermissions();
        setHasPermission(granted);
        if (!granted) {
            showAlert(
                'Permissão Necessária',
                'O app precisa acessar sua localização para rastrear a distância percorrida.'
            );
        }
    };

    const startGPSTracking = async () => {
        const started = await locationService.startWatching(
            (location: Location.LocationObject) => {
                const gpsPoint = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    timestamp: new Date(location.timestamp).toISOString(),
                    accuracy: location.coords.accuracy || undefined,
                    speed: location.coords.speed || undefined,
                };
                addGPSPoint(gpsPoint);
                setGpsAccuracy(location.coords.accuracy || null);
            },
            (error) => {
                console.error('GPS tracking error:', error);
                showAlert('Erro GPS', 'Não foi possível obter sua localização.');
            }
        );

        if (!started) {
            showAlert('Erro', 'Não foi possível iniciar o rastreamento GPS.');
        }
    };

    const stopGPSTracking = () => {
        locationService.stopWatching();
    };

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
                    { text: 'OK', onPress: onConfirm }
                ]);
            } else {
                Alert.alert(title, message);
            }
        }
    };

    const handleStartTracking = async () => {
        if (!hasPermission) {
            await requestPermissions();
            return;
        }

        // Select vehicle if available
        if (data.vehicles.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(data.vehicles[0].id);
        }

        const success = startKMTracking(selectedVehicleId);
        if (!success) {
            showAlert('Erro', 'Já existe uma sessão ativa.');
        }
    };

    const handleStopTracking = () => {
        if (!data.activeSession) return;

        const distance = currentDistance.toFixed(2);
        const duration = formatDuration(currentDuration);

        if (Platform.OS === 'web') {
            const autoSave = confirm(
                `Percurso Finalizado\n\nDistância: ${distance} km\nTempo: ${duration}\n\nSalvar automaticamente no veículo?`
            );
            stopKMTracking(autoSave);
        } else {
            Alert.alert(
                'Percurso Finalizado',
                `Distância: ${distance} km\nTempo: ${duration}\n\nSalvar automaticamente no veículo?`,
                [
                    {
                        text: 'Não Salvar',
                        style: 'cancel',
                        onPress: () => stopKMTracking(false)
                    },
                    {
                        text: 'Salvar',
                        onPress: () => stopKMTracking(true)
                    }
                ]
            );
        }
    };

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const formatDate = (isoString: string): string => {
        return new Date(isoString).toLocaleString('pt-BR');
    };

    const getGPSStatusColor = (): string => {
        if (!gpsAccuracy) return '#6B7280';
        if (gpsAccuracy < 20) return '#10B981'; // Good
        if (gpsAccuracy < 50) return '#F59E0B'; // Medium
        return '#EF4444'; // Poor
    };

    const renderSessionItem = ({ item }: { item: any }) => (
        <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
                <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{formatDate(item.startTime)}</Text>
                    {item.vehicleId && (
                        <Text style={styles.sessionVehicle}>
                            {data.vehicles.find(v => v.id === item.vehicleId)?.model || 'Veículo'}
                        </Text>
                    )}
                </View>
                <View style={styles.sessionStats}>
                    <Text style={styles.sessionDistance}>{item.totalDistanceKm.toFixed(2)} km</Text>
                    <Text style={styles.sessionDuration}>{formatDuration(item.duration)}</Text>
                </View>
            </View>
            {item.autoSaved && (
                <View style={styles.savedBadge}>
                    <MaterialIcons name="check-circle" size={14} color="#10B981" />
                    <Text style={styles.savedText}>Salvo automaticamente</Text>
                </View>
            )}
        </View>
    );

    const isTracking = data.activeSession?.status === 'active';
    const isPaused = data.activeSession?.status === 'paused';
    const recentSessions = getTrackerSessions().slice(0, 5);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Rastreador GPS',
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
                {/* Main Tracker Card */}
                <View style={styles.trackerCard}>
                    {isTracking || isPaused ? (
                        <>
                            {/* Active Tracking Display */}
                            <View style={styles.distanceDisplay}>
                                <Text style={styles.distanceValue}>{currentDistance.toFixed(2)}</Text>
                                <Text style={styles.distanceUnit}>km</Text>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <MaterialIcons name="access-time" size={20} color="#9CA3AF" />
                                    <Text style={styles.statText}>{formatDuration(currentDuration)}</Text>
                                </View>
                                {gpsAccuracy && (
                                    <View style={styles.statItem}>
                                        <MaterialIcons name="gps-fixed" size={20} color={getGPSStatusColor()} />
                                        <Text style={styles.statText}>±{gpsAccuracy.toFixed(0)}m</Text>
                                    </View>
                                )}
                            </View>

                            {/* Control Buttons */}
                            <View style={styles.controlButtons}>
                                {isTracking ? (
                                    <TouchableOpacity style={styles.pauseButton} onPress={pauseKMTracking}>
                                        <MaterialIcons name="pause" size={24} color="#FFF" />
                                        <Text style={styles.buttonText}>Pausar</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.resumeButton} onPress={resumeKMTracking}>
                                        <MaterialIcons name="play-arrow" size={24} color="#FFF" />
                                        <Text style={styles.buttonText}>Continuar</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.stopButton} onPress={handleStopTracking}>
                                    <MaterialIcons name="stop" size={24} color="#FFF" />
                                    <Text style={styles.buttonText}>Encerrar</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Idle State */}
                            <View style={styles.idleState}>
                                <FontAwesome5 name="route" size={64} color="#00A85A" />
                                <Text style={styles.idleTitle}>Pronto para Rastrear</Text>
                                <Text style={styles.idleSubtitle}>
                                    Inicie o percurso para rastrear automaticamente a distância percorrida
                                </Text>
                            </View>

                            {/* Vehicle Selection */}
                            {data.vehicles.length > 0 && (
                                <View style={styles.vehicleSelector}>
                                    <Text style={styles.vehicleSelectorLabel}>Veículo (opcional):</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {data.vehicles.map(vehicle => (
                                            <TouchableOpacity
                                                key={vehicle.id}
                                                style={[
                                                    styles.vehicleOption,
                                                    selectedVehicleId === vehicle.id && styles.vehicleOptionSelected
                                                ]}
                                                onPress={() => setSelectedVehicleId(vehicle.id)}
                                            >
                                                <FontAwesome5
                                                    name={vehicle.type === 'moto' ? 'motorcycle' : 'car'}
                                                    size={16}
                                                    color={selectedVehicleId === vehicle.id ? '#FFF' : '#9CA3AF'}
                                                />
                                                <Text style={[
                                                    styles.vehicleOptionText,
                                                    selectedVehicleId === vehicle.id && styles.vehicleOptionTextSelected
                                                ]}>
                                                    {vehicle.model}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Start Button */}
                            <TouchableOpacity style={styles.startButton} onPress={handleStartTracking}>
                                <MaterialIcons name="play-arrow" size={32} color="#FFF" />
                                <Text style={styles.startButtonText}>Iniciar Percurso</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                {/* Statistics */}
                <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                    <TrackerStats />
                </View>

                {/* Recent Sessions */}
                {
                    recentSessions.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Percursos Recentes</Text>
                            <FlatList
                                data={recentSessions}
                                renderItem={renderSessionItem}
                                keyExtractor={(item) => item.id}
                                scrollEnabled={false}
                            />
                        </View>
                    )
                }
            </ScrollView >
        </View >
    );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    content: { flex: 1 },

    trackerCard: {
        backgroundColor: '#1F2937',
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
    },

    // Active Tracking
    distanceDisplay: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 24,
    },
    distanceValue: {
        fontSize: screenWidth < 380 ? 56 : 72,
        fontWeight: '700',
        color: '#00A85A',
    },
    distanceUnit: {
        fontSize: 32,
        fontWeight: '600',
        color: '#9CA3AF',
        marginLeft: 8,
    },

    statsRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 32,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statText: {
        fontSize: 16,
        color: '#D1D5DB',
        fontWeight: '500',
    },

    controlButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    pauseButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    resumeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3B82F6',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    stopButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EF4444',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: screenWidth < 380 ? 14 : 16,
        fontWeight: '600',
    },

    // Idle State
    idleState: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    idleTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        marginTop: 16,
    },
    idleSubtitle: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 16,
    },

    vehicleSelector: {
        width: '100%',
        marginTop: 24,
    },
    vehicleSelectorLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#D1D5DB',
        marginBottom: 12,
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
    vehicleOptionText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    vehicleOptionTextSelected: {
        color: '#FFF',
    },

    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00A85A',
        width: '100%',
        padding: 20,
        borderRadius: 12,
        marginTop: 24,
        gap: 12,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
    },

    // Sessions
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 12,
    },

    sessionCard: {
        backgroundColor: '#1F2937',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sessionInfo: {
        flex: 1,
    },
    sessionDate: {
        fontSize: 14,
        color: '#D1D5DB',
        fontWeight: '500',
    },
    sessionVehicle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    sessionStats: {
        alignItems: 'flex-end',
    },
    sessionDistance: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00A85A',
    },
    sessionDuration: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
    },
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        gap: 6,
    },
    savedText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '500',
    },
});
