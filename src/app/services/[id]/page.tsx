"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { Service, Client } from "@/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function daysFromNow(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    domainName: "",
    serviceType: "",
    expiryDate: "",
    price: 0,
    isPaid: false,
    status: "",
  });

  const fetchService = async () => {
    try {
      const res = await fetch(`/api/services/${id}`);
      if (!res.ok) throw new Error("Service not found");
      const data = await res.json();
      setService(data);
      setForm({
        domainName: data.domainName,
        serviceType: data.serviceType,
        expiryDate: new Date(data.expiryDate).toISOString().slice(0, 10),
        price: data.price,
        isPaid: data.isPaid,
        status: data.status,
      });
    } catch (err) {
      console.error(err);
      router.push("/services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchService();
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        await fetchService();
        setShowEditModal(false);
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "Failed to save service"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
      </div>
    );
  }

  if (!service) return null;

  const daysLeft = daysFromNow(service.expiryDate);
  const isExpired = daysLeft < 0;

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent" style={{ cursor: "pointer" }} onClick={() => router.push("/services")}>Services</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{service.domainName}</span>
        </div>
      </div>

      <div className="page-wrapper" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{service.domainName}</h1>
            <p className="text-secondary text-sm">Service unique ID: #{service.id}</p>
          </div>
          <div className="flex gap-3">
             <button className="btn btn-secondary" onClick={() => router.push("/services")}>Back</button>
             <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>Edit Service</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card" style={{ 
            background: isExpired ? "rgba(239, 68, 68, 0.05)" : "rgba(16, 185, 129, 0.05)",
            borderColor: isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)"
          }}>
            <h3 className="card-title text-sm" style={{ marginBottom: 16 }}>Expiry Status</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: isExpired ? "var(--color-danger)" : "var(--color-success)" }}>
              {isExpired ? "Expired" : "Active"}
            </div>
            <p className="text-secondary mt-2">
              {isExpired 
                ? `Expired ${Math.abs(daysLeft)} days ago` 
                : `${daysLeft} days remaining until expiration`
              }
            </p>
            <div style={{ marginTop: 24, padding: "8px 16px", borderRadius: 8, background: "rgba(0,0,0,0.03)", display: "inline-block", fontSize: 13, fontWeight: 600 }}>
              🗓️ {formatDate(service.expiryDate)}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title text-sm" style={{ marginBottom: 16 }}>Financial Info</h3>
            <div style={{ fontSize: 32, fontWeight: 700 }}>
              ${service.price?.toFixed(2) || "0.00"}
            </div>
            <p className="text-secondary mt-2">Renewal price for this service</p>
            <div style={{ marginTop: 24 }}>
              <span className={`badge ${service.isPaid ? "badge-success" : "badge-warning"}`} style={{ padding: "8px 12px", fontSize: 13 }}>
                {service.isPaid ? "✓ Payment Confirmed" : "⚠ Pending Payment"}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ fontSize: 16, marginBottom: 20 }}>Service Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-subtle">
              <span className="text-secondary">Service Type</span>
              <span className="badge badge-purple" style={{ textTransform: "capitalize" }}>{service.serviceType}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-subtle">
              <span className="text-secondary">Assigned Client</span>
              <span 
                className="font-medium" 
                style={{ color: "var(--color-primary)", cursor: "pointer" }}
                onClick={() => router.push(`/clients/${service.clientId}`)}
              >
                {service.client?.name || "Unknown Client"}
              </span>
            </div>
            <div className="flex justify-between py-3 border-b border-subtle">
              <span className="text-secondary">Client Email</span>
              <span>{service.client?.email || "—"}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-secondary">Last Sync</span>
              <span>{new Date(service.updatedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
            <button className="btn btn-secondary flex-1" style={{ padding: 16 }}>Generate Invoice</button>
            <button className="btn btn-primary flex-1" style={{ padding: 16 }}>Send Manual Reminder</button>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Edit Service Details</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Domain Name *</label>
                <input
                  className="form-input"
                  value={form.domainName}
                  onChange={(e) => setForm(f => ({ ...f, domainName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Service Type</label>
                  <select 
                    className="form-select"
                    value={form.serviceType}
                    onChange={(e) => setForm(f => ({ ...f, serviceType: e.target.value }))}
                  >
                    <option value="domain">Domain</option>
                    <option value="hosting">Hosting</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="renewed">Renewed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-elevated)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>Mark as Paid</div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.isPaid}
                    onChange={(e) => setForm(f => ({ ...f, isPaid: e.target.checked }))}
                  />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
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
        .space-y-4 > * + * { margin-top: 0.5rem; }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .md\\:grid-cols-2 { @media (min-width: 768px) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .gap-6 { gap: 1.5rem; }
        .gap-4 { gap: 1rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mt-8 { margin-top: 2rem; }
        .mt-2 { margin-top: 0.5rem; }
        .flex { display: flex; }
        .flex-1 { flex: 1; }
        .justify-between { justify-content: space-between; }
        .items-center { align-items: center; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .text-secondary { color: var(--text-secondary); }
        .text-sm { fontSize: 0.875rem; }
        .font-medium { fontWeight: 500; }
      `}</style>
    </div>
  );
}
