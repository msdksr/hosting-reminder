
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CLIENT",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      if (form.role === "ADMIN") {
        router.push("/login?message=pending");
      } else {
        // Auto login for clients
        await signIn("credentials", {
          redirect: true,
          email: form.email,
          password: form.password,
          callbackUrl: "/",
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="mesh-gradient" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card"
      >
        <div className="auth-header">
          <div className="auth-logo">🚀</div>
          <h1>Create Account</h1>
          <p>Get started with HostAlert today</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="auth-error"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              placeholder="John Doe" 
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Join as</label>
            <div className="role-selector">
              <button 
                type="button" 
                className={`role-btn ${form.role === "CLIENT" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "CLIENT" })}
              >
                Client
              </button>
              <button 
                type="button" 
                className={`role-btn ${form.role === "ADMIN" ? "active" : ""}`}
                onClick={() => setForm({ ...form, role: "ADMIN" })}
              >
                Admin
              </button>
            </div>
            {form.role === "ADMIN" && (
              <p className="role-hint">Admin accounts require approval from a super admin.</p>
            )}
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
