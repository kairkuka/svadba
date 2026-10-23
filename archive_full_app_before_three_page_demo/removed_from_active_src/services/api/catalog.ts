import { categories, vendors } from '../data/mock';
import type { Vendor } from '../types';
import { apiRequest } from './client';
import { API_BASE_URL } from './config';

export type CatalogFilters = {
  query?: string;
  category?: string;
  city?: string;
};

export async function getCategories() {
  if (API_BASE_URL) {
    return apiRequest<string[]>('/categories');
  }

  return categories;
}

export async function getVendors(filters: CatalogFilters = {}) {
  if (API_BASE_URL) {
    return getVendorsFromApi(filters);
  }

  if (!filters.query && !filters.category && !filters.city) {
    return vendors;
  }

  return vendors.filter((vendor) => {
    const query = filters.query?.trim().toLowerCase();
    const matchesQuery =
      !query ||
      vendor.name.toLowerCase().includes(query) ||
      vendor.category.toLowerCase().includes(query) ||
      vendor.city.toLowerCase().includes(query);
    const matchesCategory =
      !filters.category ||
      filters.category === 'Все' ||
      vendor.category === filters.category;
    const matchesCity = !filters.city || vendor.city === filters.city;

    return matchesQuery && matchesCategory && matchesCity;
  });
}

export async function getVendorById(id: string) {
  if (API_BASE_URL) {
    return apiRequest<Vendor>(`/vendors/${id}`);
  }

  return vendors.find((vendor) => vendor.id === id) ?? null;
}

export async function getVendorsFromApi(filters: CatalogFilters = {}) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set('query', filters.query);
  }
  if (filters.category && filters.category !== 'Все') {
    params.set('category', filters.category);
  }
  if (filters.city) {
    params.set('city', filters.city);
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';

  return apiRequest<Vendor[]>(`/vendors${suffix}`);
}
