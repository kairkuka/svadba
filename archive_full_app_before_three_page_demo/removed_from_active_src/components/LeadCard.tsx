import { Pressable, Text, View } from 'react-native';

import { Badge } from './Badge';
import { styles } from '../theme/styles';
import type { Lead, Role } from '../types';

export function LeadCard({
  lead,
  role,
  onOpen,
}: {
  lead: Lead;
  role: Role;
  onOpen?: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.leadCard, pressed && styles.pressed]}
    >
      <View style={styles.leadCardHeader}>
        <Text style={styles.cardTitle}>{lead.title}</Text>
        <Badge
          label={lead.status}
          tone={lead.status === 'Новая' ? 'coral' : 'gold'}
        />
      </View>
      <Text style={styles.cardText}>
        {role === 'client' ? lead.vendor : lead.client} · {lead.date} ·{' '}
        {lead.guests} гостей
      </Text>
      <Text style={styles.cardText}>Бюджет: {lead.budget}</Text>
      <View style={styles.leadFooter}>
        <Text style={styles.mutedSmall}>{lead.lastUpdate}</Text>
        <Text style={styles.linkText}>Открыть</Text>
      </View>
    </Pressable>
  );
}
