import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';
import { useRouter } from 'expo-router';

export default function TrackerWidget() {
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
    const [pulseAnim] = useState(new Animated.Value(1));

    // Update distance and duration
    useEffect(() => {
        if (data.activeSession?.status === 'active') {
            const interval = setInterval(() => {
                setCurrentDistance(getCurrentSessionDistance());
                setCurrentDuration(getCurrentSessionDuration());
            }, 1000);

            // Pulse animation for active tracking
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
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
    }, [data.activeSession, getCurrentSessionDistance, getCurrentSessionDuration]);

    const formatDuration = (ms: number): string => {
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const handleQuickStart = () => {
        startKMTracking(data.vehicles[0]?.id);
    };

    const handleOpenFullTracker = () => {
        router.push('/tracker');
    };

    const isTracking = data.activeSession?.status === 'active';
    const isPaused = data.activeSession?.status === 'paused';

    // Don't render if no vehicles
    if (data.vehicles.length === 0) return null;

    return (
        <View style={styles.container}>
            {isTracking || isPaused ? (
                // Active/Paused State - Compact widge
                <TouchableOpacity
                    style={[styles.activeWidget, isPaused && styles.pausedWidget]}
                    onPress={handleOpenFullTracker}
                    activeOpacity={0.8}
                >
                    <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                        <MaterialIcons
                            name={isPaused ? 'pause-circle-filled' : 'gps-fixed'}
                            size={24}
                            color={isPaused ? '#F59E0B' : '#00A85A'}
                        />
                    </Animated.View>

                    <View style={styles.activeInfo}>
                        <Text style={styles.activeDistance}>{currentDistance.toFixed(2)} km</Text>
                        <Text style={styles.activeDuration}>{formatDuration(currentDuration)}</Text>
                    </View>

                    <View style={styles.activeControls}>
                        {isTracking ? (
                            <TouchableOpacity
                                style={styles.miniButton}
                                onPress={(e) => { e.stopPropagation(); pauseKMTracking(); }}
                            >
                                <MaterialIcons name="pause" size={16} color="#FFF" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.miniButton}
                                onPress={(e) => { e.stopPropagation(); resumeKMTracking(); }}
                            >
                                <MaterialIcons name="play-arrow" size={16} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            ) : (
                // Idle State - Quick Start Button
                <TouchableOpacity
                    style={styles.quickStartButton}
                    onPress={handleQuickStart}
                    activeOpacity={0.8}
                >
                    <MaterialIcons name="my-location" size={20} color="#FFF" />
                    <Text style={styles.quickStartText}>Iniciar Rastreamento</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },

    // Active/Paused Widget
    activeWidget: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1F2937',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#00A85A',
    },
    pausedWidget: {
        borderLeftColor: '#F59E0B',
    },

    iconContainer: {
        marginRight: 12,
    },

    activeInfo: {
        flex: 1,
    },
    activeDistance: {
        fontSize: 18,
        fontWeight: '700',
        color: '#00A85A',
    },
    activeDuration: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },

    activeControls: {
        flexDirection: 'row',
        gap: 8,
    },
    miniButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#374151',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Quick Start Button
    quickStartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00A85A',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    quickStartText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
