// TODO: Replace with real API data once backend is wired up

export interface MockEnterprise {
  id: string;
  name: string;
  domain: string;
  adminName: string;
  adminEmail: string;
  plan: string;
  users: number;
  creditsAssigned: number;
  creditsUsed: number;
  renewalDate: string;
  status: "Active" | "Expiring Soon" | "Expired" | "Suspended";
  billingCycle: "Monthly" | "Annual";
  price: number;
  autoTopUp: boolean;
  topUpThreshold: number;
  createdAt: string;
}

export const MOCK_ENTERPRISES: MockEnterprise[] = [
  {
    id: "E-001",
    name: "Acme Corporation",
    domain: "acme.com",
    adminName: "John Doe",
    adminEmail: "john@acme.com",
    plan: "ENTERPRISE",
    users: 120,
    creditsAssigned: 452000,
    creditsUsed: 230500,
    renewalDate: "2025-06-18",
    status: "Active",
    billingCycle: "Annual",
    price: 24000,
    autoTopUp: true,
    topUpThreshold: 50000,
    createdAt: "2024-06-18",
  },
  {
    id: "E-002",
    name: "Globex Solutions",
    domain: "globex.com",
    adminName: "Sarah Johnson",
    adminEmail: "sarah@globex.com",
    plan: "ENTERPRISE",
    users: 98,
    creditsAssigned: 305000,
    creditsUsed: 164300,
    renewalDate: "2025-06-24",
    status: "Active",
    billingCycle: "Annual",
    price: 18000,
    autoTopUp: false,
    topUpThreshold: 20000,
    createdAt: "2024-06-24",
  },
  {
    id: "E-003",
    name: "Initech",
    domain: "initech.com",
    adminName: "Peter Gibbons",
    adminEmail: "peter@initech.com",
    plan: "ENTERPRISE",
    users: 56,
    creditsAssigned: 320000,
    creditsUsed: 126100,
    renewalDate: "2025-05-30",
    status: "Expiring Soon",
    billingCycle: "Annual",
    price: 19000,
    autoTopUp: true,
    topUpThreshold: 30000,
    createdAt: "2024-05-30",
  },
  {
    id: "E-004",
    name: "Stark Industries",
    domain: "starkindustries.com",
    adminName: "Tony Stark",
    adminEmail: "tony@stark.com",
    plan: "ENTERPRISE_PLUS",
    users: 210,
    creditsAssigned: 712200,
    creditsUsed: 487600,
    renewalDate: "2025-06-28",
    status: "Expiring Soon",
    billingCycle: "Annual",
    price: 49000,
    autoTopUp: true,
    topUpThreshold: 100000,
    createdAt: "2023-12-28",
  },
  {
    id: "E-005",
    name: "Wayne Enterprises",
    domain: "wayneenterprises.com",
    adminName: "Bruce Wayne",
    adminEmail: "bruce@wayne.com",
    plan: "ENTERPRISE",
    users: 80,
    creditsAssigned: 305200,
    creditsUsed: 98750,
    renewalDate: "2025-06-14",
    status: "Active",
    billingCycle: "Annual",
    price: 18000,
    autoTopUp: false,
    topUpThreshold: 25000,
    createdAt: "2024-06-14",
  },
];

export interface MockTeamMember {
  id: string;
  enterpriseId: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Member";
  status: "Active" | "Inactive";
  creditsUsed: number;
  joinedAt: string;
}

export const MOCK_TEAM_MEMBERS: MockTeamMember[] = [
  { id: "TM-1", enterpriseId: "E-001", name: "John Doe", email: "john.doe@acme.com", role: "Admin", status: "Active", creditsUsed: 12400, joinedAt: "2024-06-18" },
  { id: "TM-2", enterpriseId: "E-001", name: "Sarah Johnson", email: "sarah.j@acme.com", role: "Manager", status: "Active", creditsUsed: 9800, joinedAt: "2024-07-22" },
  { id: "TM-3", enterpriseId: "E-001", name: "Michael Smith", email: "michael.s@acme.com", role: "Member", status: "Active", creditsUsed: 5600, joinedAt: "2024-08-15" },
  { id: "TM-4", enterpriseId: "E-001", name: "Emily Davis", email: "emily.d@acme.com", role: "Member", status: "Active", creditsUsed: 4200, joinedAt: "2024-09-01" },
  { id: "TM-5", enterpriseId: "E-001", name: "Robert Brown", email: "robert.b@acme.com", role: "Member", status: "Inactive", creditsUsed: 1100, joinedAt: "2024-10-12" },
];
