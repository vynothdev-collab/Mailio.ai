// TODO: Replace with real API data once backend is wired up

export type TicketStatus = "New" | "Checking" | "In Progress" | "Waiting for User" | "Completed" | "Closed";
export type TicketPriority = "High" | "Medium" | "Low";

export interface MockTicketReply {
  id: string;
  sender: string;
  senderType: "User" | "Admin" | "System";
  message: string;
  time: string;
}

export interface MockTicket {
  id: string;
  user: string;
  email: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedAdmin: string;
  updated: string;
  created: string;
  description: string;
  plan: string;
  memberSince: string;
  attachments?: { name: string; size: string }[];
  conversation: MockTicketReply[];
}

export const MOCK_TICKETS: MockTicket[] = [
  {
    id: "TKT-2025-1248",
    user: "Sarah Johnson",
    email: "sarah.j@example.com",
    subject: "Unable to send emails",
    category: "Email Issue",
    priority: "High",
    status: "New",
    assignedAdmin: "Admin User",
    updated: "2025-05-26 10:30 AM",
    created: "2025-05-26 09:45 AM",
    description:
      "I'm unable to send emails from my account since this morning. The emails remain in the outbox with a 'sending failed' error. Please help me resolve this issue as it's affecting my work.",
    plan: "PRO",
    memberSince: "2025-04-12",
    attachments: [
      { name: "error_screenshot.png", size: "324 KB" },
      { name: "outbox_log.txt", size: "12 KB" },
    ],
    conversation: [
      { id: "r1", sender: "Sarah Johnson", senderType: "User", message: "I'm unable to send emails from my account since this morning.", time: "2025-05-26 09:45 AM" },
      { id: "r2", sender: "Auto Reply (System)", senderType: "System", message: "We've received your ticket and our team will get back to you soon.", time: "2025-05-26 09:45 AM" },
      { id: "r3", sender: "Admin User", senderType: "Admin", message: "Hi Sarah, thanks for reaching out. We're looking into this issue. Could you please confirm if you're using SMTP or our default mail server?", time: "2025-05-26 10:30 AM" },
    ],
  },
  { id: "TKT-2025-1247", user: "Michael Brown", email: "michael.b@example.com", subject: "Login not working", category: "Account Access", priority: "Medium", status: "Checking", assignedAdmin: "James Wilson", updated: "2025-05-26 09:52 AM", created: "2025-05-26 09:15 AM", description: "Can't log in.", plan: "BASIC", memberSince: "2025-01-15", conversation: [] },
  { id: "TKT-2025-1246", user: "Priya Patel", email: "priya.p@example.com", subject: "Subscription upgrade", category: "Billing", priority: "Low", status: "In Progress", assignedAdmin: "Admin User", updated: "2025-05-26 09:15 AM", created: "2025-05-25 03:20 PM", description: "Want to upgrade.", plan: "BASIC", memberSince: "2025-02-09", conversation: [] },
  { id: "TKT-2025-1245", user: "David Lee", email: "david.l@example.com", subject: "Email delivery delay", category: "Email Issue", priority: "High", status: "Waiting for User", assignedAdmin: "Sophia Turner", updated: "2025-05-26 08:45 AM", created: "2025-05-25 10:10 AM", description: "Emails delayed by hours.", plan: "BUSINESS", memberSince: "2024-09-01", conversation: [] },
  { id: "TKT-2025-1244", user: "Emily Davis", email: "emily.d@example.com", subject: "Feature request", category: "Feature Request", priority: "Low", status: "In Progress", assignedAdmin: "James Wilson", updated: "2025-05-25 05:30 PM", created: "2025-05-24 11:05 AM", description: "Need bulk export.", plan: "PRO", memberSince: "2025-03-22", conversation: [] },
  { id: "TKT-2025-1243", user: "Robert Wilson", email: "robert.w@example.com", subject: "Can't add team member", category: "Account Access", priority: "Medium", status: "Checking", assignedAdmin: "Admin User", updated: "2025-05-25 04:22 PM", created: "2025-05-25 03:00 PM", description: "Invite link not working.", plan: "BUSINESS", memberSince: "2024-10-22", conversation: [] },
  { id: "TKT-2025-1242", user: "Linda Martinez", email: "linda.m@example.com", subject: "Billing invoice issue", category: "Billing", priority: "High", status: "Waiting for User", assignedAdmin: "Sophia Turner", updated: "2025-05-25 03:10 PM", created: "2025-05-25 02:00 PM", description: "Incorrect invoice amount.", plan: "PRO", memberSince: "2024-11-18", conversation: [] },
  { id: "TKT-2025-1241", user: "Chris Taylor", email: "chris.t@example.com", subject: "Email templates not loading", category: "Email Issue", priority: "Medium", status: "Completed", assignedAdmin: "James Wilson", updated: "2025-05-25 02:45 PM", created: "2025-05-24 10:00 AM", description: "Templates blank.", plan: "PRO", memberSince: "2024-12-04", conversation: [] },
  { id: "TKT-2025-1240", user: "Jessica White", email: "jessica.w@example.com", subject: "Cancel subscription", category: "Billing", priority: "Low", status: "Closed", assignedAdmin: "Admin User", updated: "2025-05-25 01:20 PM", created: "2025-05-24 09:30 AM", description: "Want to cancel.", plan: "BASIC", memberSince: "2025-02-09", conversation: [] },
  { id: "TKT-2025-1239", user: "Daniel Kim", email: "daniel.k@example.com", subject: "Security concern", category: "Account Access", priority: "High", status: "Completed", assignedAdmin: "Sophia Turner", updated: "2025-05-24 11:08 AM", created: "2025-05-23 02:00 PM", description: "Account possibly compromised.", plan: "BUSINESS", memberSince: "2024-05-12", conversation: [] },
];
