import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * API base URL. Set EXPO_PUBLIC_API_URL for real deployments. In development we
 * point at the machine running Expo so a phone on the same Wi-Fi can reach the API.
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string | undefined) || 'http://localhost:4000';
  if (!/localhost|127\.0\.0\.1/.test(configured) || Platform.OS === 'web') return configured;
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.20:8081" when running in Expo Go
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost') return configured.replace(/localhost|127\.0\.0\.1/, host);
  if (Platform.OS === 'android') return configured.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
  return configured;
}

export const API_URL = resolveBaseUrl().replace(/\/$/, '');

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (t: string | null) => { authToken = t; };
export const getAuthToken = () => authToken;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export class ApiError extends Error {
  status: number;
  field?: string;
  data?: any;
  constructor(status: number, message: string, field?: string, data?: any) {
    super(message);
    this.status = status;
    this.field = field;
    this.data = data;
  }
}

type Options = { method?: string; body?: unknown; form?: FormData };

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let body: any;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(API_URL + path, { method: opts.method || (body ? 'POST' : 'GET'), headers, body });
  } catch {
    throw new ApiError(0, "Can't reach Padhai Punjab. Please check your internet connection and try again.");
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, data?.error || 'Something went wrong. Please try again.', data?.field, data);
  }
  return data as T;
}

export const absoluteUrl = (path?: string | null) => (path ? (path.startsWith('http') ? path : API_URL + path) : null);

export type PickedFile = { uri: string; name?: string; mimeType?: string | null };

/** Append a picked image/document to FormData in a way that works on iOS, Android and web. */
export async function appendFile(form: FormData, field: string, file: PickedFile) {
  const type = file.mimeType || (file.uri.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  const name = file.name || `${field}.${type === 'application/pdf' ? 'pdf' : type.split('/')[1] || 'jpg'}`;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, name);
  } else {
    form.append(field, { uri: file.uri, name, type } as any);
  }
}
