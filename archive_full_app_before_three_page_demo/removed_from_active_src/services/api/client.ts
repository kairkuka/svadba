import {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_UPLOAD_TIMEOUT_MS,
} from './config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа сервера.');
    }

    throw new Error('Нет соединения с сервером.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Сервер вернул ошибку ${response.status}.`);
  }

  const responseText = await response.text();

  if (!responseText) {
    return undefined as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error('Сервер вернул некорректный ответ.');
  }
}

export function apiUploadRequest<T>(
  path: string,
  method: 'POST' | 'PATCH',
  body: FormData,
  token?: string,
  onProgress?: (progress: number) => void,
) {
  if (!API_BASE_URL) {
    return Promise.reject(new Error('API base URL is not configured'));
  }

  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, `${API_BASE_URL}${path}`);
    request.timeout = API_UPLOAD_TIMEOUT_MS;
    request.setRequestHeader('Accept', 'application/json');

    if (token) {
      request.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(event.loaded / event.total, 1));
      }
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Сервер вернул ошибку ${request.status}.`));
        return;
      }

      try {
        onProgress?.(1);
        resolve(JSON.parse(request.responseText) as T);
      } catch {
        reject(new Error('Сервер вернул некорректный ответ.'));
      }
    };

    request.onerror = () => reject(new Error('Нет соединения с сервером.'));
    request.ontimeout = () =>
      reject(new Error('Превышено время ожидания загрузки.'));

    onProgress?.(0);
    request.send(body);
  });
}
