import { useEffect, useState } from "react";
import { fetchStatus, fetchHistory, StatusEntry, HistoryEntry } from "./api";
import StatusCard from "./components/StatusCard";
import UptimeChart from "./components/UptimeChart";

const REFRESH_INTERVAL = 30_000;

const App = () => {
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStatus = async () => {
    const data = await fetchStatus();
    setStatuses(data);
    setLastUpdated(new Date());
    if (selectedId === null && data.length > 0) {
      setSelectedId(data[0].id);
    }
  };

  const loadHistory = async (id: number) => {
    const data = await fetchHistory(id);
    setHistory(data);
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      loadHistory(selectedId);
    }
  }, [selectedId]);

  const selectedTarget = statuses.find((s) => s.id === selectedId);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020817",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: "32px 24px",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
          MUDE Platform Monitor
        </h1>
        <p style={{ color: "#64748b", marginTop: 6, fontSize: 14 }}>
          TU Delft platform uptime — refreshes every 30s
          {lastUpdated && (
            <span> · Last updated: {lastUpdated.toLocaleTimeString("en-GB")}</span>
          )}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {statuses.map((entry) => (
          <StatusCard
            key={entry.id}
            entry={entry}
            selected={entry.id === selectedId}
            onClick={() => setSelectedId(entry.id)}
          />
        ))}
      </div>

      {selectedTarget && (
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: 24,
          }}
        >
          <UptimeChart name={selectedTarget.name} history={history} />
        </div>
      )}
    </div>
  );
};

export default App;
