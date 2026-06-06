import { apiService } from "./api";

export type TicketType =
  | "PAYMENT" | "CREDITS" | "TECHNICAL_ISSUE" | "ACCOUNT" | "BILLING"
  | "FEATURE_REQUEST" | "ENTERPRISE_SUPPORT" | "GENERAL";

export type TicketStatus =
  | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "WAITING_FOR_ADMIN"
  | "RESOLVED" | "CLOSED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketCreatorRole = "USER" | "ENTERPRISE_USER" | "ENTERPRISE_ADMIN";

export type TicketSenderRole =
  | "USER" | "ENTERPRISE_USER" | "ENTERPRISE_ADMIN" | "SUPER_ADMIN" | "ADMIN";

export type AdminTicketSort =
  | "smart" | "latest" | "oldest" | "priority" | "unread" | "new";

export interface AdminTicketRow {
  id:                 string;
  ticketNumber:       string;
  title:              string;
  subject:            string;
  type:               TicketType;
  status:             TicketStatus;
  priority:           TicketPriority;
  userRole:           TicketCreatorRole;
  enterpriseId:       string | null;
  lastReplyAt:        string | null;
  lastMessageAt:      string | null;
  lastMessageByRole:  TicketSenderRole | null;
  adminUnreadCount:   number;
  userUnreadCount:    number;
  firstAdminOpenedAt: string | null;
  lastAdminViewedAt:  string | null;
  createdAt:          string;
  updatedAt:          string;
  requesterDisplayName: string;
  requesterEmail:       string;
  requesterRole:        TicketCreatorRole;
  enterpriseName:       string | null;
  isUnreadForAdmin:     boolean;
  isNewForAdmin:        boolean;
  needsAdminReply:      boolean;
  user:        { id: string | null; name: string; email: string; plan: string | null };
  enterprise:  { name: string } | null;
}

export interface TicketMessage {
  id:          string;
  ticketId:    string;
  senderId:    string;
  senderRole:  TicketSenderRole;
  senderName:  string;
  senderEmail: string | null;
  message:     string;
  createdAt:   string;
}

export interface AdminTicketDetail {
  ticket: {
    id:                  string;
    ticketNumber:        string;
    title:               string;
    subject:             string;
    type:                TicketType;
    content:             string;
    status:              TicketStatus;
    priority:            TicketPriority;
    userRole:            TicketCreatorRole;
    enterpriseId:        string | null;
    lastReplyAt:         string | null;
    lastMessageAt:       string | null;
    lastMessageByRole:   TicketSenderRole | null;
    adminUnreadCount:    number;
    userUnreadCount:     number;
    firstAdminOpenedAt:  string | null;
    lastAdminViewedAt:   string | null;
    resolvedAt:          string | null;
    closedAt:            string | null;
    createdAt:           string;
    updatedAt:           string;
  };
  creator: {
    id: string; name: string; email: string; plan: string;
    role: string; enterpriseId: string | null; createdAt: string;
    deleted?: boolean;
  } | null;
  enterprise: { id: string; name: string; creditBalance: string } | null;
  messages: TicketMessage[];
  attachments: TicketAttachment[];
}

export interface TicketAttachment {
  id:           string;
  fileName:     string;
  originalName: string;
  mimeType:     string;
  fileType:     "image" | "video";
  sizeBytes:    number;
  viewUrl:      string;
  downloadUrl:  string;
  createdAt:    string;
}

export interface TicketStats {
  open:            number;
  needsReply:      number;
  inProgress:      number;
  waitingForUser:  number;
  /** alias for needsReply, kept for backward compat */
  waitingForAdmin: number;
  resolved:        number;
  closed:          number;
  urgentHigh:      number;
  unread:          number;
}

export interface ListFilters {
  status?:         TicketStatus;
  priority?:       TicketPriority;
  type?:           TicketType;
  userType?:       TicketCreatorRole;
  enterpriseOnly?: boolean;
  unreadOnly?:     boolean;
  enterpriseId?:   string;
  search?:         string;
  dateFrom?:       string;
  dateTo?:         string;
  sortBy?:         AdminTicketSort;
  page?:           number;
  limit?:          number;
}

function qs(filters: ListFilters) {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== false) {
      p.set(k, String(v));
    }
  });
  return p.toString();
}

export const adminTicketsService = {
  list: (filters: ListFilters = {}) =>
    apiService.get<{ data: AdminTicketRow[]; page: number; limit: number; total: number }>(
      `/admin/tickets?${qs(filters)}`,
    ),

  stats: () => apiService.get<TicketStats>("/admin/tickets/stats"),

  detail: (id: string) => apiService.get<AdminTicketDetail>(`/admin/tickets/${id}`),

  reply: (id: string, message: string, attachments: File[] = []) => {
    if (attachments.length === 0) {
      return apiService.post<TicketMessage>(`/admin/tickets/${id}/reply`, {
        message,
      });
    }
    const form = new FormData();
    form.append("message", message);
    attachments.forEach((f) => form.append("attachments", f));
    return apiService.post<TicketMessage>(`/admin/tickets/${id}/reply`, form);
  },

  updateStatus: (id: string, status: TicketStatus) =>
    apiService.patch<AdminTicketRow>(`/admin/tickets/${id}/status`, { status }),

  updatePriority: (id: string, priority: TicketPriority) =>
    apiService.patch<AdminTicketRow>(`/admin/tickets/${id}/priority`, { priority }),

  remove: (id: string) =>
    apiService.delete<{ success: boolean }>(`/admin/tickets/${id}`),

  removeAttachment: (ticketId: string, attachmentId: string) =>
    apiService.delete<{ success: boolean }>(
      `/admin/tickets/${ticketId}/attachments/${attachmentId}`,
    ),
};
