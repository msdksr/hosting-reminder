"use client";
import { useEffect, useState } from "react";

type Client = {
  id: number;
  name: string;
  email: string;
  phone?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then(res => res.json())
      .then(data => setClients(data));
  }, []);

  const addClient = async () => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const newClient = await res.json();
    setClients(prev => [...prev, newClient]);
    setName("");
    setEmail("");
  };

  return (
    <div>
      <h1>Clients</h1>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <button onClick={addClient}>Add Client</button>

      <ul>
        {clients.map(c => (
          <li key={c.id}>
            {c.name} ({c.email})
          </li>
        ))}
      </ul>
    </div>
  );
}