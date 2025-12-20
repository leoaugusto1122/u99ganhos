import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface FloatingActionButtonProps {
  onPressGanhos: () => void;
  onPressDespesas: () => void;
  onPressStartSession: () => void;
  onPressRetroactive: () => void;
}

import { useFinance } from '@/hooks/useFinance';
import { useRouter } from 'expo-router';

export default function FloatingActionButton({ onPressGanhos, onPressDespesas, onPressStartSession, onPressRetroactive }: FloatingActionButtonProps) {
  const router = useRouter();
  const { data } = useFinance();
  const hasActiveSession = data.activeSession?.status === 'active' || data.activeSession?.status === 'paused';

  const [isOpen, setIsOpen] = useState(false);
  const animation = React.useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  const getSubButtonStyle = (direction: 'left' | 'right' | 'top') => ({
    transform: [
      { scale: animation },
      {
        translateX: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, direction === 'left' ? -100 : direction === 'right' ? 100 : 0],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, direction === 'top' ? -90 : -10],
        }),
      },
    ],
    opacity: animation,
  });

  const handlePressGanhos = () => {
    toggleMenu();
    onPressGanhos();
  };

  const handlePressDespesas = () => {
    toggleMenu();
    onPressDespesas();
  };

  const handlePressStartSession = () => {
    toggleMenu();
    onPressStartSession();
  };

  const handlePressRetroactive = () => {
    toggleMenu();
    onPressRetroactive();
  };

  return (
    <View style={styles.container}>
      {/* 
          Logic:
          - Always show "Custo" on the Left (or bottom/top depending on layout, here left side expansion).
          - If Session Active: Show "Ganho" on Right.
          - If No Session: Show "Iniciar Sessão" on Right.
      */}

      {/* Left Option: Custo (Always available) */}
      <Animated.View style={[styles.subButton, getSubButtonStyle('left')]}>
        <TouchableOpacity onPress={handlePressDespesas} style={styles.subButtonTouchable}>
          <Text style={styles.subButtonText} numberOfLines={1}>Custo</Text>
          <MaterialIcons name="remove-circle-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </Animated.View>

      {/* Right Option: Adaptive (Ganho or Iniciar Sessão) */}
      <Animated.View style={[styles.subButton, getSubButtonStyle('right')]}>
        {hasActiveSession ? (
          <TouchableOpacity onPress={handlePressGanhos} style={styles.subButtonTouchable}>
            <MaterialIcons name="add-circle-outline" size={20} color="#10B981" />
            <Text style={[styles.subButtonText, { marginLeft: 8, marginRight: 0 }]} numberOfLines={1}>Ganho</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handlePressStartSession} style={[styles.subButtonTouchable, styles.startSessionButton]}>
            <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
            <Text style={[styles.subButtonText, { marginLeft: 8, marginRight: 0 }]} numberOfLines={1}>Iniciar</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Retroactive Option (Only if No Session) */}
      {!hasActiveSession && (
        <Animated.View style={[styles.subButton, getSubButtonStyle('top')]}>
          <TouchableOpacity onPress={handlePressRetroactive} style={styles.subButtonTouchable}>
            <MaterialIcons name="history" size={20} color="#F59E0B" />
            <Text style={styles.subButtonText} numberOfLines={1}>Retroativo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity style={styles.button} onPress={toggleMenu}>
        <Animated.View style={rotation}>
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00A85A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subButton: {
    position: 'absolute',
    bottom: 8, // Align vertically with the main button
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1, // Ensure they start behind the main button
  },
  subButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 120, // Normalize size
    justifyContent: 'center',
    // Green Shadow
    shadowColor: '#00A85A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 90, 0.3)'
  },
  subButtonText: {
    color: '#FFFFFF',
    marginRight: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center', // Center text
  },
  startSessionButton: {
    backgroundColor: '#00A85A', // Distinct color for start action
    borderColor: '#059669',
  }
});
