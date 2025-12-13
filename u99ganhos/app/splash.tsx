import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated';

export default function SplashScreen() {
  const router = useRouter();
  
  // Valores animados
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(30);
  const sloganOpacity = useSharedValue(0);
  const sloganTranslateY = useSharedValue(30);

  useEffect(() => {
    // Iniciar animações sequenciais
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Animação da Logo
    logoOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });
    
    logoTranslateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.quad),
    });

    // Animação do Slogan (com delay)
    sloganOpacity.value = withDelay(400, withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    }));
    
    sloganTranslateY.value = withDelay(400, withTiming(0, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    }));

    // Navegar após 3 segundos
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 3000);
  };

  const logoAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: logoOpacity.value,
      transform: [{ translateY: logoTranslateY.value }],
    };
  });

  const sloganAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: sloganOpacity.value,
      transform: [{ translateY: sloganTranslateY.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0D21" />
      
      {/* Fundo Gradiente */}
      <View style={styles.gradientBackground} />
      
      <View style={styles.content}>
        {/* Logo Animada */}
        <Animated.View style={logoAnimatedStyle}>
          <Text style={styles.logo}>U99GANHOS</Text>
        </Animated.View>

        {/* Slogan Animado */}
        <Animated.View style={sloganAnimatedStyle}>
          <Text style={styles.slogan}>
            Controle seus ganhos, alcance suas metas.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D21',
    position: 'relative',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0B0D21',
    // Simulação de gradiente com overlay
    opacity: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#00A85A',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 168, 90, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 24,
  },
  slogan: {
    fontSize: 18,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    opacity: 0.9,
    maxWidth: 300,
  },
});