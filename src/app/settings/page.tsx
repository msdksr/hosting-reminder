"use client";
import { useState, useEffect } from "react";



type Section = "general" | "email" | "whatsapp" | "plesk";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // General settings
  const [general, setGeneral] = useState({
    businessName: "My Hosting Company",
    timezone: "UTC",
    cronTime: "08:00",
  });

  // Email settings
  const [email, setEmail] = useState({
    provider: "resend",
    apiKey: "",
    fromEmail: "",
    fromName: "HostAlert",
  });

  // WhatsApp settings
  const [whatsapp, setWhatsapp] = useState({
    token: "",
    phoneNumberId: "",
    apiVersion: "v25.0",
  });

  const [plesk, setPlesk] = useState({
    host: "",
    apiKey: "",
    port: "8443",
    username: "admin",
  });

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const res = await fetch("/api/settings/plesk");
        const data = await res.json();
        if (data && data.host) {
          setPlesk({
            host: data.host,
            apiKey: data.apiKey,
            port: data.port.toString(),
            username: data.username,
          });
        }
      } catch (err) {
        console.error("Failed to fetch plesk config", err);
      }
    };
    fetchConfigs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save Plesk if we have host data or are on that section
      if (plesk.host) {
        const res = await fetch("/api/settings/plesk", {
          method: "POST",
          body: JSON.stringify(plesk),
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save Plesk settings");
        }
      }

      // Placeholder for saving other sections (General, Email, WhatsApp)
      // These would ideally have their own API endpoints
      
      await new Promise((r) => setTimeout(r, 500));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setTestResult(null);
    } catch (err: any) {
      setTestResult(`❌ Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };


  const handleTestWhatsApp = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/test-whatsapp", { method: "POST" });
      const data = await res.json();
      setTestResult(data.success ? "✅ WhatsApp test message sent!" : `❌ Failed: ${data.error}`);
    } catch {
      setTestResult("❌ Connection error");
    } finally { setTesting(false); }
  };

  const handleSyncPlesk = async () => {
    if (!plesk.host || !plesk.apiKey) {
      setTestResult("❌ Please enter and save Plesk Host and API Key first.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/plesk/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ Plesk sync complete! Synced ${data.totalSynced} items.`);
      } else {
        const error = data.error || "Unknown error";
        if (error.includes("Plesk not configured")) {
          setTestResult("❌ Plesk not configured. Did you click 'Save Changes' at the top?");
        } else {
          setTestResult(`❌ Sync failed: ${error}`);
        }
      }
    } catch (err: any) {
      setTestResult(`❌ Connection error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };



  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "general", label: "General", icon: "⚙️" },
    { key: "email", label: "Email", icon: "📧" },
    { key: "whatsapp", label: "WhatsApp", icon: "💬" },
    { key: "plesk", label: "Plesk Integration", icon: "🔌" },
  ];

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent">Dashboard</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Settings</span>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Configure integrations, notifications, and system preferences</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="loading-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Saving...</> : "💾 Save Changes"}
          </button>
        </div>

        {saved && (
          <div className="alert alert-success mb-6">✅ Settings saved successfully!</div>
        )}

        {testResult && (
          <div className={`alert ${testResult.startsWith("✅") ? "alert-success" : "alert-danger"} mb-6`}>
            {testResult}
            <button onClick={() => setTestResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16 }}>×</button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
          {/* Sidebar nav */}
          <div className="card" style={{ padding: 8, alignSelf: "start" }}>
            {sections.map((sec) => (
              <button
                key={sec.key}
                onClick={() => setActiveSection(sec.key)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: activeSection === sec.key ? "rgba(99,102,241,0.12)" : "transparent",
                  color: activeSection === sec.key ? "var(--brand-primary)" : "var(--text-secondary)",
                  fontWeight: activeSection === sec.key ? 600 : 400,
                  fontSize: 13.5,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  fontFamily: "inherit",
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => { if (activeSection !== sec.key) e.currentTarget.style.background = "var(--bg-card)"; }}
                onMouseLeave={(e) => { if (activeSection !== sec.key) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16 }}>{sec.icon}</span>
                {sec.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div>
            {/* General */}
            {activeSection === "general" && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>⚙️ General Settings</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Basic configuration for your reminder system</p>
                </div>
                <div className="divider" />
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input className="form-input" value={general.businessName} onChange={(e) => setGeneral((g) => ({ ...g, businessName: e.target.value }))} />
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>Used in email and WhatsApp message templates</p>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Timezone</label>
                    <select className="form-select" value={general.timezone} onChange={(e) => setGeneral((g) => ({ ...g, timezone: e.target.value }))}>
                      {["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Dhaka", "Asia/Karachi", "Asia/Kolkata", "Asia/Dubai"].map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Daily Run Time</label>
                    <input className="form-input" type="time" value={general.cronTime} onChange={(e) => setGeneral((g) => ({ ...g, cronTime: e.target.value }))} />
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>Time to run daily reminder check</p>
                  </div>
                </div>
              </div>
            )}

            {/* Email */}
            {activeSection === "email" && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>📧 Email Configuration</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Configure your email provider for sending reminders</p>
                </div>
                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">Email Provider</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["resend", "sendgrid", "smtp"].map((p) => (
                      <button key={p} type="button" onClick={() => setEmail((e) => ({ ...e, provider: p }))}
                        style={{
                          flex: 1, padding: "12px", borderRadius: 10, fontWeight: 600, fontSize: 13,
                          border: email.provider === p ? "1px solid var(--brand-primary)" : "1px solid var(--border-default)",
                          background: email.provider === p ? "rgba(99,102,241,0.1)" : "var(--bg-input)",
                          color: email.provider === p ? "var(--brand-primary)" : "var(--text-secondary)",
                          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                        }}>
                        {p === "resend" ? "🚀 Resend" : p === "sendgrid" ? "📬 SendGrid" : "🔧 SMTP"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">API Key</label>
                  <input className="form-input" type="password" placeholder={`Enter your ${email.provider} API key`} value={email.apiKey} onChange={(e) => setEmail((f) => ({ ...f, apiKey: e.target.value }))} />
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                    {email.provider === "resend" ? "Get your API key from resend.com/api-keys" : email.provider === "sendgrid" ? "Get your API key from sendgrid.com" : "SMTP credentials from your mail server"}
                  </p>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">From Email</label>
                    <input className="form-input" type="email" placeholder="no-reply@yourdomain.com" value={email.fromEmail} onChange={(e) => setEmail((f) => ({ ...f, fromEmail: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">From Name</label>
                    <input className="form-input" placeholder="My Hosting Co" value={email.fromName} onChange={(e) => setEmail((f) => ({ ...f, fromName: e.target.value }))} />
                  </div>
                </div>

                <div className="alert alert-info">
                  ℹ️ Currently using <strong>Resend</strong> configured via <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>RESEND_API_KEY</code> in your .env file.
                </div>
              </div>
            )}

            {/* WhatsApp */}
            {activeSection === "whatsapp" && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>💬 WhatsApp Integration</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Connect Meta WhatsApp Business API to send WhatsApp reminders</p>
                </div>
                <div className="divider" />

                <div className="alert alert-warning">
                  ⚠️ Requires a <strong>Meta Business Account</strong> with WhatsApp Business API access. Clients must have WhatsApp opt-in enabled.
                </div>

                <div className="form-group">
                  <label className="form-label">Access Token</label>
                  <input className="form-input" type="password" placeholder="EAAxxxxxxxx..." value={whatsapp.token} onChange={(e) => setWhatsapp((w) => ({ ...w, token: e.target.value }))} />
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>From Meta Business Manager → WhatsApp → API Setup</p>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Phone Number ID</label>
                    <input className="form-input" placeholder="Your phone number ID" value={whatsapp.phoneNumberId} onChange={(e) => setWhatsapp((w) => ({ ...w, phoneNumberId: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">API Version</label>
                    <select className="form-select" value={whatsapp.apiVersion} onChange={(e) => setWhatsapp((w) => ({ ...w, apiVersion: e.target.value }))}>
                      {["v25.0", "v20.0", "v18.0", "v17.0"].map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <button className="btn btn-secondary" onClick={handleTestWhatsApp} disabled={testing}>
                    {testing ? <><span className="loading-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Testing...</> : "🧪 Send Test Message"}
                  </button>
                </div>

                {/* Setup guide */}
                <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 20, border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>📋 Setup Guide</div>
                  {[
                    "Create a Meta Business Account at business.meta.com",
                    "Add WhatsApp Business product to your app",
                    "Verify your business phone number",
                    "Create and get approval for message templates",
                    "Copy your Access Token and Phone Number ID here",
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(99,102,241,0.15)", color: "var(--brand-primary)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plesk */}
            {activeSection === "plesk" && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>🔌 Plesk Integration</h2>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Connect your Plesk server to automatically sync clients, domains, and SSL certificates</p>
                </div>
                <div className="divider" />

                <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 20 }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ fontSize: 32 }}>🔌</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>What gets synced from Plesk?</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {["🌐 Domains & expiry dates", "🖥️ Hosting subscriptions", "🔒 SSL certificates", "👥 Client accounts"].map((item) => (
                          <div key={item} style={{ fontSize: 13, color: "var(--text-secondary)" }}>{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Plesk Host</label>
                    <input className="form-input" placeholder="plesk.yourdomain.com" value={plesk.host} onChange={(e) => setPlesk((p) => ({ ...p, host: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Port</label>
                    <input className="form-input" placeholder="8443" value={plesk.port} onChange={(e) => setPlesk((p) => ({ ...p, port: e.target.value }))} />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Admin Username</label>
                    <input className="form-input" placeholder="admin" value={plesk.username} onChange={(e) => setPlesk((p) => ({ ...p, username: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Secret Key / Password</label>
                    <input className="form-input" type="password" placeholder="Plesk API secret key" value={plesk.apiKey} onChange={(e) => setPlesk((p) => ({ ...p, apiKey: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-secondary" onClick={handleSyncPlesk} disabled={testing}>
                    {testing ? <><span className="loading-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Syncing...</> : "🔄 Test & Sync Now"}
                  </button>
                  <button className="btn btn-ghost" disabled>📅 Auto-sync: Every 6 hours</button>
                </div>

                <div className="alert alert-info">
                  ℹ️ Plesk sync uses the <strong>XML API</strong> (port 8443). Ensure your firewall allows connections from this server to your Plesk host. cPanel integration will be available in a future update.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
