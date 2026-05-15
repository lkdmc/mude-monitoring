import { useEffect, useState } from "react";
import {
  fetchStatus,
  fetchHistory,
  addTarget,
  removeTarget,
  StatusEntry,
  HistoryEntry,
} from "./api";
import StatusCard from "./components/StatusCard";
import UptimeChart from "./components/UptimeChart";

const REFRESH_INTERVAL = 30_000;

const App = () => {
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = newName.trim();
    const trimmedUrl = newUrl.trim();

    if (!trimmedName) {
      setFormError("Name is required.");
      return;
    }
    if (!trimmedUrl.startsWith("http")) {
      setFormError("URL must start with http:// or https://");
      return;
    }

    setFormLoading(true);
    try {
      await addTarget(trimmedName, trimmedUrl);
      setNewName("");
      setNewUrl("");
      await loadStatus();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add target.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await removeTarget(id);
      if (selectedId === id) {
        setSelectedId(null);
        setHistory([]);
      }
      await loadStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove target.");
    }
  };

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
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add Target Form */}
      <form
        onSubmit={handleAdd}
        style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 8,
          padding: 20,
          marginBottom: 32,
        }}
      >
        <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 15 }}>
          Add Monitoring Target
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              flex: "1 1 150px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 14,
              padding: "8px 12px",
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="https://example.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            style={{
              flex: "2 1 260px",
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 14,
              padding: "8px 12px",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={formLoading}
            style={{
              background: formLoading ? "#334155" : "#3b82f6",
              border: "none",
              borderRadius: 6,
              color: "#fff",
              cursor: formLoading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              padding: "8px 20px",
              transition: "background 0.15s",
            }}
          >
            {formLoading ? "Adding…" : "Add"}
          </button>
        </div>
        {formError && (
          <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
            {formError}
          </p>
        )}
      </form>

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
