import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ProfitConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (profitPercentage: number) => void;
  currentPercentage: number;
}

export default function ProfitConfigModal({ 
  visible, 
  onClose, 
  onSave, 
  currentPercentage 
}: ProfitConfigModalProps) {
  const [percentage, setPercentage] = useState(currentPercentage.toString());
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  useEffect(() => {
    if (visible) {
      setPercentage(currentPercentage.toString());
    }
  }, [visible, currentPercentage]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message });
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = () => {
    const numericPercentage = parseFloat(percentage);
    
    if (isNaN(numericPercentage) || numericPercentage < 0) {
      showAlert('Erro', 'Por favor, digite uma porcentagem válida (maior ou igual a 0)');
      return;
    }

    // Aviso apenas informativo para valores muito altos
    if (numericPercentage > 200) {
      showAlert('Aviso', 'Porcentagem muito alta. Certifique-se de que este valor está correto.');
      // Continua e salva mesmo assim
    }

    onSave(numericPercentage);
    onClose();
  };

  const handleClose = () => {
    setPercentage(currentPercentage.toString());
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Configurações — Porcentagem de Lucro Desejada</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.description}>
                Defina a porcentagem que será aplicada sobre o custo diário para compor a meta.
                Você pode inserir qualquer valor de acordo com seus objetivos.
              </Text>

              <Text style={styles.label}>Porcentagem (%)</Text>
              <TextInput
                style={styles.input}
                value={percentage}
                onChangeText={setPercentage}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                autoFocus
              />

              <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>Exemplos:</Text>
                <Text style={styles.exampleText}>
                  • 20% de lucro: Custo R$ 100 = Meta R$ 120
                </Text>
                <Text style={styles.exampleText}>
                  • 50% de lucro: Custo R$ 100 = Meta R$ 150
                </Text>
                <Text style={styles.exampleText}>
                  • 150% de lucro: Custo R$ 100 = Meta R$ 250
                </Text>
                <Text style={styles.exampleNote}>
                  💡 Não há limite - defina o lucro ideal para você!
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === 'web' && (
        <Modal visible={alertConfig.visible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertModal}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <TouchableOpacity 
                style={styles.alertButton}
                onPress={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 450,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  exampleContainer: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00A85A',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
    marginBottom: 4,
  },
  exampleNote: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#00A85A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Alert styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModal: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    minWidth: 280,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  alertButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  alertButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});