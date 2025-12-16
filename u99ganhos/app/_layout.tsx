import { Stack, SplashScreen } from 'expo-router';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { useFonts } from 'expo-font';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    ...MaterialIcons.font,
  });

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <FinanceProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="configuracoes" options={{ headerShown: true, headerTitle: 'Configurações' }} />
        <Stack.Screen name="manutencoes" options={{
          headerShown: true,
          headerTitle: 'Manutenções',
          headerStyle: { backgroundColor: '#1F2937' },
          headerTintColor: '#FFFFFF'
        }} />
      </Stack>
    </FinanceProvider>
  );
}