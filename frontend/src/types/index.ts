export type PartyStatus = "waiting" | "notified" | "seated" | "canceled" | "no_show";

export interface Party {
  id: string;
  name: string;
  party_size: number;
  phone: string | null;
  email: string | null;
  status: PartyStatus;
  position: number | null;
  estimated_wait: number | null;
  notes: string | null;
  urgent: boolean;
  created_at: string;
  updated_at: string;
  notified_at: string | null;
  seated_at: string | null;
  canceled_at: string | null;
  token: string | null;
}

export type WaitlistEntry = Party;

export interface Table {
  id: string;
  capacity: number;
  label: string;
  is_occupied: boolean;
  occupied_by_party_id: string | null;
  created_at: string;
}

export interface ActionLog {
  id: string;
  party_id: string;
  action: string;
  previous_state: string | null;
  created_by: string;
  created_at: string;
}

export type NotificationChannel = "sms" | "email";

export interface NotificationLog {
  id: string;
  party_id: string;
  channel: NotificationChannel;
  status: string;
  sent_at: string;
}

export interface ManagerSettings {
  key: string;
  value: string;
}

export interface DailyReport {
  date: string;
  total_parties: number;
  average_wait_minutes: number;
  no_show_rate: number;
  seat_utilization: number;
}

export interface CreatePartyRequest {
  name: string;
  party_size: number;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  urgent?: boolean;
}

export interface UpdatePartyRequest {
  name?: string;
  party_size?: number;
  phone?: string | null;
  email?: string | null;
  status?: PartyStatus;
  position?: number | null;
  estimated_wait?: number | null;
  notes?: string | null;
  urgent?: boolean;
}

export interface CreateTableRequest {
  capacity: number;
  label: string;
}

export interface UpdateTableRequest {
  capacity?: number;
  label?: string;
  is_occupied?: boolean;
  occupied_by_party_id?: string | null;
}

export interface PinVerifyRequest {
  pin: string;
}

export interface PinChangeRequest {
  current_pin: string;
  new_pin: string;
}

export interface DailyReportResponse {
  date: string;
  total_parties: number;
  average_wait_minutes: number;
  no_show_rate: number;
  seat_utilization: number;
}
