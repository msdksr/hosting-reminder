
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";

export default function ApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role !== Role.SUPERADMIN) {
      // router.push("/");
    }
    loadPending();
  }, [session]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-approvals");
      const data = await res.json();
      setPendingUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/approve-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) loadPending();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="top-nav">
        <div className="top-nav-breadcrumb">
          <span className="breadcrumb-parent">Admin</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">Approvals</span>
        </div>
      </div>

      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <h1 className="page-title">Pending Approvals</h1>
            <p className="page-subtitle">Approve new admin accounts to grant them access</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner" />
        ) : pendingUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <div className="empty-title">All caught up!</div>
            <div className="empty-desc">No admin accounts are pending approval.</div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Requested Role</th>
                  <th>Signup Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge badge-purple">{u.role}</span>
                    </td>
                    <td style={{ color: "var(--text-secondary)" }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => handleApprove(u.id)}>Approve</button>
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
