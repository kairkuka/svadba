import type { LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors, styles } from '../theme/styles';

export function ToolCard({
  title,
  text,
  icon: Icon,
}: {
  title: string;
  text: string;
  icon: LucideIcon;
}) {
  return (
    <View style={styles.toolCard}>
      <View style={styles.toolIcon}>
        <Icon color={colors.teal} size={21} strokeWidth={2.4} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}
