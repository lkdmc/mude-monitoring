import { StatusEntry } from "../api";

type Props = {
  entry: StatusEntry;
  selected: boolean;
  onClick: () => void;
  onDelete: (id: number) => void;
};

const StatusCard = ({ entry, selected, onClick, onDelete }: Props) => {
  const isUp = entry.is_up === 1;
  const hasData = entry.checked_at !== null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Remove "${entry.name}" from monitoring?`)) {
      onDelete(entry.id);
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${selected ? "#4f8ef7" : isUp ? "#22c55e" : "#ef4444"}`,
        borderRadius: 8,
        padding: "16px 20px",
        cursor: "pointer",
        background: selected ? "#1e293b" : "#0f172a",
        transition: "all 0.2s",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{entry.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              background: !hasData ? "#334155" : isUp ? "#16a34a" : "#dc2626",
              color: "#fff",
            }}
          >
            {!hasData ? "PENDING" : isUp ? "UP" : "DOWN"}
          </span>
          <button
            onClick={handleDelete}
            title="Remove target"
            style={{
              background: "transparent",
              border: "1px solid #475569",
              borderRadius: 6,
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              padding: "2px 7px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444";
              (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#475569";
              (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 13, color: "#94a3b8" }}>
        <span>{entry.url}</span>
      </div>
      {hasData && (
        <div style={{ marginTop: 6, fontSize: 13, color: "#64748b" }}>
          <span>Status: {entry.status_code ?? "—"}</span>
          <span style={{ marginLeft: 16 }}>
            Response: {entry.response_time_ms ?? "—"}ms
          </span>
          <span style={{ marginLeft: 16 }}>
            Checked: {new Date(entry.checked_at + "Z").toLocaleTimeString("en-GB")}
          </span>
        </div>
      )}
    </div>
  );
};

export default StatusCard;
