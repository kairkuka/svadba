import { clientLeads, vendorLeads } from '../data/mock';
import type { CreateLeadPayload, Lead, LeadStatus, Role } from '../types';
import { apiRequest } from './client';
import { API_BASE_URL } from './config';

export async function getLeads(role: Role, token?: string) {
  if (API_BASE_URL) {
    return apiRequest<Lead[]>(`/leads?role=${role}`, { token });
  }

  return role === 'client' ? clientLeads : vendorLeads;
}

export async function createLead(payload: CreateLeadPayload, token?: string) {
  if (API_BASE_URL) {
    return apiRequest<Lead>('/leads', {
      method: 'POST',
      body: payload,
      token,
    });
  }

  const lead: Lead = {
    id: `local-${Date.now()}`,
    title: `Заявка на ${payload.date || 'дату не указана'}`,
    vendor: payload.vendorName,
    client: payload.contactName || 'Клиент',
    date: payload.date || 'Дата не указана',
    guests: Number(payload.guests) || 0,
    budget: payload.budget || 'Бюджет не указан',
    status: 'Ожидает ответа',
    lastUpdate: 'Только что',
  };

  return lead;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  token?: string,
) {
  if (API_BASE_URL) {
    return apiRequest<Lead>(`/leads/${leadId}/status`, {
      method: 'PATCH',
      body: { status },
      token,
    });
  }

  return { leadId, status };
}
