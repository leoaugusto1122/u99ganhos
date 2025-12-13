import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Alert,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { useRouter } from 'expo-router';

export default function TrackerFAB() {
    const router = useRouter();
    const {
        data,
        startKMTracking,
        stopKMTracking,
        pauseKMTracking,
        resumeKMTracking,
        getCurrentSessionDistance,
        getCurrentSessionDuration,
    } = useFinance();

    const [currentDistance, setCurrentDistance] = useState(0);
    const [currentDuration, setCurrentDuration] = useState(0);
    const [expanded, setExpanded] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [expandAnim] = useState(new Animated.Value(0));

    const isTracking = data.activeSession?.status === 'active';
    const isPaused = data.activeSession?.status === 'paused';
    const hasActiveSession = isTracking || isPaused;

    // Update distance and duration
    useEffect(() => {
        if (isTracking) {
            const interval = setInterval(() => {
                setCurrentDistance(getCurrentSessionDistance());
                setCurrentDuration(getCurrentSessionDuration());
            }, 1000);

            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            return () => clearInterval(interval);
        }
    }, [isTracking, getCurrentSessionDistance, getCurrentSessionDuration]);

    // Expand animation
    useEffect(() => {
        Animated.spring(expandAnim, {
            toValue: expanded ? 1 : 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, [expanded]);

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);

        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

    const handleStart = () => {
        // Validation: Must have active vehicle
        const activeVehicle = data.vehicles.find(v => v.active);
        if (!activeVehicle) {
            showAlert(
                'Veículo Obrigatório',
                'Para iniciar o rastreamento, é necessário ter um veículo ativo cadastrado.',
                () => router.push('/veiculos')
            );
            return;
        }

        const success = startKMTracking(activeVehicle.id);
        if (success) {
            setExpanded(false);
        } else {
            showAlert('Erro', 'Já existe uma sessão ativa.');
        }
    };

    const handleStop = () => {
        const distance = currentDistance.toFixed(2);
        const duration = formatDuration(currentDuration);

        if (Platform.OS === 'web') {
            const createRecord = confirm(
                `Percurso Finalizado\n\nDistância: ${distance} km\nTempo: ${duration}\n\nDeseja criar lançamento de ganho?`
            );

            stopKMTracking(true);

            if (createRecord && (global as any).openEarningsWithKm) {
                (global as any).openEarningsWithKm(parseFloat(distance));
            }
        } else {
            Alert.alert(
                'Percurso Finalizado',
                `Distância: ${distance} km\nTempo: ${duration}\n\nO que deseja fazer?`,
                [
                    {
                        text: 'Descartar',
                        style: 'cancel',
                        onPress: () => stopKMTracking(false)
                    },
                    {
                        text: 'Salvar no Veículo',
                        onPress: () => stopKMTracking(true)
                    },
                    {
                        text: 'Salvar + Lançamento',
                        onPress: () => {
                            stopKMTracking(true);
                            if ((global as any).openEarningsWithKm) {
                                (global as any).openEarningsWithKm(parseFloat(distance));
                            }
                        }
                    }
                ]
            );
        }
        setExpanded(false);
    };

    const toggleExpanded = () => {
        setExpanded(!expanded);
    };

    // Don't render if no vehicles
    if (data.vehicles.length === 0) return null;

    if (!hasActiveSession) {
        // Start Button (No active session)
        return (
            <TouchableOpacity
                style={styles.fab}
                onPress={handleStart}
                activeOpacity={0.8}
            >
                <MaterialIcons name="my-location" size={28} color="#FFF" />
            </TouchableOpacity>
        );
    }

    // Active/Paused State with Controls
    return (
        <View style={styles.fabContainer}>
            {/* Expanded Controls */}
            {expanded && (
                <Animated.View
                    style={[
                        styles.expandedControls,
                        {
                            opacity: expandAnim,
                            transform: [{
                                translateY: expandAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                })
                            }],
                        }
                    ]}
                >
                    {isTracking && (
                        <TouchableOpacity
                            style={[styles.controlButton, styles.pauseButton]}
                            onPress={() => { pauseKMTracking(); setExpanded(false); }}
                        >
                            <MaterialIcons name="pause" size={20} color="#FFF" />
                            <Text style={styles.controlButtonText}>Pausar</Text>
                        </TouchableOpacity>
                    )}

                    {isPaused && (
                        <TouchableOpacity
                            style={[styles.controlButton, styles.resumeButton]}
                            onPress={() => { resumeKMTracking(); setExpanded(false); }}
                        >
                            <MaterialIcons name="play-arrow" size={20} color="#FFF" />
                            <Text style={styles.controlButtonText}>Retomar</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.controlButton, styles.stopButton]}
                        onPress={handleStop}
                    >
                        <MaterialIcons name="stop" size={20} color="#FFF" />
                        <Text style={styles.controlButtonText}>Encerrar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, styles.detailsButton]}
                        onPress={() => { router.push('/tracker'); setExpanded(false); }}
                    >
                        <MaterialIcons name="analytics" size={20} color="#FFF" />
                        <Text style={styles.controlButtonText}>Detalhes</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Main FAB */}
            <TouchableOpacity
                style={[
                    styles.fab,
                    isTracking && styles.fabActive,
                    isPaused && styles.fabPaused
                ]}
                onPress={toggleExpanded}
                activeOpacity={0.8}
            >
                <Animated.View style={{ transform: [{ scale: isTracking ? pulseAnim : 1 }] }}>
                    <MaterialIcons
                        name={isPaused ? 'pause-circle-filled' : 'gps-fixed'}
                        size={28}
                        color="#FFF"
                    />
                </Animated.View>

                <View style={styles.fabStats}>
                    <Text style={styles.fabDistance}>{currentDistance.toFixed(1)}</Text>
                    <Text style={styles.fabTime}>{formatDuration(currentDuration)}</Text>
                </View>

                {/* Expand Indicator */}
                <View style={styles.expandIndicator}>
                    <MaterialIcons
                        name={expanded ? 'expand-more' : 'expand-less'}
                        size={16}
                        color="#FFF"
                    />
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        right: 16,
        bottom: 80,
        alignItems: 'flex-end',
        zIndex: 1000,
    },

    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#00A85A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabActive: {
        backgroundColor: '#00A85A',
        width: 120,
        borderRadius: 32,
        paddingHorizontal: 12,
    },
    fabPaused: {
        backgroundColor: '#F59E0B',
    },

    fabStats: {
        position: 'absolute',
        left: 48,
        alignItems: 'flex-start',
    },
    fabDistance: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    fabTime: {
        fontSize: 10,
        color: '#FFF',
        opacity: 0.9,
    },

    expandIndicator: {
        position: 'absolute',
        top: 4,
        right: 4,
    },

    // Expanded Controls
    expandedControls: {
        marginBottom: 12,
        gap: 8,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        gap: 8,
        minWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    controlButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    pauseButton: {
        backgroundColor: '#F59E0B',
    },
    resumeButton: {
        backgroundColor: '#3B82F6',
    },
    stopButton: {
        backgroundColor: '#EF4444',
    },
    detailsButton: {
        backgroundColor: '#6B7280',
    },
});
