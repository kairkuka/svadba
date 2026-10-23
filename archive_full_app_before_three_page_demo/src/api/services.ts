import type { CreateVendorServicePayload, VendorService } from '../types';
import { apiRequest } from './client';
import { API_BASE_URL } from './config';

export async function createVendorService(
  payload: CreateVendorServicePayload,
  token?: string,
): Promise<VendorService> {
  if (API_BASE_URL) {
    return apiRequest<VendorService>('/vendor/services', {
      method: 'POST',
      body: payload,
      token,
    });
  }

  return {
    id: `service-${Date.now()}`,
    title: payload.title,
    category: payload.category,
    price: payload.priceType === 'По запросу' ? 'По запросу' : payload.price,
    priceType: payload.priceType,
    packageDetails: payload.packageDetails,
    conditions: payload.conditions,
    moderationStatus: 'На модерации',
    updatedAt: 'Только что',
  };
}

export async function updateVendorService(
  service: VendorService,
  payload: CreateVendorServicePayload,
  token?: string,
): Promise<VendorService> {
  if (API_BASE_URL) {
    return apiRequest<VendorService>(`/vendor/services/${service.id}`, {
      method: 'PATCH',
      body: payload,
      token,
    });
  }

  return {
    ...service,
    ...payload,
    price: payload.priceType === 'По запросу' ? 'По запросу' : payload.price,
    moderationStatus: 'На модерации',
    moderationNote: undefined,
    updatedAt: 'Только что',
  };
}

export async function deleteVendorService(serviceId: string, token?: string) {
  if (API_BASE_URL) {
    await apiRequest<void>(`/vendor/services/${serviceId}`, {
      method: 'DELETE',
      token,
    });
  }
}
