import { ArrowRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors, styles } from '../theme/styles';

export function Section({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} style={styles.sectionAction}>
          <Text style={styles.linkText}>{action}</Text>
          <ArrowRight color={colors.teal} size={15} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );
}
