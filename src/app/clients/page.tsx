"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

const AVATAR_COLORS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#06b6d4,#0ea5e9)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
];

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsappOptIn: false,
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading clients:", e);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditingClient(null);
    setForm({ name: "", email: "", phone: "", whatsappOptIn: false, notes: "" });
    setShowModal(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      whatsappOptIn: client.whatsappOptIn,
      notes: client.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = editingClient ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await load();
        closeModal();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to save client"}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  };

  const handlePushToPlesk = async (id: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/plesk/clients/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("✅ Client successfully created in Plesk!");
      } else {
        alert(`❌ Failed to create in Plesk: ${data.error}`);
      }
    } catch (e: any) {
      alert(`❌ Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").includes(search)
  );


  return (
    <div>
      {/* Top Nav */}
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent">Dashboard</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Clients</span>
        </div>
      </div>

      <div className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Clients</h1>
            <p className="page-subtitle">
              {clients.length} client{clients.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Client
          </button>
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="form-input search-input"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <div className="loading-spinner" style={{ margin: "0 auto", width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-title">{search ? "No clients found" : "No clients yet"}</div>
            <div className="empty-desc">
              {search ? "Try a different search term" : "Add your first client to get started"}
            </div>
            {!search && (
              <button className="btn btn-primary mt-4" onClick={openAdd}>
                + Add Client
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Services</th>
                  <th>WhatsApp</th>
                  <th>Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr 
                    key={client.id} 
                    onClick={() => router.push(`/clients/${client.id}`)}
                    style={{ cursor: "pointer" }}
                    className="hover-row"
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          className="avatar"
                          style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                        >
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{client.name}</div>
                          {client.notes && (
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                              {client.notes.slice(0, 40)}{client.notes.length > 40 ? "…" : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{client.email}</div>
                      {client.phone && (
                        <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{client.phone}</div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">
                        {(client.services?.length ?? 0)} service{(client.services?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td>
                      {client.whatsappOptIn ? (
                        <span className="badge badge-success">✓ Enabled</span>
                      ) : (
                        <span className="badge badge-muted">× Off</span>
                      )}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {formatDate(client.createdAt)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handlePushToPlesk(client.id)}
                          title="Create in Plesk"
                          disabled={saving}
                        >
                          🔌
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(client)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteConfirm(client.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  placeholder="John Smith"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (with country code)</label>
                <input
                  className="form-input"
                  placeholder="+1234567890"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-elevated)",
                  borderRadius: 10,
                  padding: "14px 16px",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>
                    💬 WhatsApp Reminders
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    Client has opted in to receive WhatsApp messages
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.whatsappOptIn}
                    onChange={(e) => setForm((f) => ({ ...f, whatsappOptIn: e.target.checked }))}
                  />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  placeholder="Optional notes about this client..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  style={{ minHeight: 80 }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.email.trim()}
              >
                {saving ? (
                  <>
                    <span className="loading-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
                    Saving...
                  </>
                ) : editingClient ? (
                  "Save Changes"
                ) : (
                  "Add Client"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Client</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">
                ⚠️ This will permanently delete the client and all their associated services and reminders.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}