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

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, type: 'fixed' | 'variable' | 'emergency') => boolean;
  initialName?: string;
  initialType?: 'fixed' | 'variable' | 'emergency';
  title: string;
}

const CATEGORY_TYPES = [
  { key: 'fixed', label: 'Custos Fixos', color: '#FF3B30', description: 'Mensais e regulares' },
  { key: 'variable', label: 'Custos Variáveis', color: '#FF9500', description: 'Diários e ocasionais' },
  { key: 'emergency', label: 'Emergência', color: '#DC143C', description: 'Imprevistos e reparos' }
] as const;

export default function CategoryModal({ 
  visible, 
  onClose, 
  onSave, 
  initialName = '', 
  initialType = 'fixed',
  title 
}: CategoryModalProps) {
  const [name, setName] = useState(initialName);
  const [selectedType, setSelectedType] = useState<'fixed' | 'variable' | 'emergency'>(initialType);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setSelectedType(initialType);
    }
  }, [visible, initialName, initialType]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message });
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert('Erro', 'Por favor, digite o nome da categoria');
      return;
    }

    const success = onSave(name.trim(), selectedType);
    if (success) {
      onClose();
    } else {
      showAlert('Erro', 'Esta categoria já existe neste tipo');
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>Nome da Categoria</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Digite o nome da categoria"
                placeholderTextColor="#9CA3AF"
                autoFocus
              />

              <Text style={[styles.label, { marginTop: 20 }]}>Tipo de Categoria</Text>
              <View style={styles.typeContainer}>
                {CATEGORY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeOption,
                      selectedType === type.key && styles.typeOptionSelected,
                      { borderColor: type.color }
                    ]}
                    onPress={() => setSelectedType(type.key)}
                  >
                    <View style={[styles.typeIndicator, { backgroundColor: type.color }]} />
                    <View style={styles.typeInfo}>
                      <Text style={[
                        styles.typeLabel,
                        selectedType === type.key && styles.typeLabelSelected
                      ]}>
                        {type.label}
                      </Text>
                      <Text style={styles.typeDescription}>{type.description}</Text>
                    </View>
                    {selectedType === type.key && (
                      <MaterialIcons name="check-circle" size={20} color={type.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
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
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
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
  },
  typeContainer: {
    gap: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#FAFAFA',
  },
  typeOptionSelected: {
    backgroundColor: '#F8F9FA',
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  typeLabelSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  typeDescription: {
    fontSize: 14,
    color: '#6B7280',
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