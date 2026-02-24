"use client";
import { useEffect, useState } from "react";
import type { Service, Client } from "@/types";

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function ExpiryCell({ dateStr }: { dateStr: string }) {
  const days = daysFromNow(dateStr);
  const color = days < 0 ? "var(--color-danger)" : days <= 3 ? "var(--color-danger)" : days <= 7 ? "var(--color-warning)" : days <= 14 ? "var(--color-warning)" : "var(--color-success)";
  const label = days < 0 ? `Expired ${Math.abs(days)}d ago` : days === 0 ? "Today" : `${days}d`;

  return (
    <div>
      <div style={{ fontSize: 13.5, color }}>
        {formatDate(dateStr)}
      </div>
      <div style={{ fontSize: 11.5, color, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ServiceTypeBadge({ type }: { type: string }) {
  const configs: Record<string, { icon: string; cls: string }> = {
    domain: { icon: "🌐", cls: "badge-info" },
    hosting: { icon: "🖥️", cls: "badge-purple" },
    ssl: { icon: "🔒", cls: "badge-warning" },
  };
  const config = configs[type] || { icon: "📦", cls: "badge-muted" };
  return <span className={`badge ${config.cls}`}>{config.icon} {type}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    active: "badge-success",
    expired: "badge-danger",
    renewed: "badge-info",
  };
  return <span className={`badge ${configs[status] || "badge-muted"}`}>{status}</span>;
}

const FILTER_OPTS = ["all", "domain", "hosting", "ssl"] as const;
const STATUS_OPTS = ["all", "active", "expired", "renewed"] as const;
const EXPIRY_OPTS = ["all", "today", "3d", "7d", "14d", "30d"] as const;

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expiryFilter, setExpiryFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    clientId: "",
    domainName: "",
    serviceType: "domain",
    expiryDate: "",
    price: "",
    isPaid: false,
    status: "active",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [svcRes, cliRes] = await Promise.all([
        fetch("/api/services"),
        fetch("/api/clients"),
      ]);
      const [svcData, cliData] = await Promise.all([svcRes.json(), cliRes.json()]);
      setServices(Array.isArray(svcData) ? svcData : []);
      setClients(Array.isArray(cliData) ? cliData : []);
    } catch (e) {
      console.error("Error loading services:", e);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingService(null);
    setForm({ clientId: "", domainName: "", serviceType: "domain", expiryDate: "", price: "", isPaid: false, status: "active" });
    setShowModal(true);
  };

  const openEdit = (svc: Service) => {
    setEditingService(svc);
    setForm({
      clientId: String(svc.clientId),
      domainName: svc.domainName,
      serviceType: svc.serviceType,
      expiryDate: new Date(svc.expiryDate).toISOString().slice(0, 10),
      price: String(svc.price),
      isPaid: svc.isPaid,
      status: svc.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.domainName || !form.expiryDate || (!editingService && !form.clientId)) return;
    setSaving(true);
    try {
      const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
      const method = editingService ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, clientId: Number(form.clientId), price: Number(form.price) || 0 }),
      });
      if (res.ok) { await load(); setShowModal(false); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    await load();
  };

  const getExpiryDayLimit = (filter: string): number | null => {
    const map: Record<string, number> = { today: 0, "3d": 3, "7d": 7, "14d": 14, "30d": 30 };
    return map[filter] ?? null;
  };

  const filtered = services.filter((svc) => {
    const days = daysFromNow(svc.expiryDate);
    const matchSearch =
      svc.domainName.toLowerCase().includes(search.toLowerCase()) ||
      (svc.client?.name || "").toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || svc.serviceType === typeFilter;
    const matchStatus = statusFilter === "all" || svc.status === statusFilter;
    const dayLimit = getExpiryDayLimit(expiryFilter);
    const matchExpiry = expiryFilter === "all" || (dayLimit !== null && days >= 0 && days <= dayLimit);
    return matchSearch && matchType && matchStatus && matchExpiry;
  });

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent">Dashboard</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Services</span>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Services</h1>
            <p className="page-subtitle">{services.length} service{services.length !== 1 ? "s" : ""} tracked</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Service</button>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="search-input-wrap" style={{ minWidth: 240 }}>
            <span className="search-icon">🔍</span>
            <input className="form-input search-input" placeholder="Search domain or client..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {FILTER_OPTS.map((o) => <option key={o} value={o}>{o === "all" ? "All Types" : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUS_OPTS.map((o) => <option key={o} value={o}>{o === "all" ? "All Status" : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
          </select>
          <select className="form-select" style={{ width: "auto" }} value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)}>
            {EXPIRY_OPTS.map((o) => <option key={o} value={o}>{o === "all" ? "Any Expiry" : `Expiring in ${o}`}</option>)}
          </select>
          <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 64 }}>
            <div className="loading-spinner" style={{ margin: "0 auto", width: 32, height: 32, borderWidth: 3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🌐</div>
            <div className="empty-title">{search || typeFilter !== "all" ? "No services found" : "No services yet"}</div>
            <div className="empty-desc">Add a service to start tracking expiry dates</div>
            {!search && <button className="btn btn-primary mt-4" onClick={openAdd}>+ Add Service</button>}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Domain / Service</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Expiry Date</th>
                  <th>Price</th>
                  <th>Paid</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((svc) => (
                  <tr key={svc.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{svc.domainName}</div>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {svc.client?.name || "—"}
                    </td>
                    <td><ServiceTypeBadge type={svc.serviceType} /></td>
                    <td><ExpiryCell dateStr={svc.expiryDate} /></td>
                    <td style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {svc.price > 0 ? `$${svc.price.toFixed(2)}` : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td>
                      {svc.isPaid ? (
                        <span className="badge badge-success">✓ Paid</span>
                      ) : (
                        <span className="badge badge-warning">Unpaid</span>
                      )}
                    </td>
                    <td><StatusBadge status={svc.status} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(svc)} title="Edit">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(svc.id)} title="Delete">🗑️</button>
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
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingService ? "Edit Service" : "Add New Service"}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {!editingService && (
                <div className="form-group">
                  <label className="form-label">Client *</label>
                  <select className="form-select" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}>
                    <option value="">Select a client</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Domain / Service Name *</label>
                <input className="form-input" placeholder="example.com" value={form.domainName} onChange={(e) => setForm((f) => ({ ...f, domainName: e.target.value }))} />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Service Type *</label>
                  <select className="form-select" value={form.serviceType} onChange={(e) => setForm((f) => ({ ...f, serviceType: e.target.value }))}>
                    <option value="domain">🌐 Domain</option>
                    <option value="hosting">🖥️ Hosting</option>
                    <option value="ssl">🔒 SSL Certificate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date *</label>
                  <input className="form-input" type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input className="form-input" type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="renewed">Renewed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 16px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>Mark as Paid</div>
                <label className="toggle">
                  <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm((f) => ({ ...f, isPaid: e.target.checked }))} />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.domainName || !form.expiryDate}>
                {saving ? <><span className="loading-spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Saving...</> : editingService ? "Save Changes" : "Add Service"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">Delete Service</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-danger">⚠️ This will permanently delete this service and all its reminder history.</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
