const BASE = "/api";

export type Target = {
  id: number;
  name: string;
  url: string;
};

export type StatusEntry = {
  id: number;
  name: string;
  url: string;
  status_code: number | null;
  response_time_ms: number | null;
  is_up: 0 | 1 | null;
  checked_at: string | null;
};

export type HistoryEntry = {
  status_code: number | null;
  response_time_ms: number;
  is_up: 0 | 1;
  checked_at: string;
};

export const fetchStatus = async (): Promise<StatusEntry[]> => {
  const res = await fetch(`${BASE}/status`);
  const json = await res.json();
  return json.data;
};

export const fetchHistory = async (id: number): Promise<HistoryEntry[]> => {
  const res = await fetch(`${BASE}/history/${id}`);
  const json = await res.json();
  return json.data;
};

export const addTarget = async (name: string, url: string): Promise<void> => {
  const res = await fetch(`${BASE}/targets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, url }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
};

export const removeTarget = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE}/targets/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
};
