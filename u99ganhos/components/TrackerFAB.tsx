import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Alert,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { useRouter } from 'expo-router';

export default function TrackerFAB() {
    const router = useRouter();
    const {
        data,
        startWorkSession,
        finishWorkSession,
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

        const success = startWorkSession(activeVehicle.id);
        if (success) {
            setExpanded(false);
        } else {
            showAlert('Erro', 'Já existe uma sessão ativa.');
        }
    };

    const handleStop = () => {
        const distance = parseFloat(currentDistance.toFixed(2));
        const duration = formatDuration(currentDuration);

        Alert.alert(
            'Finalizar Sessão',
            `Deseja finalizar a sessão de trabalho?\n\nDistância: ${distance.toFixed(2)} km\nTempo: ${duration}`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Finalizar',
                    style: 'destructive',
                    onPress: () => {
                        const session = finishWorkSession();
                        if (session) {
                            // Navigate to summary
                            Alert.alert('Sessão Finalizada', 'Resumo da sessão em breve.');
                        }
                    }
                }
            ]
        );
        setExpanded(false);
    };

    const handleAction = () => {
        if (!hasActiveSession) {
            handleStart();
            return;
        }

        // If tracking or paused, show options in simple Alert
        Alert.alert(
            'Controle de Rastreamento',
            isPaused ? 'Percurso Pausado' : 'Percurso em Andamento',
            [
                { text: 'Voltar', style: 'cancel' },
                isPaused
                    ? { text: 'Retomar', onPress: resumeKMTracking }
                    : { text: 'Pausar', onPress: pauseKMTracking },
                {
                    text: 'Encerrar',
                    style: 'destructive',
                    onPress: handleStop
                },
                { text: 'Ver Detalhes', onPress: () => router.push('/tracker') }
            ]
        );
    };

    // Don't render if no vehicles
    if (data.vehicles.length === 0) return null;

    return (
        <View style={styles.fabContainer}>
            {/* Stats Badge */}
            {hasActiveSession && (
                <View style={styles.fabStats}>
                    <Text style={styles.fabDistance}>{currentDistance.toFixed(2)} km</Text>
                    <Text style={styles.fabTime}>{formatDuration(currentDuration)}</Text>
                </View>
            )}

            {/* Main FAB */}
            <TouchableOpacity
                style={[
                    styles.fab,
                    isTracking && styles.fabRecording,
                    isPaused && styles.fabPaused
                ]}
                onPress={handleAction}
                activeOpacity={0.8}
            >
                {isTracking ? (
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <MaterialIcons name="stop" size={28} color="#FFF" />
                    </Animated.View>
                ) : (
                    <MaterialIcons
                        name={isPaused ? 'play-arrow' : 'gps-fixed'}
                        size={28}
                        color="#FFF"
                    />
                )}
            </TouchableOpacity>
        </View >
    );
}

const styles = StyleSheet.create({
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: 90, // Adjusted to avoid tab bar
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    fab: {
        width: 56, // Smaller, standard FAB size
        height: 56,
        borderRadius: 28,
        backgroundColor: '#00A85A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    fabRecording: {
        backgroundColor: '#EF4444',
    },
    fabPaused: {
        backgroundColor: '#F59E0B',
    },
    fabStats: {
        position: 'absolute',
        bottom: 64, // Floating above button
        backgroundColor: 'rgba(31, 41, 55, 0.9)', // Dark bg
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#374151'
    },
    fabDistance: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },
    fabTime: {
        fontSize: 10,
        color: '#9CA3AF',
        fontVariant: ['tabular-nums'],
    }
});
