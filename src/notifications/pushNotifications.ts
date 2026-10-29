import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Role } from '../types';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type PushRegistrationResult = {
  enabled: boolean;
  message: string;
  token?: string;
};

export type NotificationTarget =
  | { screen: 'requests'; role: Role; bookingId?: string }
  | { screen: 'chat'; role: Role; bookingId?: string };

export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web') {
    return {
      enabled: false,
      message: 'Push-уведомления работают только в приложении iOS/Android.',
    };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SVADBA.kz',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A5DF9',
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
      message: 'Разрешение не получено. Включите уведомления в настройках телефона.',
    };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

  if (!projectId) {
    return {
      enabled: true,
      message: 'Разрешение есть, но EAS projectId не найден.',
    };
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  return {
    enabled: true,
    token,
    message: 'Push-уведомления включены.',
  };
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

function parseNotificationTarget(
  response: Notifications.NotificationResponse,
): NotificationTarget | null {
  const data = response.notification.request.content.data ?? {};
  const role = data.role;
  const screen = data.screen;
  const bookingId = typeof data.bookingId === 'string' ? data.bookingId : undefined;

  if (role !== 'client' && role !== 'vendor') {
    return null;
  }

  if (screen === 'requests') {
    return { screen, role, bookingId };
  }

  if (screen === 'chat') {
    return { screen, role, bookingId };
  }

  return null;
}
