import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "./encryption";


// Ignore SSL certificate issues globally for Plesk API (Equivalent to curl -k)
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export async function getPleskConfig() {
  const config = await (prisma as any).pleskConfig.findFirst();

  if (config && config.apiKey) {
    // Decrypt API key for internal use
    try {
      if (config.apiKey.includes(':')) { // Check if it looks encrypted
        config.apiKey = decrypt(config.apiKey);
      }
    } catch (e) {
      console.warn("Could not decrypt API key, using as is");
    }
  }
  return config;
}

export async function savePleskConfig(data: {
  host: string;
  port: number;
  username: string;
  apiKey: string;
  isActive?: boolean;
}) {
  const cleanHost = data.host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  
  const existing = await prisma.pleskConfig.findFirst();
  let apiKeyToSave = data.apiKey;

  // Check if we are trying to save a masked key (UI didn't change it)
  if (apiKeyToSave.startsWith("********") && existing) {
    apiKeyToSave = existing.apiKey; // Use existing encrypted key
  } else {
    // Encrypt the NEW API key before saving
    apiKeyToSave = encrypt(data.apiKey);
  }
  
  return await (prisma as any).pleskConfig.upsert({
    where: { id: 1 },
    update: { ...data, host: cleanHost, apiKey: apiKeyToSave, port: Number(data.port) },
    create: { id: 1, ...data, host: cleanHost, apiKey: apiKeyToSave, port: Number(data.port) },
  });
}



function getSafeBaseUrl(host: string, port: number) {
  const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${cleanHost}:${port}/api/v2`;
}

async function pleskFetch(endpoint: string, options: RequestInit = {}) {
  const config = await getPleskConfig();
  if (!config || !config.host) throw new Error("Plesk not configured");

  const baseUrl = getSafeBaseUrl(config.host, config.port);
  console.log(`Plesk Fetch: ${baseUrl}${endpoint}`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...((options.headers as any) || {}),
  };

  // TOKEN BASED AUTHENTICATION (X-API-Key)
  // This is the most secure way for Plesk API V2
  headers["X-API-Key"] = config.apiKey;
  
  // If user provided a username, we still use Basic Auth as fallback 
  // but X-API-Key takes precedence in Plesk V2
  const authHeader = Buffer.from(`${config.username}:${config.apiKey}`).toString('base64');
  headers["Authorization"] = `Basic ${authHeader}`;


  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Plesk API error: ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorMsg += ` - ${errorJson.message || JSON.stringify(errorJson)}`;
      } catch {
        const errorText = await response.text();
        errorMsg += ` - ${errorText.substring(0, 200)}`;
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (err: any) {
    console.error("Plesk Fetch Error Detail:", {
      message: err.message,
      cause: err.cause,
      stack: err.stack,
      baseUrl,
      endpoint
    });
    
    if (err.message.includes("Plesk API error")) throw err;
    
    let detail = err.message;
    if (err.cause) {
      detail += ` (Cause: ${err.cause.message || err.cause})`;
    }
    
    throw new Error(`Fetch failed: ${detail}. This is likely a network or SSL issue between your server and Plesk.`);
  }
}



export interface PleskClient {
  id: number;
  name: string;
  email: string;
  login: string;
  company?: string;
  phone?: string;
}

export interface PleskDomain {
  id: number;
  name: string;
  ascii_name: string;
  base_domain_id: number;
  client_id: number;
  created: string;
  guid: string;
}

export async function fetchPleskClients(): Promise<PleskClient[]> {
  return await pleskFetch("/clients");
}

export async function fetchPleskDomains(): Promise<PleskDomain[]> {
  return await pleskFetch("/domains");
}

export async function createPleskClient(data: {
  name: string;
  email: string;
  login: string;
  password?: string;
  type?: "customer" | "reseller" | "admin";
  company?: string;
  phone?: string;
}) {
  return await pleskFetch("/clients", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      type: data.type || "customer",
      status: 0, // Active by default
    }),
  });
}


export async function createPleskDomain(data: {
  name: string;
  client_id: number;
  hosting_type?: "none" | "virtual" | "std_fwd" | "frm_fwd";
}) {
  const hType = data.hosting_type || "virtual";
  const body: any = {
    name: data.name,
    owner_client: { id: data.client_id },
    hosting_type: hType,
  };

  if (hType === "virtual") {
    // Generate simple FTP credentials if none provided
    // login must be 1-16 chars, lowercase
    const ftpLogin = data.name.split('.')[0].substring(0, 12).toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(10 + Math.random() * 90);
    const ftpPassword = "Pass" + Math.random().toString(36).slice(-8) + "1!";
    
    body.hosting_settings = {
      ftp_login: ftpLogin,
      ftp_password: ftpPassword,
    };
  }

  return await pleskFetch("/domains", {
    method: "POST",
    body: JSON.stringify(body),
  });
}


