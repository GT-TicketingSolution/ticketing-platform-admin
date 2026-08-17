// Complimentary Pass entity
export interface ComplimentaryPass {
  id: string;
  passId: string;
  visitorName: string;
  mobile: string;
  attraction: string;
  visitors: number;
  reference: string;
  status: "Active" | "Used" | "Expired";
  date: string;
}

// ─── Reference entity 
export interface Reference {
  id: string;
  referenceName: string;
  department: string;
  contactPerson: string;
  post: string;
  mobile: string;
  status: "Active" | "Inactive";
}

//Shared constants
export const ATTRACTIONS = [
  "All Attractions",
  "Toy Train",
  "Ropeway",
  "Wax Mueseum",
  "Biological Park",
  "Sheesh Mahal",
  "Fort Entry",
];
