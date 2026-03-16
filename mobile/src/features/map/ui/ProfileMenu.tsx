import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
import { LogOut } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { UserRole } from '@/domain/user-domain'
import { colors, radii, fontSize, spacing } from '@/shared/constants/theme'

interface ProfileMenuProps {
  fullName: string
  role: UserRole
  visible: boolean
  onClose: () => void
  onLogout: () => void
}

const roleLabels: Record<UserRole, string> = {
  driver: 'Водитель',
  employee: 'Сотрудник',
  admin: 'Администратор',
}

function ProfileMenuComponent({
  fullName,
  role,
  visible,
  onClose,
  onLogout,
}: ProfileMenuProps) {
  const insets = useSafeAreaInsets()

  if (!visible) return null

  return (
    <>
      {/* Невидимый оверлей для закрытия по тапу вне меню */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.menu, { top: insets.top + 56 }]}>
        <View style={styles.header}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.role}>{roleLabels[role]}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <LogOut size={14} color={colors.textDanger} />
          <Text style={styles.logoutText}>Выйти</Text>
        </TouchableOpacity>
      </View>
    </>
  )
}

export const ProfileMenu = memo(ProfileMenuComponent)

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  menu: {
    position: 'absolute',
    right: spacing['2xl'],
    width: 200,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    zIndex: 100,
  },
  header: {
    padding: spacing['2xl'],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.lg,
  },
  role: {
    color: colors.textDimmed,
    fontSize: fontSize.md,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing['2xl'],
  },
  logoutText: {
    color: colors.textDanger,
    fontSize: fontSize.lg,
  },
})
