import { Text, View } from 'react-native';

import { Badge } from '../../components/Badge';
import { DataState } from '../../components/DataState';
import { LeadCard } from '../../components/LeadCard';
import { MetricCard } from '../../components/MetricCard';
import { Section } from '../../components/Section';
import { styles } from '../../theme/styles';
import type { Lead } from '../../types';

export function VendorHomeScreen({
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
      <View style={styles.vendorHero}>
        <Text style={styles.eyebrow}>Кабинет подрядчика</Text>
        <Text style={styles.heroTitle}>Новые обращения: {leads.length}</Text>
        <Text style={styles.heroText}>
          Профиль опубликован, но портфолио можно усилить еще 6 работами.
        </Text>
      </View>
      <View style={styles.metricGrid}>
        <MetricCard label="Просмотры" value="184" tone="teal" />
        <MetricCard label="CTA" value="37" tone="coral" />
        <MetricCard label="Брони" value="4" tone="gold" />
      </View>
      <Section title="Новые заявки" action="Все" />
      <DataState isLoading={isLoading} error={error} onRetry={onRetry} />
      {leads.slice(0, 2).map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          role="vendor"
          onOpen={() => onOpenLead(lead)}
        />
      ))}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Статус профиля</Text>
        <Text style={styles.cardText}>
          Опубликовано · Проверка документов ожидает подтверждения.
        </Text>
        <View style={styles.statusRow}>
          <Badge label="Опубликовано" tone="green" />
          <Badge label="Верификация" tone="gold" />
        </View>
      </View>
    </View>
  );
}
