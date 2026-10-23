import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CreatePortfolioItemPayload,
  CreateVendorServicePayload,
} from '../types';
import { clearDraftMedia, persistDraftMedia } from './mediaStorage';

const SERVICE_DRAFT_PREFIX = '@svadba/draft/service';
const PORTFOLIO_DRAFT_KEY = '@svadba/draft/portfolio';

export type ServiceDraft = {
  serviceId?: string;
  payload: CreateVendorServicePayload;
  savedAt: string;
};

export type PortfolioDraft = {
  itemId?: string;
  payload: CreatePortfolioItemPayload;
  savedAt: string;
  missingMediaCount?: number;
};

export async function loadServiceDraft(serviceId?: string) {
  return readDraft<ServiceDraft>(serviceDraftKey(serviceId));
}

export async function saveServiceDraft(
  payload: CreateVendorServicePayload,
  serviceId?: string,
) {
  const draft: ServiceDraft = {
    serviceId,
    payload,
    savedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(serviceDraftKey(serviceId), JSON.stringify(draft));
  return draft;
}

export async function clearServiceDraft(serviceId?: string) {
  await AsyncStorage.removeItem(serviceDraftKey(serviceId));
}

export async function loadPortfolioDraft() {
  const draft = await readDraft<PortfolioDraft>(PORTFOLIO_DRAFT_KEY);

  if (!draft) {
    return null;
  }

  try {
    const result = await persistDraftMedia(draft.payload.media);
    const migratedDraft: PortfolioDraft = {
      ...draft,
      payload: { ...draft.payload, media: result.media },
      missingMediaCount: result.missingCount,
    };

    await AsyncStorage.setItem(
      PORTFOLIO_DRAFT_KEY,
      JSON.stringify(migratedDraft),
    );
    return migratedDraft;
  } catch {
    return draft;
  }
}

export async function savePortfolioDraft(
  payload: CreatePortfolioItemPayload,
  itemId?: string,
) {
  const persistedMedia = await persistDraftMedia(payload.media);
  const draft: PortfolioDraft = {
    itemId,
    payload: { ...payload, media: persistedMedia.media },
    savedAt: new Date().toISOString(),
    missingMediaCount: persistedMedia.missingCount,
  };

  await AsyncStorage.setItem(PORTFOLIO_DRAFT_KEY, JSON.stringify(draft));
  return draft;
}

export async function clearPortfolioDraft() {
  await Promise.all([
    AsyncStorage.removeItem(PORTFOLIO_DRAFT_KEY),
    clearDraftMedia(),
  ]);
}

export async function clearAllDrafts() {
  const keys = await AsyncStorage.getAllKeys();
  const draftKeys = keys.filter(
    (key) => key.startsWith(SERVICE_DRAFT_PREFIX) || key === PORTFOLIO_DRAFT_KEY,
  );

  if (draftKeys.length > 0) {
    await AsyncStorage.multiRemove(draftKeys);
  }

  await clearDraftMedia();
}

function serviceDraftKey(serviceId?: string) {
  return `${SERVICE_DRAFT_PREFIX}/${serviceId ?? 'new'}`;
}

async function readDraft<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    await AsyncStorage.removeItem(key);
    return null;
  }
}
