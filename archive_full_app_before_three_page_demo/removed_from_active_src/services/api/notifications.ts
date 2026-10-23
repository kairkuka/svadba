import { Platform } from 'react-native';

import { apiRequest } from './client';
import { API_BASE_URL } from './config';

export async function registerPushToken(token: string, accessToken?: string) {
  if (!API_BASE_URL) {
    return { registered: true };
  }

  return apiRequest<{ registered: boolean }>('/devices/push-token', {
    method: 'POST',
    token: accessToken,
    body: {
      token,
      platform: Platform.OS,
    },
  });
}
