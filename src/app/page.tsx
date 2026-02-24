"use client";
import { useEffect, useState } from "react";
import type { DashboardStats } from "@/types";
import Link from "next/link";

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) return <span className="badge badge-danger">Expired</span>;
  if (days === 0) return <span className="badge badge-danger">Today</span>;
  if (days <= 3) return <span className="badge badge-danger">{days}d left</span>;
  if (days <= 7) return <span className="badge badge-warning">{days}d left</span>;
  return <span className="badge badge-info">{days}d left</span>;
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp") return <span title="WhatsApp">💬</span>;
  return <span title="Email">📧</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <span className="badge badge-success">✓ Sent</span>;
  if (status === "failed") return <span className="badge badge-danger">✗ Failed</span>;
  return <span className="badge badge-muted">Skipped</span>;
}

function ServiceTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    domain: "badge-info",
    hosting: "badge-purple",
    ssl: "badge-warning",
  };
  const icons: Record<string, string> = { domain: "🌐", hosting: "🖥️", ssl: "🔒" };
  return (
    <span className={`badge ${map[type] || "badge-muted"}`}>
      {icons[type] || "📦"} {type}
    </span>
  );
}

import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";

export default function OverviewPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPERADMIN;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningReminders, setRunningReminders] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRunReminders = async () => {
    if (!isAdmin) return;
    setRunningReminders(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/run-reminders", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const r = data.result;
        setRunResult(`✅ Done! ${r.sent} sent, ${r.failed} failed, ${r.skipped} skipped.`);
        load();
      } else {
        setRunResult("❌ Failed to run reminders.");
      }
    } catch {
      setRunResult("❌ Error running reminders.");
    } finally {
      setRunningReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <p className="text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: "👥",
      label: "Total Clients",
      value: stats?.totalClients ?? 0,
      color: "#6366f1",
      iconBg: "rgba(99,102,241,0.12)",
      href: "/clients",
      hide: !isAdmin,
    },
    {
      icon: "🌐",
      label: isAdmin ? "Total Services" : "My Services",
      value: stats?.totalServices ?? 0,
      color: "#06b6d4",
      iconBg: "rgba(6,182,212,0.1)",
      href: "/services",
      hide: false,
    },
    {
      icon: "⏰",
      label: "Expiring Soon",
      value: stats?.expiringThisWeek ?? 0,
      color: "#f59e0b",
      iconBg: "rgba(245,158,11,0.1)",
      href: "/services",
      hide: false,
    },
    {
      icon: "✅",
      label: isAdmin ? "Reminders Sent Today" : "Notifications Received",
      value: stats?.remindersSentToday ?? 0,
      color: "#10b981",
      iconBg: "rgba(16,185,129,0.1)",
      href: "/logs",
      hide: false,
    },
    {
      icon: "❌",
      label: "Failed Reminders",
      value: stats?.failedReminders ?? 0,
      color: "#ef4444",
      iconBg: "rgba(239,68,68,0.1)",
      href: "/logs",
      hide: !isAdmin,
    },
  ];

  return (
    <div>
      {/* Top Nav */}
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-current">Overview</span>
        </div>
        <div className="top-nav-actions">
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>

      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{isAdmin ? "Dashboard Overview" : "Account Overview"}</h1>
            <p className="page-subtitle">
              {isAdmin 
                ? "Monitor your hosting services and reminder automations" 
                : `Manage your active services and upcoming expirations`}
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-secondary"
              onClick={load}
            >
              🔄 Refresh
            </button>
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={handleRunReminders}
                disabled={runningReminders}
              >
                {runningReminders ? (
                  <>
                    <span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Running...
                  </>
                ) : (
                  "▶ Run Reminders Now"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Run result alert */}
        {runResult && (
          <div className={`alert ${runResult.startsWith("✅") ? "alert-success" : "alert-danger"} mb-6`}>
            <span>{runResult}</span>
            <button
              onClick={() => setRunResult(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Failed reminders alert */}
        {(stats?.failedReminders ?? 0) > 0 && (
          <div className="alert alert-warning mb-6">
            <span>⚠️</span>
            <span>
              <strong>{stats?.failedReminders} reminders failed to send.</strong>{" "}
              <Link href="/logs" style={{ color: "inherit", textDecoration: "underline" }}>
                View logs →
              </Link>
            </span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {statCards.map((card) => (
            <Link key={card.label} href={card.href} style={{ textDecoration: "none" }}>
              <div
                className="stat-card"
                style={{ ["--stat-color" as string]: card.color, cursor: "pointer" }}
              >
                <div
                  className="stat-icon-wrap"
                  style={{ ["--stat-icon-bg" as string]: card.iconBg, fontSize: 20 }}
                >
                  {card.icon}
                </div>
                <div>
                  <div className="stat-label">{card.label}</div>
                  <div className="stat-value" style={{ color: card.color }}>
                    {card.value}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Two-column layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}
        >
          {/* Upcoming Expirations */}
          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  ⏰ Expiring This Week
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Services expiring in the next 7 days
                </p>
              </div>
              <Link href="/services" className="btn btn-ghost btn-sm">
                View all →
              </Link>
            </div>

            {(stats?.upcomingExpirations?.length ?? 0) === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-icon">🎉</div>
                <div className="empty-title">No expiring services</div>
                <div className="empty-desc">All services are in good standing for the next 7 days</div>
              </div>
            ) : (
              <div>
                {stats?.upcomingExpirations.slice(0, 7).map((svc) => {
                  const days = daysFromNow(svc.expiryDate);
                  return (
                    <div
                      key={svc.id}
                      style={{
                        padding: "14px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background 0.12s",
                        gap: 12,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--bg-card-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: days <= 3 ? "rgba(239,68,68,0.12)" : "rgba(6,182,212,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            flexShrink: 0,
                          }}
                        >
                          {svc.serviceType === "domain" ? "🌐" : svc.serviceType === "ssl" ? "🔒" : "🖥️"}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {svc.domainName}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                            {svc.client?.name} · {formatDate(svc.expiryDate)}
                          </div>
                        </div>
                      </div>
                      <ExpiryBadge days={days} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ padding: 0 }}>
            <div
              style={{
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  📋 Recent Activity
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Latest reminder dispatches
                </p>
              </div>
              <Link href="/logs" className="btn btn-ghost btn-sm">
                View all →
              </Link>
            </div>

            {(stats?.recentLogs?.length ?? 0) === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-icon">📭</div>
                <div className="empty-title">No reminders sent yet</div>
                <div className="empty-desc">Run reminders to see activity here</div>
              </div>
            ) : (
              <div>
                {stats?.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "12px 24px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background:
                          log.status === "sent"
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(239,68,68,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      <ChannelIcon channel={log.channel} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {log.client?.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        {log.service?.domainName} · {formatTime(log.sentAt)}
                      </div>
                    </div>
                    <StatusBadge status={log.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
            ⚡ Quick Actions
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/clients" className="btn btn-secondary">
              👥 Add Client
            </Link>
            <Link href="/services" className="btn btn-secondary">
              🌐 Add Service
            </Link>
            <Link href="/reminders" className="btn btn-secondary">
              🔔 Configure Schedules
            </Link>
            <Link href="/settings" className="btn btn-secondary">
              ⚙️ Settings
            </Link>
            <Link href="/logs" className="btn btn-secondary">
              📋 View All Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
