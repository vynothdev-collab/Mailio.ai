// TODO: Replace with real API data once backend is wired up

export interface MockActivityLog {
  id: string;
  dateTime: string;
  user: string;
  action: string;
  module: string;
  details: string;
  ipAddress: string;
  status: "Success" | "Failed";
}

export const MOCK_ACTIVITY_LOGS: MockActivityLog[] = [
  { id: "L-1", dateTime: "2025-05-26 10:30 AM", user: "Admin User", action: "Logged In", module: "System", details: "Admin user john.doe@example.com logged in", ipAddress: "192.168.1.1", status: "Success" },
  { id: "L-2", dateTime: "2025-05-26 09:15 AM", user: "Sarah Johnson", action: "Updated Profile", module: "Users", details: "Updated profile information", ipAddress: "192.168.1.5", status: "Success" },
  { id: "L-3", dateTime: "2025-05-26 08:45 AM", user: "Acme Corporation", action: "Added Credits", module: "Credits", details: "Added 25,000 credits to account", ipAddress: "192.168.1.2", status: "Success" },
  { id: "L-4", dateTime: "2025-05-25 04:20 PM", user: "Michael Smith", action: "Email Verified", module: "Users", details: "Email verified for michael.smith@example.com", ipAddress: "192.168.1.8", status: "Success" },
  { id: "L-5", dateTime: "2025-05-25 03:10 PM", user: "Admin User", action: "Created Plan", module: "Plans", details: 'Created plan "Enterprise Pro"', ipAddress: "192.168.1.1", status: "Success" },
  { id: "L-6", dateTime: "2025-05-25 01:05 PM", user: "Globex Solutions", action: "Changed Plan", module: "Plans", details: "Changed from Business to Enterprise Plan", ipAddress: "192.168.1.3", status: "Success" },
  { id: "L-7", dateTime: "2025-05-24 11:50 AM", user: "Emily Davis", action: "Added User", module: "Users", details: "Added user emily.davis@example.com", ipAddress: "192.168.1.6", status: "Success" },
  { id: "L-8", dateTime: "2025-05-24 10:40 AM", user: "Wayne Enterprises", action: "Added Credits", module: "Credits", details: "Added 50,000 credits to account", ipAddress: "192.168.1.4", status: "Success" },
  { id: "L-9", dateTime: "2025-05-23 06:30 PM", user: "Robert Brown", action: "Viewed Report", module: "Reports", details: 'Viewed "Credits & Usage" report', ipAddress: "192.168.1.7", status: "Success" },
  { id: "L-10", dateTime: "2025-05-23 03:25 PM", user: "Initech", action: "Updated Plan", module: "Plans", details: "Updated plan features and limits", ipAddress: "192.168.1.9", status: "Success" },
];
