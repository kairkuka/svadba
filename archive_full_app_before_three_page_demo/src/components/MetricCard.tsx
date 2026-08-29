import { Text, View } from 'react-native';

import { styles } from '../theme/styles';
import type { MetricTone } from '../types';

export function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: MetricTone;
}) {
  const accentStyle =
    tone === 'teal'
      ? styles.tealAccent
      : tone === 'coral'
        ? styles.coralAccent
        : styles.goldAccent;

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, accentStyle]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

