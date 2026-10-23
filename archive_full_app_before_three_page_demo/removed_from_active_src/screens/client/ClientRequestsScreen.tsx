import { Text, View } from 'react-native';

import { DataState } from '../../components/DataState';
import { EmptyState } from '../../components/EmptyState';
import { LeadCard } from '../../components/LeadCard';
import { styles } from '../../theme/styles';
import type { Lead } from '../../types';

export function ClientRequestsScreen({
  leads,
  onOpenLead,
  isLoading,
  error,
  onRetry,
}: {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.screenStack}>
      <View>
        <Text style={styles.screenTitle}>Мои заявки</Text>
        <Text style={styles.screenSubtitle}>
          Статусы, ответы подрядчиков и переход в диалог.
        </Text>
      </View>
      <DataState isLoading={isLoading} error={error} onRetry={onRetry} />
      {leads.length === 0 ? (
        <EmptyState
          title="Заявок пока нет"
          text="Откройте карточку подрядчика и отправьте первую заявку."
        />
      ) : (
        leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            role="client"
            onOpen={() => onOpenLead(lead)}
          />
        ))
      )}
    </View>
  );
}
