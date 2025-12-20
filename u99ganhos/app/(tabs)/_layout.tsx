import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, View, Alert, Platform } from 'react-native';
import CustomTabBar from '@/components/CustomTabBar';
import React, { useState } from 'react';
import EarningsModal from '@/components/EarningsModal';
import CostModal from '@/components/CostModal';
import { useFinance } from '@/hooks/useFinance';
import { CostType } from '@/services/types';

export default function TabLayout() {
  const router = useRouter();
  const [earningsModalVisible, setEarningsModalVisible] = useState(false);
  const [costModalVisible, setCostModalVisible] = useState(false);
  const [prefilledKm, setPrefilledKm] = useState<number | undefined>(undefined);

  const { addEarningsRecord, addCost, data, checkRequiredSettings } = useFinance();

  // Function to open earnings modal with prefilled KM
  const openEarningsWithKm = (km: number) => {
    setPrefilledKm(km);
    setEarningsModalVisible(true);
  };

  // Expose function globally for other components to call
  React.useEffect(() => {
    (global as any).openEarningsWithKm = openEarningsWithKm;
    return () => {
      delete (global as any).openEarningsWithKm;
    };
  }, []);

  const handleValidation = (action: () => void) => {
    const { canRegister, missingItems, missingTypes } = checkRequiredSettings();
    if (!canRegister) {
      // Determine where to redirect
      let route = '/configuracoes?section=horario';
      if (missingTypes.includes('vehicle')) {
        route = '/veiculos';
      }

      if (Platform.OS === 'web') {
        const shouldConfig = window.confirm(`Configuração Necessária\n\n${missingItems.join('\n')}\n\nDeseja configurar agora?`);
        if (shouldConfig) {
          router.push(route as any);
        }
      } else {
        Alert.alert(
          'Configuração Necessária',
          missingItems.join('\n'),
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurar', onPress: () => router.push(route as any) }
          ]
        );
      }
      return;
    }
    action();
  };

  const handleStartSession = () => {
    // Check for vehicles before starting
    if (data.vehicles.length === 0) {
      Alert.alert(
        'Veículo Obrigatório',
        'Cadastre um veículo para iniciar a sessão.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cadastrar', onPress: () => router.push('/veiculos') }
        ]
      );
      return;
    }
    router.push('/tracker');
  };

  const handleRetroactiveSession = () => {
    // Check for vehicles before starting
    if (data.vehicles.length === 0) {
      Alert.alert(
        'Veículo Obrigatório',
        'Cadastre um veículo para criar uma sessão.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cadastrar', onPress: () => router.push('/veiculos') }
        ]
      );
      return;
    }
    // Cast strict typed router to any to bypass route type checking if necessary or use proper relative path
    router.push('/session/retroactive' as any);
  };

  const handleOpenEarnings = () => {
    // ENFORCE: Earnings only if session active or paused
    // Actually, checking if session exists is enough for "earnings".
    // But the new requirement says: "Para registrar ganhos, inicie uma sessão de trabalho."

    // We double check here just in case, although FAB should handle visibility.
    // If FAB logic fails or user somehow triggers this:
    if (data.activeSession?.status !== 'active' && data.activeSession?.status !== 'paused') {
      Alert.alert(
        'Sessão Necessária',
        'Para registrar ganhos, é necessário iniciar uma Sessão de Trabalho.',
        [
          { text: 'OK' },
          { text: 'Iniciar Agora', onPress: () => router.push('/tracker') }
        ]
      );
      return;
    }

    setEarningsModalVisible(true);
  };

  const handleSaveEarnings = (record: any) => {
    // If we have an active session, ensure properties are linked
    if (data.activeSession) {
      addEarningsRecord({
        ...record,
        sessionId: data.activeSession.id,
        vehicleId: data.activeSession.vehicleId || data.vehicles.find(v => v.active)?.id
        // Note: vehicleId might come from record if Modal allowed selection, but for session we want to enforce it if possible
      });
    } else {
      // Fallback for non-session (shouldn't happen due to validation, but safe to keep)
      addEarningsRecord(record);
    }
    setPrefilledKm(undefined); // Clear after saving
  };

  const handleSaveCost = (
    categoryId: string,
    value: number,
    description: string | undefined,
    date: string,
    type: CostType,
    configOptions?: {
      vehicleId?: string;
      installments?: number;
      intervalKm?: number;
      intervalDays?: number;
    },
    liters?: number
  ) => {
    addCost(categoryId, value, description, date, type, configOptions, liters);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props: any) => (
          <CustomTabBar
            {...props}
            onPressGanhos={() => handleValidation(handleOpenEarnings)}
            onPressDespesas={() => handleValidation(() => setCostModalVisible(true))}
            onPressStartSession={handleStartSession}
            onPressRetroactive={handleRetroactiveSession}
          />
        )}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#111827',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Principal',
            headerTitle: 'U99GANHOS',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="historico"
          options={{
            title: 'Histórico',
            headerTitle: 'Histórico',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="history" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fab"
          options={{
            title: '',
            tabBarIcon: () => null,
          }}
        />

        <Tabs.Screen
          name="veiculos"
          options={{
            title: 'Veículos',
            headerTitle: 'Meus Veículos',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="directions-car" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="mais"
          options={{
            title: 'Mais',
            headerTitle: 'Mais',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="more-horiz" size={size} color={color} />
            ),
          }}
        />

      </Tabs>
      <EarningsModal
        visible={earningsModalVisible}
        onClose={() => { setEarningsModalVisible(false); setPrefilledKm(undefined); }}
        onSave={handleSaveEarnings}
        prefilledKm={prefilledKm}
        sessionId={data.activeSession?.id}
        defaultVehicleId={data.activeSession?.vehicleId || data.vehicles.find(v => v.active)?.id}
      />
      <CostModal
        visible={costModalVisible}
        onClose={() => setCostModalVisible(false)}
        onSave={handleSaveCost}
        categories={data.categories}
        vehicles={data.vehicles}
      />
    </View>
  );
}