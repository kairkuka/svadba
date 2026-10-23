import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors, styles } from '../theme/styles';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
};

export function ActionButton({
  label,
  onPress,
  disabled = false,
  icon,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <ButtonContent
        label={label}
        icon={icon}
        color={colors.surface}
        textStyle={styles.actionButtonText}
      />
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled = false,
  icon,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.ghostButton,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <ButtonContent
        label={label}
        icon={icon}
        color={colors.ink}
        textStyle={styles.ghostButtonText}
      />
    </Pressable>
  );
}

export function DangerButton({
  label,
  onPress,
  disabled = false,
  icon,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dangerButton,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      <ButtonContent
        label={label}
        icon={icon}
        color={colors.coral}
        textStyle={styles.dangerButtonText}
      />
    </Pressable>
  );
}

function ButtonContent({
  label,
  icon: Icon,
  color,
  textStyle,
}: {
  label: string;
  icon?: LucideIcon;
  color: string;
  textStyle: object;
}) {
  return (
    <View style={styles.buttonContent}>
      {Icon ? <Icon color={color} size={17} strokeWidth={2.5} /> : null}
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}
