import type { Role } from '../types';
import { apiRequest } from './client';
import { API_BASE_URL } from './config';

export type RequestAuthCodePayload = {
  phone: string;
};

export type RequestAuthCodeResponse = {
  requestId: string;
  autofillCode?: string;
};

export type VerifyAuthCodePayload = {
  requestId: string;
  code: string;
  phone: string;
  role: Role;
  city: string;
  name: string;
};

export type VerifyAuthCodeResponse = {
  accessToken: string;
};

export async function requestAuthCode(
  payload: RequestAuthCodePayload,
): Promise<RequestAuthCodeResponse> {
  if (!API_BASE_URL) {
    await wait(450);
    return {
      requestId: `mock-${Date.now()}`,
      autofillCode: '1234',
    };
  }

  return apiRequest<RequestAuthCodeResponse>('/auth/otp/request', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyAuthCode(
  payload: VerifyAuthCodePayload,
): Promise<VerifyAuthCodeResponse> {
  if (!API_BASE_URL) {
    await wait(500);

    if (payload.code !== '1234') {
      throw new Error('Неверный код. Проверьте цифры и попробуйте снова.');
    }

    return { accessToken: `mock-token-${Date.now()}` };
  }

  return apiRequest<VerifyAuthCodeResponse>('/auth/otp/verify', {
    method: 'POST',
    body: payload,
  });
}

function wait(duration: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}
