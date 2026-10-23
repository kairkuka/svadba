export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '')
  .trim()
  .replace(/\/$/, '');

export const API_TIMEOUT_MS = 15000;
export const API_UPLOAD_TIMEOUT_MS = 120000;
