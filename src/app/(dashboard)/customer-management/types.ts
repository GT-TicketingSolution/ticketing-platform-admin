// Customer Entity & Mock Data
export interface Customer {
  id: string;
  sNo: number;
  name: string;
  mobile: string;
  gstn: string;
}

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: "CUST-001",
    sNo: 1,
    name: "Amit Sharma",
    mobile: "+91 8768756478",
    gstn: "08ABCDE1234F1Z5",
  },
  {
    id: "CUST-002",
    sNo: 2,
    name: "Rahul Verma",
    mobile: "+91 8768756478",
    gstn: "08ABCDE1234F1Z5",
  },
  {
    id: "CUST-003",
    sNo: 3,
    name: "Priya Singh",
    mobile: "+91 8768756478",
    gstn: "",
  },
  {
    id: "CUST-004",
    sNo: 4,
    name: "Neha Jain",
    mobile: "+91 8768756478",
    gstn: "08ABCDE1234F1Z5",
  },
  {
    id: "CUST-005",
    sNo: 5,
    name: "Karan Mehta",
    mobile: "+91 8768756478",
    gstn: "",
  },
  {
    id: "CUST-006",
    sNo: 6,
    name: "Anjali Gupta",
    mobile: "+91 8768756478",
    gstn: "08ABCDE1234F1Z5",
  },
  {
    id: "CUST-007",
    sNo: 7,
    name: "Anjali Gupta",
    mobile: "+91 8768756478",
    gstn: "08ABCDE1234F1Z5",
  },
  {
    id: "CUST-008",
    sNo: 8,
    name: "Anjali Gupta",
    mobile: "+91 8768756478",
    gstn: "",
  },
  {
    id: "CUST-009",
    sNo: 9,
    name: "Anjali Gupta",
    mobile: "+91 8768756478",
    gstn: "08ABCDE1234F1Z5",
  },
  {
    id: "CUST-010",
    sNo: 10,
    name: "Anjali Gupta",
    mobile: "+91 8768756478",
    gstn: "",
  },
];
