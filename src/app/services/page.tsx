"use client";
import { useEffect, useState } from "react";

type Service = {
  id: number;
  domainName: string;
  serviceType: string;
  expiryDate: string;
  price: number;
  client: { id: number; name: string };
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [domainName, setDomainName] = useState("");
  const [serviceType, setServiceType] = useState("hosting");
  const [clientId, setClientId] = useState<number | null>(null);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [expiryDate, setExpiryDate] = useState("");

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then(setClients);

    fetch("/api/services")
      .then((res) => res.json())
      .then(setServices);
  }, []);

  const addService = async () => {
    if (!clientId || !domainName) return;

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        domainName,
        serviceType,
        expiryDate: new Date(expiryDate),
      }),
    });
    const newService = await res.json();
    setServices((prev) => [...prev, newService]);
    setDomainName("");
  };

  return (
    <div>
      <h1>Services</h1>

      <select
        onChange={(e) => setClientId(Number(e.target.value))}
        value={clientId || ""}
      >
        <option value="">Select Client</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        placeholder="Domain Name"
        value={domainName}
        onChange={(e) => setDomainName(e.target.value)}
      />
      <select
        value={serviceType}
        onChange={(e) => setServiceType(e.target.value)}
      >
        <option value="hosting">Hosting</option>
        <option value="domain">Domain</option>
      </select>
      <input
        type="date"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
      />

      <button onClick={addService}>Add Service</button>

      <ul>
        {services.map((s) => (
          <li key={s.id}>
            {s.domainName} ({s.serviceType}) - Client: {s.client.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
