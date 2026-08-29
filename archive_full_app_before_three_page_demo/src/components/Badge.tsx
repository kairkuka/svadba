import { Text, View } from 'react-native';

import { styles } from '../theme/styles';
import type { BadgeTone } from '../types';

export function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  const containerStyle =
    tone === 'teal'
      ? styles.tealBadge
      : tone === 'green'
        ? styles.greenBadge
        : tone === 'gold'
          ? styles.goldBadge
          : tone === 'coral'
            ? styles.coralBadge
            : styles.mutedBadge;

  const textStyle =
    tone === 'teal'
      ? styles.tealBadgeText
      : tone === 'green'
        ? styles.greenBadgeText
        : tone === 'gold'
          ? styles.goldBadgeText
          : tone === 'coral'
            ? styles.coralBadgeText
            : styles.mutedBadgeText;

  return (
    <View style={[styles.badge, containerStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

