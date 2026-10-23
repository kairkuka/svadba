import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Role } from '../types';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type PushRegistrationResult = {
  enabled: boolean;
  token?: string;
  message: string;
};

export type NotificationTarget =
  | { screen: 'requests'; role: Role }
  | { screen: 'lead'; role: Role; leadId: string }
  | { screen: 'chat'; role: Role; leadId: string };

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return {
      enabled: false,
      message: 'Push-уведомления доступны в приложении на iOS и Android.',
    };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Основные уведомления',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D8675E',
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  let permissionStatus = currentPermission.status;

  if (permissionStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermission.status;
  }

  if (permissionStatus !== 'granted') {
    return {
      enabled: false,
      message: 'Разрешение не получено. Его можно включить в настройках телефона.',
    };
  }

  if (Constants.appOwnership === 'expo') {
    return {
      enabled: true,
      message: 'Уведомления на устройстве включены.',
    };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    return {
      enabled: true,
      message: 'Уведомления на устройстве включены.',
    };
  }

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    return {
      enabled: true,
      token,
      message: 'Вы будете получать ответы и изменения по заявкам.',
    };
  } catch {
    return {
      enabled: true,
      message: 'Уведомления на устройстве включены.',
    };
  }
}

export function subscribeToNotificationTargets(
  listener: (target: NotificationTarget) => void,
) {
  if (Platform.OS === 'web') {
    return { remove: () => undefined };
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    const target = parseNotificationTarget(response);

    if (target) {
      listener(target);
      void Notifications.clearLastNotificationResponseAsync();
    }
  });
}

export async function getInitialNotificationTarget() {
  if (Platform.OS === 'web') {
    return null;
  }

  const response = await Notifications.getLastNotificationResponseAsync();

  if (!response) {
    return null;
  }

  const target = parseNotificationTarget(response);
  await Notifications.clearLastNotificationResponseAsync();
  return target;
}

export async function sendTestNotification(role: Role) {
  if (Platform.OS === 'web') {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Svadba',
      body: 'Уведомления работают. Здесь появятся ответы по вашим заявкам.',
      data: { screen: 'requests', role },
      sound: true,
    },
    trigger: null,
  });
}

function parseNotificationTarget(
  response: Notifications.NotificationResponse,
): NotificationTarget | null {
  const data = response.notification.request.content.data ?? {};
  const role = data.role;
  const screen = data.screen;

  if (role !== 'client' && role !== 'vendor') {
    return null;
  }

  if (screen === 'requests') {
    return { screen, role };
  }

  if (
    (screen === 'lead' || screen === 'chat') &&
    typeof data.leadId === 'string' &&
    data.leadId.length > 0
  ) {
    return { screen, role, leadId: data.leadId };
  }

  return null;
}
