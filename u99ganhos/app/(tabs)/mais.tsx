import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useFinance } from '@/hooks/useFinance';

export default function MaisScreen() {
  const router = useRouter();
  const { backupData, restoreData, resetApp } = useFinance();

  const handleReset = () => {
    Alert.alert(
      '⚠️ Começar do Zero',
      'Tem certeza absoluta? Isso apagará TODOS os dados, veículos, histórico e configurações. Essa ação não pode ser desfeita!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar Tudo',
          style: 'destructive',
          onPress: async () => {
            const success = await resetApp();
            if (success) {
              Alert.alert('Sucesso', 'O aplicativo foi reiniciado.');
            } else {
              Alert.alert('Erro', 'Não foi possível reiniciar o app.');
            }
          }
        }
      ]
    );
  };

  type MenuItem = {
    label: string;
    icon: string;
    route?: string;
    action?: () => void | Promise<any>;
    danger?: boolean;
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Funcionalidades',
      items: [
        { label: 'Veículos', icon: 'directions-car', route: '/veiculos' },
        { label: 'Manutenções', icon: 'build', route: '/manutencoes' },
        { label: 'Rastreador GPS', icon: 'my-location', route: '/tracker' },
        { label: 'Relatórios', icon: 'assessment', route: '/relatorios' },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { label: 'Horário de Trabalho', icon: 'access-time', route: '/configuracoes?section=horario' },
        { label: 'Apps de Ganhos', icon: 'apps', route: '/configuracoes?section=apps' },
        { label: 'Categorias de Custos', icon: 'category', route: '/configuracoes?section=categoria' },
        { label: 'Custos Recorrentes', icon: 'attach-money', route: '/configuracoes?section=custos' },
      ]
    },
    {
      title: 'Gestão de Dados',
      items: [
        { label: 'Fazer Backup', icon: 'cloud-upload', action: backupData },
        { label: 'Restaurar Backup', icon: 'cloud-download', action: restoreData },
        { label: 'Começar do Zero', icon: 'delete-forever', action: handleReset, danger: true },
      ]
    }
  ];

  const handlePress = (item: any) => {
    if (item.action) {
      item.action();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {menuSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => handlePress(item)}
            >
              <MaterialIcons
                name={item.icon as any}
                size={24}
                color={item.danger ? '#EF4444' : '#111827'}
              />
              <Text style={[
                styles.menuItemText,
                item.danger && styles.dangerText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 16,
  },
  dangerText: {
    color: '#EF4444',
  }
});
