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
}

export default function FloatingActionButton({ onPressGanhos, onPressDespesas }: FloatingActionButtonProps) {
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

  const getSubButtonStyle = (direction: 'left' | 'right') => ({
    transform: [
      { scale: animation },
      {
        translateX: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, direction === 'left' ? -80 : 80],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10], // Slight lift to match center
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

  return (
    <View style={styles.container}>
      {/* Custo Mensal - Left */}
      <Animated.View style={[styles.subButton, getSubButtonStyle('left')]}>
        <TouchableOpacity onPress={handlePressDespesas} style={styles.subButtonTouchable}>
          <Text style={styles.subButtonText}>Custo</Text>
          <MaterialIcons name="arrow-downward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Ganho - Right */}
      <Animated.View style={[styles.subButton, getSubButtonStyle('right')]}>
        <TouchableOpacity onPress={handlePressGanhos} style={styles.subButtonTouchable}>
          <MaterialIcons name="arrow-upward" size={24} color="#FFFFFF" />
          <Text style={[styles.subButtonText, { marginLeft: 8, marginRight: 0 }]}>Ganho</Text>
        </TouchableOpacity>
      </Animated.View>

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
  },
});
