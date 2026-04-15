import { supabase } from './supabase';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`/api${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  saveScan: (result: any, imageBase64: string) => fetchWithAuth('/save-scan', { method: 'POST', body: JSON.stringify({ result, imageBase64 }) }),
  getHistory: () => fetchWithAuth('/get-history'),
  saveChat: (role: string, content: string) => fetchWithAuth('/save-chat', { method: 'POST', body: JSON.stringify({ role, content }) }),
  getChats: () => fetchWithAuth('/get-chats'),
  saveGoals: (goals: any) => fetchWithAuth('/save-goals', { method: 'POST', body: JSON.stringify(goals) }),
  getGoals: () => fetchWithAuth('/get-goals'),
};
