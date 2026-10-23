import { Check, X } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Badge } from '../../components/Badge';
import { ActionButton, GhostButton } from '../../components/Buttons';
import { calendarDays } from '../../data/mock';
import { styles } from '../../theme/styles';

export function CalendarScreen() {
  return (
    <View style={styles.screenStack}>
      <View>
        <Text style={styles.screenTitle}>Календарь</Text>
        <Text style={styles.screenSubtitle}>
          Занятость и запросы брони без двойных подтверждений.
        </Text>
      </View>
      <View style={styles.calendarGrid}>
        {calendarDays.map((day) => (
          <View key={`${day.date}-${day.month}`} style={styles.calendarDay}>
            <Text style={styles.calendarDate}>{day.date}</Text>
            <Text style={styles.calendarLabel}>{day.month}</Text>
            <Badge
              label={day.status}
              tone={
                day.status === 'Свободно'
                  ? 'green'
                  : day.status === 'Ожидает'
                    ? 'gold'
                    : 'muted'
              }
            />
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Запрос на 24 августа</Text>
        <Text style={styles.cardText}>
          Алия · 120 гостей · бюджет 650 000 тг.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Подтвердить" icon={Check} />
          <GhostButton label="Отклонить" icon={X} />
        </View>
      </View>
    </View>
  );
}
