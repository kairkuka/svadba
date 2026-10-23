import { Text, View } from 'react-native';

import { DataState } from '../../components/DataState';
import { EmptyState } from '../../components/EmptyState';
import { LeadCard } from '../../components/LeadCard';
import { styles } from '../../theme/styles';
import type { Lead } from '../../types';

export function VendorRequestsScreen({
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
        <Text style={styles.screenTitle}>Входящие заявки</Text>
        <Text style={styles.screenSubtitle}>
          Ответьте клиенту, подтвердите дату или измените статус.
        </Text>
      </View>
      <DataState isLoading={isLoading} error={error} onRetry={onRetry} />
      {leads.length === 0 ? (
        <EmptyState
          title="Новых заявок пока нет"
          text="Когда клиент отправит заявку, она появится в этом разделе."
        />
      ) : (
        leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            role="vendor"
            onOpen={() => onOpenLead(lead)}
          />
        ))
      )}
    </View>
  );
}
