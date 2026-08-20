"use client";

import React, { useState, useMemo } from "react";
import {
  UserRound,
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Customer, INITIAL_CUSTOMERS } from "./types";
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
    setIsAddEditModalOpen(false);
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
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
      }}
    >
      {/* ── Row 1: Export buttons + Add Customer — right-aligned (matches Bookings) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportCSV}
          pdfLabel="Export PDF"
          excelLabel="Export Excel"
          disabled={filteredCustomers.length === 0}
        />

        {/* Add Customer */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          style={{
            height: "39px",
            padding: "0 20px",
            background: "#0C2A42",
            borderRadius: "5px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(12,42,66,0.2)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#173F63";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#0C2A42";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "12px",
              color: "#FFFFFF",
            }}
          >
            Add Customer
          </span>
        </button>
      </div>

      {/* ── Row 2: Filter card (matches Bookings white card style) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: "#FFFFFF",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid rgba(179, 175, 175, 0.4)",
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              border: "1.5px solid rgba(179, 175, 175, 0.51)",
              borderRadius: "4px",
              padding: "0 12px",
              height: "40px",
              boxSizing: "border-box",
            }}
          >
            <Search size={18} color="#B3AFAF" />
            <input
              type="text"
              placeholder="Search by Customer Name, Mobile No., GSTN........"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "12px",
                color: "#011B2F",
                background: "transparent",
              }}
            />
          </div>
        </div>

        {/* Reset Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ height: "14px" }} />
          <button
            type="button"
            onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
            style={{
              height: "40px",
              width: "95px",
              borderRadius: "4px",
              border: "0.5px solid rgba(179, 175, 175, 0.66)",
              background: "#FFFFFF",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "12px",
              color: "#173F63",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxSizing: "border-box",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
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
