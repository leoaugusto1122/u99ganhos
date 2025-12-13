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

  const handleSaveEarnings = (record: any) => {
    addEarningsRecord(record);
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
    }
  ) => {
    addCost(categoryId, value, description, date, type, configOptions);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props: any) => (
          <CustomTabBar
            {...props}
            onPressGanhos={() => handleValidation(() => setEarningsModalVisible(true))}
            onPressDespesas={() => handleValidation(() => setCostModalVisible(true))}
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