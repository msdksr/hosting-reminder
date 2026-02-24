"use client";
import { useEffect, useState } from "react";
import type { ReminderLog } from "@/types";

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "whatsapp") {
    return <span className="badge badge-success">💬 WhatsApp</span>;
  }
  return <span className="badge badge-info">📧 Email</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <span className="badge badge-success">✓ Sent</span>;
  if (status === "failed") return <span className="badge badge-danger">✗ Failed</span>;
  return <span className="badge badge-muted">Skipped</span>;
}

function DaysLeftBadge({ days }: { days: number }) {
  if (days < 0) return <span className="badge badge-danger">Past</span>;
  if (days === 0) return <span className="badge badge-danger">Same day</span>;
  return <span className="badge badge-muted">{days}d before</span>;
}

const CHANNEL_OPTS = ["all", "email", "whatsapp"] as const;
const STATUS_OPTS = ["all", "sent", "failed", "skipped"] as const;

export default function LogsPage() {
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    fetch("/api/logs")
      .then((r) => r.json())
      .then((data) => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setLogs([]); setLoading(false); });
  }, []);

  console.log(logs, "logs");
  

  const filtered = logs.filter((log) => {
    const matchSearch =
      (log.client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.service?.domainName || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.client?.email || "").toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === "all" || log.channel === channelFilter;
    const matchStatus = statusFilter === "all" || log.status === statusFilter;
    return matchSearch && matchChannel && matchStatus;
  });

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const skippedCount = logs.filter((l) => l.status === "skipped").length;

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent">Dashboard</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Activity Logs</span>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Activity Logs</h1>
            <p className="page-subtitle">Track every reminder dispatched by the system</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--color-success)" }}>
            <div className="stat-icon-wrap" style={{ background: "var(--color-success-bg)" }}>✅</div>
            <div>
              <div className="stat-label">Successfully Sent</div>
              <div className="stat-value" style={{ color: "var(--color-success)" }}>{sentCount}</div>
            </div>
          </div>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--color-danger)" }}>
            <div className="stat-icon-wrap" style={{ background: "var(--color-danger-bg)" }}>❌</div>
            <div>
              <div className="stat-label">Failed</div>
              <div className="stat-value" style={{ color: "var(--color-danger)" }}>{failedCount}</div>
            </div>
          </div>
          <div className="stat-card" style={{ ["--stat-color" as string]: "var(--text-muted)" }}>
            <div className="stat-icon-wrap" style={{ background: "rgba(71,85,105,0.15)" }}>⏭️</div>
            <div>
              <div className="stat-label">Skipped</div>
              <div className="stat-value" style={{ color: "var(--text-muted)" }}>{skippedCount}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="search-input-wrap" style={{ minWidth: 260 }}>
            <span className="search-icon">🔍</span>
            <input className="form-input search-input" placeholder="Search client, domain, or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: "auto" }} value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
            {CHANNEL_OPTS.map((o) => <option key={o} value={o}>{o === "all" ? "All Channels" : o === "email" ? "📧 Email" : "💬 WhatsApp"}</option>)}
          </select>
          <select className="form-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTS.map((o) => <option key={o} value={o}>{o === "all" ? "All Status" : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
          <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{filtered.length} log{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <div className="loading-spinner" style={{ margin: "0 auto", width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No logs found</div>
            <div className="empty-desc">
              {search || channelFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Run reminders to see activity here"}
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Channel</th>
                  <th>Days Before Expiry</th>
                  <th>Status</th>
                  <th>Error</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{log.client?.name || "—"}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{log.client?.email}</div>
                    </td>
                    <td style={{ fontSize: 13.5 }}>
                      {log.service?.domainName || "—"}
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{log.service?.serviceType}</div>
                    </td>
                    <td><ChannelBadge channel={log.channel} /></td>
                    <td><DaysLeftBadge days={log.daysLeft} /></td>
                    <td><StatusBadge status={log.status} /></td>
                    <td style={{ fontSize: 12, color: "var(--color-danger)", maxWidth: 200 }}>
                      {log.errorMessage ? (
                        <span title={log.errorMessage}>
                          {log.errorMessage.slice(0, 40)}{log.errorMessage.length > 40 ? "…" : ""}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {formatDateTime(log.sentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
