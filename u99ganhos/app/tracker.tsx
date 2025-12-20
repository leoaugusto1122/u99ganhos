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
import EarningsModal from '@/components/EarningsModal';
import { EarningsRecord } from '@/services/types';
import * as Location from 'expo-location';

export default function TrackerScreen() {
    const router = useRouter();
    const {
        data,
        startWorkSession,
        finishWorkSession,
        pauseKMTracking,
        resumeKMTracking,
        addGPSPoint,
        getCurrentSessionDistance,
        getCurrentSessionDuration,
        getTrackerSessions,
        deleteTrackerSession,
        updateTrackerSession,
        addEarningsRecord,
    } = useFinance();

    const [hasPermission, setHasPermission] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
    const [currentDistance, setCurrentDistance] = useState(0);
    const [currentDuration, setCurrentDuration] = useState(0);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [earningsModalVisible, setEarningsModalVisible] = useState(false);

    // Calculate Earnings for Active Session
    const sessionEarnings = data.activeSession
        ? data.earningsRecords.filter(r => r.sessionId === data.activeSession!.id)
        : [];
    const totalSessionEarnings = sessionEarnings.reduce((sum, r) => sum + r.grossEarnings, 0);

    const activeVehicle = data.activeSession?.vehicleId
        ? data.vehicles.find(v => v.id === data.activeSession?.vehicleId)
        : null;

    // Live Avg Speed (km/h)
    const liveAvgSpeed = currentDuration > 0 ? (currentDistance / (currentDuration / 3600000)) : 0;

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
                // Speed m/s -> km/h
                const speedKmh = (location.coords.speed || 0) * 3.6;
                setCurrentSpeed(speedKmh > 0 ? speedKmh : 0);
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

        // Use new startWorkSession
        const success = startWorkSession(selectedVehicleId || data.vehicles[0]?.id);
        if (!success) {
            showAlert('Erro', 'Já existe uma sessão ativa.');
        }
    };

    const handleStopTracking = () => {
        if (!data.activeSession) return;

        const distance = currentDistance.toFixed(2);
        const duration = formatDuration(currentDuration);

        Alert.alert(
            'Finalizar Sessão',
            `Deseja finalizar a sessão de trabalho?\n\nDistância: ${distance} km\nTempo: ${duration}`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Finalizar',
                    style: 'destructive',
                    onPress: () => {
                        // Use new finishWorkSession
                        const session = finishWorkSession();
                        if (session) {
                            // Navigate to Summary
                            router.replace({ pathname: '/session/summary', params: { sessionId: session.id } });
                        } else {
                            showAlert('Erro', 'Falha ao finalizar sessão.');
                        }
                    }
                }
            ]
        );
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

    const handleDeleteSession = (currItem: any) => {
        Alert.alert(
            'Excluir Percurso',
            'Tem certeza que deseja excluir este percurso? Os ganhos e KMs associados ao veículo podem não ser revertidos automaticamente.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: () => deleteTrackerSession(currItem.id)
                }
            ]
        );
    };

    const renderSessionItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => router.push({ pathname: '/session/summary', params: { sessionId: item.id } })}
            onLongPress={() => handleDeleteSession(item)}
            activeOpacity={0.7}
        >
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
        </TouchableOpacity>
    );

    const isTracking = data.activeSession?.status === 'active';
    const isPaused = data.activeSession?.status === 'paused';
    const recentSessions = getTrackerSessions().slice(0, 5);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Sessão de Trabalho',
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
                            {/* Session Header Info - PRD Item 5 */}
                            <View style={styles.sessionHeaderInfo}>
                                <View>
                                    <Text style={styles.headerDateLabel}>{new Date().toLocaleDateString('pt-BR')}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <View style={[styles.statusDot, { backgroundColor: isPaused ? '#F59E0B' : '#10B981' }]} />
                                        <Text style={styles.headerStatusLabel}>{isPaused ? 'Pausada' : 'Ativa'}</Text>
                                    </View>
                                </View>
                                {isPaused && (
                                    <View style={styles.pausedBadge}>
                                        <Text style={styles.pausedText}>PAUSADO</Text>
                                    </View>
                                )}
                            </View>

                            {/* Main Cards Grid - PRD Item 5 */}
                            <View style={styles.cardsContainer}>

                                {/* Card 1: Time */}
                                <View style={styles.infoCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <MaterialIcons name="access-time" size={16} color="#9CA3AF" />
                                        <Text style={styles.cardLabel}>Tempo</Text>
                                    </View>
                                    <Text style={styles.cardMainValue}>{formatDuration(currentDuration).substring(0, 5)}</Text>
                                    <Text style={styles.cardSubValue}>{formatDuration(currentDuration).substring(6)}s</Text>
                                </View>

                                {/* Card 2: Distance */}
                                <View style={styles.infoCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <MaterialIcons name="place" size={16} color="#9CA3AF" />
                                        <Text style={styles.cardLabel}>Distância</Text>
                                    </View>
                                    <Text style={[styles.cardMainValue, { color: '#00A85A' }]}>{currentDistance.toFixed(1)}</Text>
                                    <Text style={styles.cardSubValue}>km</Text>
                                    <View style={styles.gpsIndicator}>
                                        <MaterialIcons name="gps-fixed" size={12} color={getGPSStatusColor()} />
                                        <Text style={[styles.gpsText, { color: getGPSStatusColor() }]}>GPS</Text>
                                    </View>
                                </View>

                                {/* Card 3: Vehicle */}
                                <View style={styles.infoCard}>
                                    <View style={styles.cardHeaderRow}>
                                        <FontAwesome5 name={activeVehicle?.type === 'moto' ? 'motorcycle' : 'car'} size={14} color="#9CA3AF" />
                                        <Text style={styles.cardLabel}>Veículo</Text>
                                    </View>
                                    <Text style={styles.vehicleName} numberOfLines={1}>{activeVehicle?.model || 'Veículo'}</Text>
                                    <Text style={styles.vehicleKm}>{(activeVehicle?.currentKm || 0).toLocaleString('pt-BR')} km</Text>
                                </View>

                                {/* Card 4: Earnings (Full Width) */}
                                <TouchableOpacity
                                    style={[styles.infoCard, styles.earningsCard]}
                                    onPress={() => setEarningsModalVisible(true)}
                                >
                                    <View style={styles.cardHeaderRow}>
                                        <MaterialIcons name="attach-money" size={18} color="#34D399" />
                                        <Text style={[styles.cardLabel, { color: '#34D399' }]}>Ganhos da Sessão</Text>
                                    </View>
                                    <Text style={styles.earningsValue}>
                                        {totalSessionEarnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </Text>

                                    {/* Mini List of Apps */}
                                    <View style={styles.miniAppList}>
                                        {sessionEarnings.slice(0, 3).map((r, i) => (
                                            <View key={i} style={styles.miniAppItem}>
                                                <Text style={styles.miniAppName}>{r.appName}</Text>
                                                <Text style={styles.miniAppValue}>R$ {r.grossEarnings.toFixed(0)}</Text>
                                            </View>
                                        ))}
                                        {sessionEarnings.length === 0 && (
                                            <Text style={styles.noEarningsText}>Toque para adicionar</Text>
                                        )}
                                    </View>

                                    <View style={styles.addEarningButton}>
                                        <MaterialIcons name="add-circle" size={24} color="#34D399" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Speed floating or somewhere else? PRD didn't emphasize speed as a main card, but useful. Keeping it subtle. */}
                            <View style={styles.speedContainer}>
                                <Text style={styles.speedLabel}>Vel. Atual</Text>
                                <Text style={styles.speedText}>{currentSpeed.toFixed(0)} km/h</Text>
                            </View>

                            {/* Control Buttons */}
                            <View style={styles.controlButtons}>
                                {isTracking ? (
                                    <TouchableOpacity style={styles.pauseButton} onPress={pauseKMTracking}>
                                        <MaterialIcons name="pause" size={28} color="#FFF" />
                                        <Text style={styles.buttonText}>Pausar</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.resumeButton} onPress={resumeKMTracking}>
                                        <MaterialIcons name="play-arrow" size={28} color="#FFF" />
                                        <Text style={styles.buttonText}>Continuar</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity style={styles.stopButton} onPress={handleStopTracking}>
                                    <MaterialIcons name="stop" size={28} color="#FFF" />
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

                            <TouchableOpacity
                                style={styles.retroactiveButton}
                                onPress={() => router.push('/session/retroactive')}
                            >
                                <MaterialIcons name="history" size={20} color="#9CA3AF" />
                                <Text style={styles.retroactiveButtonText}>Lançar Sessão Retroativa</Text>
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

            <EarningsModal
                visible={earningsModalVisible}
                onClose={() => setEarningsModalVisible(false)}
                onSave={(record) => {
                    if (data.activeSession) {
                        const app = data.faturamentoApps.find(a => a.id === record.appId);
                        addEarningsRecord({
                            ...record,
                            sessionId: data.activeSession.id,
                            vehicleId: activeVehicle?.id,
                            appName: app?.name || 'App Desconhecido'
                        });
                        setEarningsModalVisible(false);
                    }
                }}
                sessionId={data.activeSession?.id}
                defaultVehicleId={activeVehicle?.id}
            />
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
    retroactiveButton: {
        marginTop: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    retroactiveButtonText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '600',
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

    // Updated Styles
    sessionHeaderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    headerDateLabel: {
        color: '#D1D5DB',
        fontSize: 14,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    headerStatusLabel: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    pausedBadge: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pausedText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Cards Grid
    cardsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    infoCard: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 16,
        width: '48%', // 2 cols
        minHeight: 110,
        justifyContent: 'space-between',
    },
    earningsCard: {
        width: '100%', // Full width
        backgroundColor: '#064E3B', // Dark Green bg
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: '#059669',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    cardLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    cardMainValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
    },
    cardSubValue: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: -4,
    },
    gpsIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    gpsText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    vehicleName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    vehicleKm: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    // Earnings Card specific
    earningsValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#34D399',
        width: '100%',
        marginBottom: 12,
    },
    miniAppList: {
        flex: 1,
        gap: 4,
    },
    miniAppItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 140,
    },
    miniAppName: {
        color: '#A7F3D0',
        fontSize: 12,
    },
    miniAppValue: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    noEarningsText: {
        color: '#6EE7B7',
        fontSize: 12,
        fontStyle: 'italic',
    },
    addEarningButton: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },

    // Speed (Footer ish)
    speedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
        opacity: 0.6,
    },
    speedLabel: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    speedText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
