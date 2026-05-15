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
