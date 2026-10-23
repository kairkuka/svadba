import { Text, View } from 'react-native';

import { NotificationSettings } from '../../components/NotificationSettings';
import { ListRow, ProfileHeader } from '../../components/ProfileHeader';
import { styles } from '../../theme/styles';

export function ClientProfileScreen({ accessToken }: { accessToken?: string }) {
  return (
    <View style={styles.screenStack}>
      <ProfileHeader title="Алия" subtitle="Клиент · Алматы" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>План свадьбы</Text>
        <Text style={styles.cardText}>
          Дата: 24 августа · 120 гостей · современный стиль.
        </Text>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.mutedSmall}>Чек-лист выполнен на 42%</Text>
      </View>
      <View style={styles.listCard}>
        <ListRow label="Сохраненные поиски" value="3" />
        <ListRow label="Расчеты бюджета" value="1" />
        <ListRow label="Отзывы" value="0" />
      </View>
      <NotificationSettings accessToken={accessToken} role="client" />
    </View>
  );
}
