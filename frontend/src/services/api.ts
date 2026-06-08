const API_BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('vihara_token');
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || err.message || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as T;
  return res.text() as unknown as T;
}

// ── AUTH ────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const form = new URLSearchParams({ username: email, password });
  const data = await request<{ access_token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: form.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  localStorage.setItem('vihara_token', data.access_token);
  localStorage.setItem('vihara_user', JSON.stringify(data.user));
  return data;
}

export async function register(name: string, email: string, password: string) {
  const data = await request<{ access_token: string; user: any }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  localStorage.setItem('vihara_token', data.access_token);
  localStorage.setItem('vihara_user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('vihara_token');
  localStorage.removeItem('vihara_user');
}

export function getUser() {
  const u = localStorage.getItem('vihara_user');
  return u ? JSON.parse(u) : null;
}

// ── MONUMENT RECOGNITION ────────────────────────────────────────
async function prepareVisionImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 768;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

export async function recognizeMonument(imageFile: File, mode = 'Story Mode', language = 'English') {
  const optimizedImage = await prepareVisionImage(imageFile);
  const form = new FormData();
  form.append('image', optimizedImage);
  form.append('mode', mode);
  form.append('language', language);
  return request<any>('/monuments/recognize', { method: 'POST', body: form });
}

// ── STREAMING CHAT ──────────────────────────────────────────────
export async function* streamChat(
  message: string,
  mode: string,
  language: string,
  history: { role: string; content: string }[],
): AsyncGenerator<string> {
  const token = localStorage.getItem('vihara_token');
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, mode, language, history }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new ApiError(res.status, err.detail || 'Chat request failed');
  }
  if (!res.body) throw new Error('No response body for streaming');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      if (raw.startsWith('{')) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.content) yield parsed.content;
          if (parsed.error) throw new Error(parsed.error);
        } catch (e: any) {
          if (e.message !== 'Unexpected token') throw e;
        }
      }
    }
  }
}

// ── TRIP PLANNER ────────────────────────────────────────────────
export async function generateItinerary(
  destination: string,
  days: number,
  travelers: number,
  interests: string[],
  language: string = 'English',
  start_date?: string,
  end_date?: string,
) {
  return request<any>('/planner/generate', {
    method: 'POST',
    body: JSON.stringify({ destination, days, travelers, interests, language, start_date, end_date }),
  });
}

export async function getWeather(city: string) {
  return request<any>(`/planner/weather/${encodeURIComponent(city)}`);
}

// ── HIDDEN GEMS ─────────────────────────────────────────────────
export async function getHiddenGems(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<any[]>(`/gems${qs ? '?' + qs : ''}`);
}

export async function getGemDetail(id: string) {
  return request<any>(`/gems/${id}`);
}

// ── VOICE ────────────────────────────────────────────────────────
export async function transcribeAudio(blob: Blob, language = 'en') {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  form.append('language', language);
  return request<any>('/voice/transcribe', { method: 'POST', body: form });
}

export async function generateNarration(text: string, mode: string, language: string, place?: string) {
  return request<any>('/voice/narrate', {
    method: 'POST',
    body: JSON.stringify({ text, mode, language, place }),
  });
}

export async function getNarrationLibrary() {
  return request<any>('/voice/library');
}

// ── SAVED PLACES ─────────────────────────────────────────────────
export async function getSavedPlaces() {
  return request<any[]>('/saved');
}

export async function savePlace(placeId: string, data: { name: string; location: string; type?: string; note?: string }) {
  return request<any>('/saved', {
    method: 'POST',
    body: JSON.stringify({ ...(placeId ? { monument_id: placeId } : {}), ...data }),
  });
}

export async function unsavePlace(savedId: string) {
  return request<any>(`/saved/${savedId}`, { method: 'DELETE' });
}

// ── CONFIG ───────────────────────────────────────────────────────
export async function getPublicConfig() {
  return request<{ google_maps_key: string; has_weather: boolean; has_groq: boolean }>('/config').catch(() => ({
    google_maps_key: '', has_weather: false, has_groq: false,
  }));
}

// ── NAMED EXPORT for backwards compat ────────────────────────────
export const apiService = {
  login, register, logout, getUser,
  recognizeMonument, streamChat,
  generateItinerary, getWeather,
  getHiddenGems, getGemDetail,
  transcribeAudio, generateNarration, getNarrationLibrary,
  getSavedPlaces, savePlace, unsavePlace,
  getPublicConfig,
};
