// Customer Entity
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
  gstn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
