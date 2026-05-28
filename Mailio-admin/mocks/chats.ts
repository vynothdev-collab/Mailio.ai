// TODO: Replace with real API data once backend is wired up

export type ChatStatus = "New" | "Open" | "Replied" | "Waiting" | "Closed";

export interface MockChatMessage {
  id: string;
  sender: "user" | "admin";
  text: string;
  time: string;
}

export interface MockChat {
  id: string;
  userName: string;
  userEmail: string;
  plan: string;
  memberSince: string;
  lastMessage: string;
  lastTime: string;
  status: ChatStatus;
  unread?: number;
  source: "Web Chat" | "Email" | "Mobile";
  assignedTo: string;
  startedAt: string;
  messages: MockChatMessage[];
}

export const MOCK_CHATS: MockChat[] = [
  {
    id: "CHT-12584",
    userName: "John Doe",
    userEmail: "john.doe@example.com",
    plan: "PRO",
    memberSince: "2025-04-12",
    lastMessage: "I need help with upgrading my plan.",
    lastTime: "10:24 AM",
    status: "New",
    source: "Web Chat",
    assignedTo: "Admin User",
    startedAt: "2025-05-26 10:24 AM",
    messages: [
      { id: "m1", sender: "user", text: "I need help with upgrading my plan.", time: "10:24 AM" },
      { id: "m2", sender: "admin", text: "Hello John! 👋 I'd be happy to help you upgrade your plan. Which plan are you interested in?", time: "10:25 AM" },
      { id: "m3", sender: "user", text: "I'm interested in the Enterprise Plan. Can you tell me more about the features?", time: "10:27 AM" },
      { id: "m4", sender: "admin", text: "Absolutely! The Enterprise Plan includes:\n• Unlimited email credits\n• Advanced analytics\n• Priority support\n• Team collaboration\n\nWould you like me to share the pricing details?", time: "10:28 AM" },
    ],
  },
  { id: "CHT-12583", userName: "Sarah Williams", userEmail: "sarah.w@example.com", plan: "BASIC", memberSince: "2024-12-04", lastMessage: "Can I get a refund for my last payment?", lastTime: "10:18 AM", status: "Waiting", source: "Email", assignedTo: "Admin User", startedAt: "2025-05-26 10:18 AM", messages: [] },
  { id: "CHT-12582", userName: "Michael Brown", userEmail: "michael.b@example.com", plan: "PRO", memberSince: "2025-01-15", lastMessage: "How do I integrate Mailio with Gmail?", lastTime: "10:12 AM", status: "Open", source: "Web Chat", assignedTo: "Sophia Turner", startedAt: "2025-05-26 10:12 AM", messages: [] },
  { id: "CHT-12581", userName: "Emily Johnson", userEmail: "emily.j@example.com", plan: "FREE", memberSince: "2025-03-22", lastMessage: "Thanks! That solved my issue.", lastTime: "9:58 AM", status: "Replied", source: "Web Chat", assignedTo: "Admin User", startedAt: "2025-05-26 09:58 AM", messages: [] },
  { id: "CHT-12580", userName: "David Lee", userEmail: "david.l@example.com", plan: "BUSINESS", memberSince: "2024-09-01", lastMessage: "I can't access my account.", lastTime: "9:45 AM", status: "Waiting", source: "Web Chat", assignedTo: "James Wilson", startedAt: "2025-05-26 09:45 AM", messages: [] },
  { id: "CHT-12579", userName: "Olivia Martinez", userEmail: "olivia.m@example.com", plan: "PRO", memberSince: "2024-11-18", lastMessage: "Is there a limit on email credits?", lastTime: "9:32 AM", status: "Open", source: "Web Chat", assignedTo: "Sophia Turner", startedAt: "2025-05-26 09:32 AM", messages: [] },
  { id: "CHT-12578", userName: "James Wilson", userEmail: "james.w@example.com", plan: "BASIC", memberSince: "2025-02-09", lastMessage: "Everything is working great now!", lastTime: "9:20 AM", status: "Closed", source: "Web Chat", assignedTo: "Admin User", startedAt: "2025-05-26 09:20 AM", messages: [] },
  { id: "CHT-12577", userName: "Sophia Anderson", userEmail: "sophia.a@example.com", plan: "PRO", memberSince: "2024-10-30", lastMessage: "Need help with team members.", lastTime: "9:10 AM", status: "New", source: "Web Chat", assignedTo: "Unassigned", startedAt: "2025-05-26 09:10 AM", messages: [] },
];
