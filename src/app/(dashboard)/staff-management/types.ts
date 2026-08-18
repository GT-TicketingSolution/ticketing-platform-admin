// ─── Staff entity ────────────────────────────────────────────────────────────
export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string[];
  assignedAttraction: string[];
  joinedDate: string;
  status: "Active" | "Inactive";
  ticketsIssued: number;
}

// ─── Mock staff data ─────────────────────────────────────────────────────────
export const INITIAL_STAFF: StaffUser[] = [
  {
    id: "STF-201",
    name: "Rohan Gupta",
    email: "rohan.g@gmail.com",
    phone: "9123456789",
    role: ["Counter Operator"],
    assignedAttraction: ["Toy Train"],
    joinedDate: "2024-02-01",
    status: "Active",
    ticketsIssued: 3850,
  },
  {
    id: "STF-202",
    name: "Kavita Singh",
    email: "kavita.s@gmail.com",
    phone: "9234567890",
    role: ["Validator"],
    assignedAttraction: ["Ropeway"],
    joinedDate: "2024-02-15",
    status: "Active",
    ticketsIssued: 2940,
  },
  {
    id: "STF-203",
    name: "Amit Trivedi",
    email: "amit.t@gmail.com",
    phone: "9345678901",
    role: ["Counter Operator", "Supervisor"],
    assignedAttraction: ["Wax Museum"],
    joinedDate: "2024-03-10",
    status: "Active",
    ticketsIssued: 2410,
  },
  {
    id: "STF-204",
    name: "Sneha Reddi",
    email: "sneha.r@gmail.com",
    phone: "9456789012",
    role: ["Counter Operator"],
    assignedAttraction: ["Sheesh Mahal"],
    joinedDate: "2024-04-05",
    status: "Inactive",
    ticketsIssued: 1520,
  },
  {
    id: "STF-205",
    name: "Manoj Sen",
    email: "manoj.s@gmail.com",
    phone: "9567890123",
    role: ["Counter Operator"],
    assignedAttraction: ["Fort Entry"],
    joinedDate: "2024-05-12",
    status: "Inactive",
    ticketsIssued: 980,
  },
  {
    id: "STF-206",
    name: "Priya Nair",
    email: "priya.nair@gmail.com",
    phone: "9678901234",
    role: ["Helpdesk"],
    assignedAttraction: ["Wax Museum", "Fort Entry"],
    joinedDate: "2024-06-01",
    status: "Inactive",
    ticketsIssued: 640,
  },
  {
    id: "STF-207",
    name: "Vikas Chawla",
    email: "vikas.chawla@gmail.com",
    phone: "9789012345",
    role: ["Supervisor"],
    assignedAttraction: ["Biological Park"],
    joinedDate: "2024-06-20",
    status: "Inactive",
    ticketsIssued: 410,
  },
];
