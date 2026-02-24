"use client";
import { useEffect, useState } from "react";
import type { ReminderSchedule } from "@/types";

const DEFAULT_DAYS = [30, 14, 7, 3, 1];
const ALL_DAYS = [60, 45, 30, 21, 14, 10, 7, 5, 3, 2, 1, 0];
const SERVICE_TYPES = ["domain", "hosting", "ssl"];
const CHANNELS = ["email", "whatsapp"];

const DEFAULT_EMAIL_TEMPLATE = `<p>Hi {{clientName}},</p>
<p>Your <strong>{{serviceType}}</strong> <strong>{{domain}}</strong> expires in <strong>{{daysLeft}} day(s)</strong> on {{expiryDate}}.</p>
<p>Please renew it promptly to avoid interruption.</p>
<p>Thanks!</p>`;

const DEFAULT_WA_TEMPLATE = `Hi *{{clientName}}*,

Your *{{serviceType}}* *{{domain}}* expires in *{{daysLeft}} day(s)*.

Please renew it to avoid service interruption.`;

export default function RemindersPage() {
  const [schedules, setSchedules] = useState<ReminderSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [runResult, setRunResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null);

  const [form, setForm] = useState({
    name: "Default Schedule",
    daysBefore: DEFAULT_DAYS,
    channels: ["email"] as string[],
    serviceTypes: ["domain", "hosting", "ssl"] as string[],
    isActive: true,
    emailTemplate: DEFAULT_EMAIL_TEMPLATE,
    whatsappTemplate: DEFAULT_WA_TEMPLATE,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading schedules:", e);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { load(); }, []);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      daysBefore: f.daysBefore.includes(day)
        ? f.daysBefore.filter((d) => d !== day)
        : [...f.daysBefore, day].sort((a, b) => b - a),
    }));
  };

  const toggleChannel = (ch: string) => {
    setForm((f) => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter((c) => c !== ch) : [...f.channels, ch],
    }));
  };

  const toggleServiceType = (t: string) => {
    setForm((f) => ({
      ...f,
      serviceTypes: f.serviceTypes.includes(t) ? f.serviceTypes.filter((s) => s !== t) : [...f.serviceTypes, t],
    }));
  };

  const handleSave = async () => {
    if (!form.daysBefore.length || !form.channels.length || !form.serviceTypes.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        await load();
        setShowModal(false);
      }
    } finally { setSaving(false); }
  };

  const toggleActive = async (schedule: ReminderSchedule) => {
    await fetch("/api/schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: schedule.id, isActive: !schedule.isActive }),
    });
    await load();
  };

  const handleRunNow = async () => {
    setRunningNow(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/run-reminders", { method: "POST" });
      const data = await res.json();
      if (data.result) setRunResult(data.result);
    } finally { setRunningNow(false); }
  };

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent">Dashboard</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Reminders</span>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reminder Schedules</h1>
            <p className="page-subtitle">Configure when and how reminders are sent to clients</p>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={handleRunNow} disabled={runningNow}>
              {runningNow ? (
                <><span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Running...</>
              ) : "▶ Run Now"}
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Schedule</button>
          </div>
        </div>

        {/* Run result */}
        {runResult && (
          <div className="alert alert-success mb-6">
            ✅ Reminder job completed: <strong>{runResult.sent} sent</strong>, {runResult.failed} failed, {runResult.skipped} skipped.
            <button onClick={() => setRunResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16 }}>×</button>
          </div>
        )}

        {/* How it works */}
        <div className="card mb-6" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 24 }}>ℹ️</span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>How Reminder Schedules Work</div>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Each schedule defines <strong>which services</strong> to check, <strong>how many days before expiry</strong> to send reminders, and <strong>which channels</strong> to use. The reminder engine runs daily and checks all services against active schedules. Duplicate reminders are automatically prevented.
              </p>
              <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                {[
                  { icon: "🔔", label: "Define trigger days", desc: "e.g. 30, 7, 3, 1 days before" },
                  { icon: "📣", label: "Choose channels", desc: "Email and/or WhatsApp" },
                  { icon: "🎯", label: "Target service types", desc: "Domain, Hosting, SSL" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Schedules list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <div className="loading-spinner" style={{ margin: "0 auto", width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <div className="empty-title">No schedules yet</div>
            <div className="empty-desc">Create your first reminder schedule to automate notifications</div>
            <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>+ Create Schedule</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {schedules.map((schedule) => (
              <div key={schedule.id} className="card" style={{ opacity: schedule.isActive ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                        📅 {schedule.name}
                      </h3>
                      {schedule.isActive ? (
                        <span className="badge badge-success">● Active</span>
                      ) : (
                        <span className="badge badge-muted">○ Inactive</span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>Trigger Days</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {schedule.daysBefore.sort((a, b) => b - a).map((d) => (
                            <span key={d} className="badge badge-purple">
                              {d === 0 ? "On expiry" : `${d}d`}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>Channels</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          {schedule.channels.includes("email") && <span className="badge badge-info">📧 Email</span>}
                          {schedule.channels.includes("whatsapp") && <span className="badge badge-success">💬 WhatsApp</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 6 }}>Service Types</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {schedule.serviceTypes.map((t) => (
                            <span key={t} className="badge badge-muted">
                              {t === "domain" ? "🌐" : t === "ssl" ? "🔒" : "🖥️"} {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {schedule.isActive ? "Active" : "Paused"}
                    </span>
                    <label className="toggle">
                      <input type="checkbox" checked={schedule.isActive} onChange={() => toggleActive(schedule)} />
                      <div className="toggle-track" />
                      <div className="toggle-thumb" />
                    </label>
                  </div>
                </div>

                {/* Template preview */}
                {(schedule.emailTemplate || schedule.whatsappTemplate) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", marginBottom: 8 }}>Templates</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {schedule.emailTemplate && <span className="badge badge-info">📧 Custom Email Template</span>}
                      {schedule.whatsappTemplate && <span className="badge badge-success">💬 Custom WhatsApp Template</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">New Reminder Schedule</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Schedule Name</label>
                <input className="form-input" placeholder="e.g. Standard Reminder" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Days */}
              <div className="form-group">
                <label className="form-label">Send Reminders (days before expiry)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        border: form.daysBefore.includes(d) ? "1px solid var(--brand-primary)" : "1px solid var(--border-default)",
                        background: form.daysBefore.includes(d) ? "rgba(99,102,241,0.15)" : "var(--bg-input)",
                        color: form.daysBefore.includes(d) ? "var(--brand-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {d === 0 ? "Day 0" : `${d}d`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channels */}
              <div className="form-group">
                <label className="form-label">Notification Channels</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => toggleChannel(ch)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 10,
                        border: form.channels.includes(ch) ? "1px solid var(--brand-primary)" : "1px solid var(--border-default)",
                        background: form.channels.includes(ch) ? "rgba(99,102,241,0.1)" : "var(--bg-input)",
                        color: form.channels.includes(ch) ? "var(--brand-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 13.5,
                        transition: "all 0.15s",
                      }}
                    >
                      {ch === "email" ? "📧 Email" : "💬 WhatsApp"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service types */}
              <div className="form-group">
                <label className="form-label">Service Types</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {SERVICE_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleServiceType(t)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 10,
                        border: form.serviceTypes.includes(t) ? "1px solid var(--brand-primary)" : "1px solid var(--border-default)",
                        background: form.serviceTypes.includes(t) ? "rgba(99,102,241,0.1)" : "var(--bg-input)",
                        color: form.serviceTypes.includes(t) ? "var(--brand-primary)" : "var(--text-secondary)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 13.5,
                        transition: "all 0.15s",
                      }}
                    >
                      {t === "domain" ? "🌐" : t === "ssl" ? "🔒" : "🖥️"} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email template */}
              <div className="form-group">
                <label className="form-label">Email Template (HTML)</label>
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                  Variables: {"{{clientName}}"}, {"{{domain}}"}, {"{{serviceType}}"}, {"{{daysLeft}}"}, {"{{expiryDate}}"}
                </div>
                <textarea className="form-textarea" style={{ minHeight: 120, fontFamily: "monospace", fontSize: 12 }} value={form.emailTemplate} onChange={(e) => setForm((f) => ({ ...f, emailTemplate: e.target.value }))} />
              </div>

              {/* WhatsApp template */}
              {form.channels.includes("whatsapp") && (
                <div className="form-group">
                  <label className="form-label">WhatsApp Message Template</label>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 6 }}>
                    Plain text. Variables: {"{{clientName}}"}, {"{{domain}}"}, {"{{serviceType}}"}, {"{{daysLeft}}"}
                  </div>
                  <textarea className="form-textarea" style={{ minHeight: 100, fontFamily: "monospace", fontSize: 12 }} value={form.whatsappTemplate} onChange={(e) => setForm((f) => ({ ...f, whatsappTemplate: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.daysBefore.length || !form.channels.length}>
                {saving ? <><span className="loading-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Saving...</> : "Create Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
