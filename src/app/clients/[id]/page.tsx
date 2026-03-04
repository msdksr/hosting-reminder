"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { Client, Service, ReminderLog } from "@/types";

interface ClientDetail extends Client {
  services: Service[];
  reminderLogs: ReminderLog[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "history">("services");
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsappOptIn: false,
    notes: "",
    pleskLogin: "",
    pleskPassword: "",
  });
  const [pushingToPlesk, setPushingToPlesk] = useState(false);


  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) throw new Error("Client not found");
      const data = await res.json();
      setClient(data);
      setForm({
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        whatsappOptIn: data.whatsappOptIn,
        notes: data.notes || "",
        pleskLogin: data.pleskLogin || "",
        pleskPassword: data.pleskPassword || "",
      });

    } catch (err) {
      console.error(err);
      router.push("/clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id, router]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchClient();
        setShowEditModal(false);
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to save client"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePushToPlesk = async () => {
    if (!client || pushingToPlesk) return;
    
    if (!confirm(`Are you sure you want to create this client in Plesk? This will generate login credentials.`)) {
      return;
    }

    setPushingToPlesk(true);
    try {
      const res = await fetch(`/api/plesk/clients/${id}`, {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Successfully created in Plesk!\nLogin: ${data.login}\nPassword: ${data.tempPassword}`);
        await fetchClient();
      } else {
        alert(`Error pushing to Plesk: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Connection error: ${err.message}`);
    } finally {
      setPushingToPlesk(false);
    }
  };


  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
      </div>
    );
  }

  if (!client) return null;

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent" style={{ cursor: "pointer" }} onClick={() => router.push("/clients")}>Clients</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{client.name}</span>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-6">
            <div 
              className="avatar" 
              style={{ 
                width: 80, 
                height: 80, 
                fontSize: 28, 
                background: "linear-gradient(135deg, var(--color-primary), var(--color-purple))",
                boxShadow: "0 10px 25px rgba(99, 102, 241, 0.3)"
              }}
            >
              {getInitials(client.name)}
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>{client.name}</h1>
              <div className="flex gap-4 items-center">
                <span className="text-secondary" style={{ fontSize: 14 }}>📧 {client.email}</span>
                {client.phone && <span className="text-secondary" style={{ fontSize: 14 }}>📱 {client.phone}</span>}
                <span className={`badge ${client.whatsappOptIn ? "badge-success" : "badge-muted"}`}>
                  {client.whatsappOptIn ? "WhatsApp Enabled" : "WhatsApp Disabled"}
                </span>
                {client.pleskId && (
                  <span className="badge badge-purple" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
                    🔌 Plesk Connected
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={() => router.push("/clients")}>Back to List</button>
            
            {!client.pleskId && client.services.some(s => s.serviceType === "hosting") && (
              <button 
                className="btn btn-primary" 
                onClick={handlePushToPlesk} 
                disabled={pushingToPlesk}
                style={{ background: "linear-gradient(to right, #6366f1, #a855f7)", border: "none" }}
              >
                {pushingToPlesk ? "Creating..." : "🔌 Create in Plesk"}
              </button>
            )}
            
            <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>Edit Profile</button>
          </div>
        </div>


        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Stats & Meta */}
          <div className="col-span-12 lg:col-span-4">
            <div className="card mb-6">
              <h3 className="card-title" style={{ fontSize: 16, marginBottom: 20 }}>Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-subtle">
                  <span className="text-secondary text-sm">Client Since</span>
                  <span className="font-medium text-sm">{new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-subtle">
                  <span className="text-secondary text-sm">Total Services</span>
                  <span className="badge badge-info">{client.services?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-secondary text-sm">Status</span>
                  <span className="badge badge-success">Active</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>Notes</h3>
              <p className="text-secondary text-sm leading-relaxed">
                {client.notes || "No additional notes for this client."}
              </p>
            </div>

            {client.pleskLogin && (
              <div className="card mt-6" style={{ background: "rgba(99, 102, 241, 0.05)", borderColor: "rgba(99, 102, 241, 0.2)" }}>
                <h3 className="card-title" style={{ fontSize: 16, marginBottom: 16, color: "var(--brand-primary)" }}>Plesk Credentials</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary text-xs uppercase font-bold tracking-wider">Username</span>
                    <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>{client.pleskLogin}</code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary text-xs uppercase font-bold tracking-wider">Password</span>
                    <code style={{ background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>{client.pleskPassword}</code>
                  </div>
                </div>
                <p className="text-muted text-xs mt-4">
                  These can be shared with the client for their CP access.
                </p>
              </div>
            )}
          </div>


          {/* Right Column: Dynamic Tabs */}
          <div className="col-span-12 lg:col-span-8">
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
                <button 
                  onClick={() => setActiveTab("services")}
                  style={{ 
                    padding: "16px 24px", 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: activeTab === "services" ? "var(--color-primary)" : "var(--text-muted)",
                    borderBottom: activeTab === "services" ? "2px solid var(--color-primary)" : "2px solid transparent",
                    background: "none",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Services ({client.services?.length || 0})
                </button>
                <button 
                  onClick={() => setActiveTab("history")}
                  style={{ 
                    padding: "16px 24px", 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: activeTab === "history" ? "var(--color-primary)" : "var(--text-muted)",
                    borderBottom: activeTab === "history" ? "2px solid var(--color-primary)" : "2px solid transparent",
                    background: "none",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Reminder History
                </button>
              </div>

              <div style={{ padding: 24 }}>
                {activeTab === "services" ? (
                  client.services.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 48 }}>
                      <p className="text-secondary">No services assigned to this client yet.</p>
                      <button className="btn btn-secondary mt-4" onClick={() => router.push("/services")}>Add Service</button>
                    </div>
                  ) : (
                    <div className="table-wrapper" style={{ border: "none", boxShadow: "none" }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Domain / Service</th>
                            <th>Type</th>
                            <th>Expiry</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {client.services.map(svc => (
                            <tr key={svc.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/services/${svc.id}`)}>
                              <td><div style={{ fontWeight: 600 }}>{svc.domainName}</div></td>
                              <td><span className="badge badge-purple">{svc.serviceType}</span></td>
                              <td>{new Date(svc.expiryDate).toLocaleDateString()}</td>
                              <td><span className={`badge ${svc.status === "active" ? "badge-success" : "badge-danger"}`}>{svc.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  client.reminderLogs.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 48 }}>
                      <p className="text-secondary">No reminder logs found for this client.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {client.reminderLogs.map(log => (
                        <div key={log.id} style={{ 
                          padding: 16, 
                          borderRadius: 12, 
                          background: "var(--bg-elevated)", 
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{log.channel.toUpperCase()} Reminder</div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sent at: {formatDate(log.sentAt)}</div>
                          </div>

                          <span className={`badge ${log.status === "success" ? "badge-success" : "badge-danger"}`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Client Profile</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)", borderRadius: 10, padding: 16 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>WhatsApp Reminders</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Opt-in for automated messages</div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.whatsappOptIn}
                    onChange={(e) => setForm(f => ({ ...f, whatsappOptIn: e.target.checked }))}
                  />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Internal Notes</label>
                <textarea
                  className="form-textarea"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ minHeight: 80 }}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 8, paddingTop: 16 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 16, textTransform: "uppercase" }}>Plesk Access (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group">
                    <label className="form-label">Plesk Username</label>
                    <input
                      className="form-input"
                      value={form.pleskLogin}
                      onChange={(e) => setForm(f => ({ ...f, pleskLogin: e.target.value }))}
                      placeholder="e.g. jdoe123"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plesk Password</label>
                    <input
                      className="form-input"
                      value={form.pleskPassword}
                      onChange={(e) => setForm(f => ({ ...f, pleskPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`

        .space-y-4 > * + * { margin-top: 1rem; }
        .grid { display: grid; }
        .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
        .col-span-12 { grid-column: span 12 / span 12; }
        .lg\\:col-span-4 { @media (min-width: 1024px) { grid-column: span 4 / span 4; } }
        .lg\\:col-span-8 { @media (min-width: 1024px) { grid-column: span 8 / span 8; } }
        .gap-6 { gap: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-4 { margin-top: 1rem; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .gap-3 { gap: 0.75rem; }
        .text-secondary { color: var(--text-secondary); }
        .text-sm { fontSize: 0.875rem; }
        .font-medium { fontWeight: 500; }
        .font-semibold { fontWeight: 600; }
        .leading-relaxed { line-height: 1.625; }
      `}</style>
    </div>
  );
}
