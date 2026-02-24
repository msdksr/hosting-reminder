export type ServiceType = "domain" | "hosting" | "ssl";
export type Channel = "email" | "whatsapp";
export type ReminderStatus = "sent" | "failed" | "skipped";
export type ServiceStatus = "active" | "expired" | "renewed";

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  whatsappOptIn: boolean;
  notes?: string | null;
  services?: Service[];
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: number;
  clientId: number;
  client?: Client;
  domainName: string;
  serviceType: ServiceType | string;
  expiryDate: string;
  price: number;
  isPaid: boolean;
  status: ServiceStatus | string;
  reminders?: Reminder[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: number;
  serviceId: number;
  service?: Service;
  stage: number;
  sentAt: string;
  method: string;
}

export interface ReminderLog {
  id: number;
  serviceId: number;
  service?: Service;
  clientId: number;
  client?: Client;
  channel: Channel | string;
  daysLeft: number;
  status: ReminderStatus | string;
  errorMessage?: string | null;
  sentAt: string;
}

export interface ReminderSchedule {
  id: number;
  name: string;
  daysBefore: number[];
  channels: string[];
  serviceTypes: string[];
  isActive: boolean;
  emailTemplate?: string | null;
  whatsappTemplate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: number;
  source: string;
  status: string;
  totalSynced: number;
  totalErrors: number;
  errorDetails?: string | null;
  startedAt: string;
  finishedAt?: string | null;
}

export interface DashboardStats {
  totalClients: number;
  totalServices: number;
  expiringThisWeek: number;
  remindersSentToday: number;
  failedReminders: number;
  upcomingExpirations: Service[];
  recentLogs: ReminderLog[];
}
