import { Bell, BellRing } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { registerPushToken } from '../api/notifications';
import {
  registerForPushNotifications,
  sendTestNotification,
} from '../notifications/pushNotifications';
import { styles } from '../theme/styles';
import type { Role } from '../types';
import { ActionButton, GhostButton } from './Buttons';

type NotificationStatus = 'idle' | 'loading' | 'enabled' | 'denied' | 'error';

export function NotificationSettings({
  accessToken,
  role,
}: {
  accessToken?: string;
  role: Role;
}) {
  const [status, setStatus] = useState<NotificationStatus>('idle');
  const [message, setMessage] = useState(
    'Получайте ответы подрядчиков и изменения статусов заявок.',
  );

  const enableNotifications = async () => {
    setStatus('loading');

    try {
      const result = await registerForPushNotifications();

      if (!result.enabled) {
        setStatus('denied');
        setMessage(result.message);
        return;
      }

      if (result.token) {
        await registerPushToken(result.token, accessToken);
      }

      setStatus('enabled');
      setMessage(result.message);
    } catch {
      setStatus('error');
      setMessage('Не удалось включить уведомления. Попробуйте ещё раз.');
    }
  };

  const testNotification = async () => {
    try {
      await sendTestNotification(role);
      setMessage('Тестовое уведомление отправлено.');
    } catch {
      setStatus('error');
      setMessage('Не удалось отправить тестовое уведомление.');
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Уведомления</Text>
      <Text
        style={
          status === 'denied' || status === 'error'
            ? styles.errorText
            : styles.cardText
        }
      >
        {message}
      </Text>
      {status === 'enabled' ? (
        <GhostButton
          label="Проверить уведомление"
          icon={BellRing}
          onPress={testNotification}
        />
      ) : (
        <ActionButton
          label={status === 'loading' ? 'Включаем...' : 'Включить уведомления'}
          disabled={status === 'loading'}
          icon={Bell}
          onPress={enableNotifications}
        />
      )}
    </View>
  );
}
