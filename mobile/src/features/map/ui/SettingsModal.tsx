import React, { memo, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { X } from 'lucide-react-native'
import { useSettingsStore } from '@/shared/stores/settings-store'
import { colors, radii, fontSize, spacing, shadow } from '@/shared/constants/theme'

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
}

function SettingsModalComponent({ visible, onClose }: SettingsModalProps) {
  const customApiUrl = useSettingsStore((s) => s.customApiUrl)
  const setCustomApiUrl = useSettingsStore((s) => s.setCustomApiUrl)
  const [input, setInput] = useState(customApiUrl)

  function handleShow() {
    setInput(customApiUrl)
  }

  function handleSave() {
    const trimmed = input.trim().replace(/\/$/, '')
    if (trimmed) setCustomApiUrl(trimmed)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Настройки</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Адрес сервера (API URL)</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="http://192.168.1.235:4000"
            placeholderTextColor={colors.textDimmed}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>Без завершающего слэша. Пример: http://1.2.3.4:4000</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
              <Text style={styles.btnCancelText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
              <Text style={styles.btnSaveText}>Сохранить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export const SettingsModal = memo(SettingsModalComponent)

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing['3xl'],
    ...shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontWeight: '600',
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
  },
  hint: {
    color: colors.textDimmed,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    marginBottom: spacing['3xl'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  btnCancelText: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
  },
  btnSave: {
    flex: 1,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accentPrimary,
  },
  btnSaveText: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
})
