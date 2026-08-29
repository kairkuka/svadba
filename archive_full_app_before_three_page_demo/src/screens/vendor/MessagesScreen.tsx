import { Text, View } from 'react-native';

import { Badge } from '../../components/Badge';
import { styles } from '../../theme/styles';

export function MessagesScreen() {
  return (
    <View style={styles.screenStack}>
      <View>
        <Text style={styles.screenTitle}>Сообщения</Text>
        <Text style={styles.screenSubtitle}>
          Диалоги привязаны к заявкам и карточкам.
        </Text>
      </View>
      <View style={styles.messageCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>А</Text>
        </View>
        <View style={styles.messageBody}>
          <Text style={styles.cardTitle}>Алия</Text>
          <Text style={styles.cardText}>
            Добрый день, свободна ли дата 24 августа?
          </Text>
          <Text style={styles.mutedSmall}>Заявка: оформление банкетного зала</Text>
        </View>
        <Badge label="Новое" tone="coral" />
      </View>
      <View style={styles.chatPreview}>
        <Text style={styles.chatBubbleInbound}>Здравствуйте! Дата пока свободна.</Text>
        <Text style={styles.chatBubbleOutbound}>
          Могу прислать 2 пакета оформления под ваш зал.
        </Text>
      </View>
    </View>
  );
}

