import { LogOut } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

import { colors, styles } from '../theme/styles';
import type { Role } from '../types';

const brandLogo = require('../../assets/temp-logo.png');

export function Header({
  role,
  city,
  name,
  onRoleChange,
  onLogout,
}: {
  role: Role;
  city: string;
  name: string;
  onRoleChange: (role: Role) => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerIdentity}>
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Логотип"
          source={brandLogo}
          style={styles.logoImage}
        />
        <Text style={styles.headerMeta}>
          {city} · {name}
        </Text>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.roleSwitch}>
          <SegmentButton
            label="Клиент"
            active={role === 'client'}
            onPress={() => onRoleChange('client')}
          />
          <SegmentButton
            label="Подрядчик"
            active={role === 'vendor'}
            onPress={() => onRoleChange('vendor')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Выйти из аккаунта"
          onPress={onLogout}
          style={({ pressed }) => [styles.headerLogout, pressed && styles.pressed]}
        >
          <LogOut color={colors.coral} size={14} strokeWidth={2.5} />
          <Text style={styles.headerLogoutText}>Выйти</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        active && styles.segmentButtonActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.segmentButtonText,
          active && styles.segmentButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
