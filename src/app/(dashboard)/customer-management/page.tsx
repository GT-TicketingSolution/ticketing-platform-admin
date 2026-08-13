"use client";

import React, { useState, useMemo } from "react";
import {
  UserRound,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Customer, INITIAL_CUSTOMERS } from "@/types/admin";
import AddEditCustomerModal from "@/components/modals/AddEditCustomerModal";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import ExportButtons from "@/components/ui/ExportButtons";
import { exportToCSV } from "@/lib/exportUtils";
import { handleDownloadCustomerListPDF } from "@/lib/printUtils";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);

  const { showToast } = useToast();

  // Search filter
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(
      (cust) =>
        cust.name.toLowerCase().includes(term) ||
        cust.mobile.toLowerCase().includes(term) ||
        cust.gstn.toLowerCase().includes(term) ||
        cust.sNo.toString().includes(term)
    );
  }, [customers, searchTerm]);

  // Pagination calculation
  const totalItems = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  // Handlers
  const handleOpenAddModal = () => {
    setSelectedCustomerForEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setSelectedCustomerForEdit(cust);
    setIsAddEditModalOpen(true);
  };

  const handleSaveCustomer = (data: { name: string; mobile: string; gstn: string; id?: string }) => {
    if (data.id) {
      // Update existing customer
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === data.id
            ? { ...c, name: data.name, mobile: data.mobile, gstn: data.gstn }
            : c
        )
      );
      showToast("Customer details updated successfully!");
    } else {
      // Add new customer
      const newCustomer: Customer = {
        id: `CUST-${Date.now().toString().slice(-4)}`,
        sNo: customers.length + 1,
        name: data.name,
        mobile: data.mobile,
        gstn: data.gstn,
      };
      setCustomers((prev) => [...prev, newCustomer]);
      showToast("New customer added successfully!");
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    const confirmed = await confirmDelete(`customer "${cust.name}"`);
    if (!confirmed) return;

    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== cust.id);
      // Re-index S.NO.
      return updated.map((c, index) => ({ ...c, sNo: index + 1 }));
    });
    showToast(`Customer "${cust.name}" has been deleted.`, "info");
  };

  const handleExportCSV = () => {
    const headers = ["S.NO.", "Customer Name", "Mobile Number", "GSTN"];
    const rows = filteredCustomers.map((c) => [c.sNo, c.name, c.mobile, c.gstn]);
    exportToCSV("Customer_List", headers, rows);
    showToast("Customer list exported to Excel (CSV)!", "success");
  };

  const handleExportPDF = async () => {
    if (filteredCustomers.length === 0) {
      showToast("No customer records to export.", "error");
      return;
    }
    const filterInfo = searchTerm ? `Search: "${searchTerm}"` : "All Customers";
    await handleDownloadCustomerListPDF(filteredCustomers, filterInfo);
    showToast("Customer list exported as PDF!", "success");
  };

  // Define columns for GlobalDataTable (matching Invoices/Bookings/Transactions)
  const columns: GlobalColumn<Customer>[] = [
    {
      header: "Customer Name",
      accessorKey: "name",
    },
    {
      header: "Mobile No.",
      accessorKey: "mobile",
    },
    {
      header: "GSTN",
      cell: (item) => item.gstn || "—",
    },
    {
      header: "Actions",
      align: "right",
      width: "100px",
      cell: (item) => (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "14px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditModal(item);
            }}
            title="Edit Customer"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Pencil size={17} color="#2372A5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCustomer(item);
            }}
            title="Delete Customer"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Trash2 size={17} color="#DC2626" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: "24px 32px 40px 32px",
        background: "#FFFFFF",
        minHeight: "calc(100vh - 78px)",
        boxSizing: "border-box",
      }}
    >

      {/* ── Page Header matching exact Figma style ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <UserRound size={30} color="#011B2F" strokeWidth={2.2} />
        <h1
          style={{
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "20px",
            lineHeight: "25px",
            color: "#0C2A42",
          }}
        >
          Customer Management
        </h1>
      </div>

      {/* ── Top Controls Row: Search Box & Actions (Export PDF, Export Excel, + Add Customer) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        {/* Search Bar matching exact Figma Rectangle 59 style */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "413px",
            height: "40px",
            background: "#FFFFFF",
            border: "1.5px solid rgba(179, 175, 175, 0.51)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            boxSizing: "border-box",
          }}
        >
          <Search size={18} color="#B3AFAF" style={{ flexShrink: 0, marginRight: "10px" }} />
          <input
            type="text"
            placeholder="Search by Customer Name, Mobile No., GSTN........"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "15px",
              color: "#011B2F",
            }}
          />
        </div>

        {/* Action Buttons: Export PDF, Export Excel, Add Customer */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <ExportButtons
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportCSV}
            pdfLabel="Export PDF"
            excelLabel="Export Excel"
          />

          {/* Add Customer Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            style={{
              width: "153px",
              height: "48px",
              background: "#F4BC43",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(244, 188, 67, 0.25)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E5AF36";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#F4BC43";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Plus size={24} color="#0C2A42" strokeWidth={3} />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "18px",
                color: "#0C2A42",
              }}
            >
              Add Customer
            </span>
          </button>
        </div>
      </div>

      {/* ── Global Data Table Component (Unified S.No, Headers, Row Styles & Invoices Pagination UI) ── */}
      <GlobalDataTable
        columns={columns}
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        pageSize={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showSNo={true}
        sNoHeader="S.NO."
        itemLabel="customers"
        emptyMessage="No customers found matching current search."
      />

      {/* ── Modals ── */}
      <AddEditCustomerModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        customer={selectedCustomerForEdit}
        onSave={handleSaveCustomer}
      />
    </div>
  );
}
