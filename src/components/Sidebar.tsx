"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Role } from "@prisma/client";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const isAdmin = user?.role === Role.ADMIN || user?.role === Role.SUPERADMIN;
  const isSuperAdmin = user?.role === Role.SUPERADMIN;

  const navItems = [
    {
      section: "Main",
      items: [
        { href: "/", label: isAdmin ? "Overview" : "My Dashboard", icon: "⊞", hide: false },
        { href: "/clients", label: "Clients", icon: "👥", hide: !isAdmin },
        { href: "/services", label: isAdmin ? "Services" : "My Services", icon: "🌐", hide: false },
      ],
    },
    {
      section: "Automation",
      items: [
        { href: "/reminders", label: "Reminders", icon: "🔔", hide: !isAdmin },
        { href: "/logs", label: "Activity Logs", icon: "📋", hide: !isAdmin },
      ],
    },
    {
      section: "Configuration",
      items: [
        { href: "/admin/approvals", label: "Approvals", icon: "🛡️", hide: !isSuperAdmin },
        { href: "/settings", label: "Settings", icon: "⚙️", hide: false },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="sidebar-logo-icon">🚀</div>
          <div>
            <div className="sidebar-logo-text">HostAlert</div>
            <span className="sidebar-logo-sub">Reminder Automation</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((section) => {
          const visibleItems = section.items.filter(i => !i.hide);
          if (visibleItems.length === 0) return null;
          
          return (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.image ? (
              <img src={user.image} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%" }} />
            ) : (
              (user?.name?.substring(0, 2) || "U").toUpperCase()
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || "User"}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button 
            onClick={() => signOut()}
            style={{ 
              background: "none", 
              border: "none", 
              cursor: "pointer", 
              color: "var(--text-muted)",
              fontSize: 16,
              padding: 4
            }}
            title="Sign Out"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
