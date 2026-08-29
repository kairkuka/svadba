import { ArrowLeft, Check, MessageCircle, X } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Badge } from '../components/Badge';
import { ActionButton, GhostButton } from '../components/Buttons';
import { styles } from '../theme/styles';
import type { Lead, Role } from '../types';

export function LeadDetailScreen({
  lead,
  role,
  onBack,
  onOpenChat,
  onConfirm,
  onDecline,
}: {
  lead: Lead;
  role: Role;
  onBack: () => void;
  onOpenChat: () => void;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const personLabel = role === 'client' ? 'Подрядчик' : 'Клиент';
  const personValue = role === 'client' ? lead.vendor : lead.client;

  return (
    <View style={styles.screenStack}>
      <GhostButton label="Назад к заявкам" icon={ArrowLeft} onPress={onBack} />

      <View style={styles.card}>
        <View style={styles.leadCardHeader}>
          <Text style={styles.screenTitle}>{lead.title}</Text>
          <Badge
            label={lead.status}
            tone={lead.status === 'Новая' ? 'coral' : 'gold'}
          />
        </View>
        <Text style={styles.cardText}>
          Детали заявки, статус и быстрый переход в переписку.
        </Text>
      </View>

      <View style={styles.listCard}>
        <DetailRow label={personLabel} value={personValue} />
        <DetailRow label="Дата" value={lead.date} />
        <DetailRow label="Гостей" value={String(lead.guests)} />
        <DetailRow label="Бюджет" value={lead.budget} />
        <DetailRow label="Обновлено" value={lead.lastUpdate} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Следующее действие</Text>
        <Text style={styles.cardText}>
          {role === 'client'
            ? 'Напишите подрядчику, уточните пакет и подтвердите дату.'
            : 'Ответьте клиенту, подтвердите возможность даты или отклоните заявку.'}
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            label="Открыть чат"
            icon={MessageCircle}
            onPress={onOpenChat}
          />
          {role === 'vendor' ? (
            <>
              <GhostButton label="Подтвердить" icon={Check} onPress={onConfirm} />
              <GhostButton label="Отклонить" icon={X} onPress={onDecline} />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listLabel}>{label}</Text>
      <Text style={styles.listValue}>{value}</Text>
    </View>
  );
}
