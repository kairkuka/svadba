import type { CreatePortfolioItemPayload, PortfolioItem } from '../types';
import { apiRequest, apiUploadRequest } from './client';
import { API_BASE_URL } from './config';

export async function createPortfolioItem(
  payload: CreatePortfolioItemPayload,
  token?: string,
  onProgress?: (progress: number) => void,
): Promise<PortfolioItem> {
  if (API_BASE_URL) {
    return apiUploadRequest<PortfolioItem>(
      '/vendor/portfolio',
      'POST',
      buildPortfolioFormData(payload),
      token,
      onProgress,
    );
  }

  await simulateUpload(onProgress);

  return {
    id: `portfolio-${Date.now()}`,
    title: payload.title,
    category: payload.category,
    description: payload.description,
    mediaCount: payload.media.length,
    media: payload.media,
    coverLabel: payload.category,
    moderationStatus: 'На модерации',
    moderationNote: undefined,
    updatedAt: 'Только что',
  };
}

export async function deletePortfolioItem(itemId: string, token?: string) {
  if (API_BASE_URL) {
    await apiRequest<void>(`/vendor/portfolio/${itemId}`, {
      method: 'DELETE',
      token,
    });
  }
}

export async function updatePortfolioItem(
  item: PortfolioItem,
  payload: CreatePortfolioItemPayload,
  token?: string,
  onProgress?: (progress: number) => void,
): Promise<PortfolioItem> {
  if (API_BASE_URL) {
    return apiUploadRequest<PortfolioItem>(
      `/vendor/portfolio/${item.id}`,
      'PATCH',
      buildPortfolioFormData(payload),
      token,
      onProgress,
    );
  }

  await simulateUpload(onProgress);

  return {
    ...item,
    title: payload.title,
    category: payload.category,
    description: payload.description,
    media: payload.media.length > 0 ? payload.media : item.media,
    mediaCount:
      payload.media.length > 0 ? payload.media.length : item.mediaCount,
    coverLabel: payload.category,
    moderationStatus: 'На модерации',
    moderationNote: undefined,
    updatedAt: 'Только что',
  };
}

function buildPortfolioFormData(payload: CreatePortfolioItemPayload) {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('category', payload.category);
  formData.append('description', payload.description);

  payload.media.forEach((media, index) => {
    formData.append(
      'media',
      {
        uri: media.uri,
        name: media.fileName || `portfolio-${index}`,
        type: media.mimeType,
      } as unknown as Blob,
    );
  });

  return formData;
}

async function simulateUpload(onProgress?: (progress: number) => void) {
  for (const progress of [0, 0.2, 0.45, 0.7, 1]) {
    onProgress?.(progress);
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
  }
}
