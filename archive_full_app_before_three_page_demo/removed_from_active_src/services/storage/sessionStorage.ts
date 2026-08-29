import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { UserSession } from '../types';

const SESSION_KEY = '@svadba/session';
const ACCESS_TOKEN_KEY = 'svadba.access-token';
const ACCESS_TOKEN_FALLBACK_KEY = '@svadba/access-token';

export async function loadSession(): Promise<UserSession | null> {
  try {
    const rawSession = await AsyncStorage.getItem(SESSION_KEY);

    if (!rawSession) {
      return null;
    }

    const parsedSession: unknown = JSON.parse(rawSession);

    const session = parseUserSession(parsedSession);

    if (!session) {
      await clearSession();
      return null;
    }

    const secureAccessToken = await readAccessToken();
    const accessToken = secureAccessToken ?? session.accessToken;

    if (!secureAccessToken && session.accessToken) {
      await writeAccessToken(session.accessToken);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(stripToken(session)));
    }

    return { ...session, accessToken };
  } catch {
    return null;
  }
}

export async function saveSession(session: UserSession): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(stripToken(session))),
    session.accessToken
      ? writeAccessToken(session.accessToken)
      : deleteAccessToken(),
  ]);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(SESSION_KEY),
    deleteAccessToken(),
  ]);
}

function stripToken(session: UserSession) {
  const { accessToken: _accessToken, ...profile } = session;
  return profile;
}

async function readAccessToken() {
  if (await SecureStore.isAvailableAsync()) {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  }

  return AsyncStorage.getItem(ACCESS_TOKEN_FALLBACK_KEY);
}

async function writeAccessToken(accessToken: string) {
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY);
    return;
  }

  await AsyncStorage.setItem(ACCESS_TOKEN_FALLBACK_KEY, accessToken);
}

async function deleteAccessToken() {
  if (await SecureStore.isAvailableAsync()) {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  }

  await AsyncStorage.removeItem(ACCESS_TOKEN_FALLBACK_KEY);
}

function parseUserSession(value: unknown): UserSession | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Record<string, unknown>;

  if (
    (session.role !== 'client' && session.role !== 'vendor') ||
    typeof session.city !== 'string' ||
    typeof session.name !== 'string'
  ) {
    return null;
  }

  return {
    role: session.role,
    city: session.city,
    name: session.name,
    phone: typeof session.phone === 'string' ? session.phone : '',
    accessToken:
      typeof session.accessToken === 'string' ? session.accessToken : undefined,
  };
}
