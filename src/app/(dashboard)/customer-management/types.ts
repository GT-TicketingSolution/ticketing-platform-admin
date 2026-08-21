// Customer Entity
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  gstn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
