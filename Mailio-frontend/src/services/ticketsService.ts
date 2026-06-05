import { api } from "./api";

export type TicketType =
  | "PAYMENT" | "CREDITS" | "TECHNICAL_ISSUE" | "ACCOUNT" | "BILLING"
  | "FEATURE_REQUEST" | "ENTERPRISE_SUPPORT" | "GENERAL";

export type TicketStatus =
  | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "WAITING_FOR_ADMIN"
  | "RESOLVED" | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketSenderRole =
  | "USER" | "ENTERPRISE_USER" | "ENTERPRISE_ADMIN" | "SUPER_ADMIN" | "ADMIN";

export interface Ticket {
  id:               string;
  ticketNumber:     string;
  title:            string;
  subject:          string;
  type:             TicketType;
  content:          string;
  status:           TicketStatus;
  priority:         TicketPriority;
  createdByUserId:  string;
  enterpriseId:     string | null;
  assignedAdminId:  string | null;
  lastReplyAt:      string | null;
  lastMessageAt:    string | null;
  lastMessageByRole: TicketSenderRole | null;
  adminUnreadCount: number;
  userUnreadCount:  number;
  resolvedAt:       string | null;
  closedAt:         string | null;
  createdAt:        string;
  updatedAt:        string;
}

export interface TicketMessage {
  id:         string;
  ticketId:   string;
  senderId:   string;
  senderRole: TicketSenderRole;
  message:    string;
  createdAt:  string;
}

export interface TicketWithThread {
  ticket: Ticket;
  messages: TicketMessage[];
}

export interface CreateTicketPayload {
  title:   string;
  subject: string;
  type:    TicketType;
  content: string;
}

export interface MyTicketsQuery {
  status?: TicketStatus;
  type?:   TicketType;
  search?: string;
  page?:   number;
  limit?:  number;
}

export interface PaginatedTickets {
  data:  Ticket[];
  total: number;
  page:  number;
  limit: number;
}

export const ticketsService = {
  create: async (payload: CreateTicketPayload): Promise<Ticket> => {
    const { data } = await api.post<Ticket>("/tickets", payload);
    return data;
  },

  listMine: async (params: MyTicketsQuery = {}): Promise<PaginatedTickets> => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.type)   qs.set("type",   params.type);
    if (params.search) qs.set("search", params.search);
    if (params.page)   qs.set("page",   String(params.page));
    if (params.limit)  qs.set("limit",  String(params.limit));
    const q = qs.toString();
    const { data } = await api.get<PaginatedTickets>(
      `/tickets/my${q ? `?${q}` : ""}`,
    );
    return data;
  },

  detail: async (id: string): Promise<TicketWithThread> => {
    const { data } = await api.get<TicketWithThread>(`/tickets/${id}`);
    return data;
  },

  reply: async (id: string, message: string): Promise<TicketMessage> => {
    const { data } = await api.post<TicketMessage>(`/tickets/${id}/reply`, { message });
    return data;
  },
};
