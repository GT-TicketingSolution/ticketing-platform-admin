"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Users,
  SearchX,
} from "lucide-react";
import { Customer } from "./types";
import AddEditCustomerModal from "@/components/modals/AddEditCustomerModal";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import ExportButtons from "@/components/ui/ExportButtons";
import { exportToCSV } from "@/lib/exportUtils";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useCustomerList,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  CustomerItem,
} from "@/hooks/useCustomerQueries";
import { META_CONSTANTS } from "@/lib/metaConstant";

export default function CustomerManagementPage() {
  const { role, isStaff } = useUserRole();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.customerManagement.fullTitle;
  }, []);

  // Debounce search query for API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // ── Queries & Mutations ───────────────────────────────────────────────────
  const {
    data: customerData,
    isLoading,
    isError,
  } = useCustomerList(
    {
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearch || undefined,
    },
    !isStaff // Don't query if staff
  );

  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const deleteCustomerMutation = useDeleteCustomer();

  const customers: CustomerItem[] = customerData?.items ?? [];
  const pagination = customerData?.pagination ?? {
    page: 1,
    limit: itemsPerPage,
    total: 0,
    totalPages: 0,
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setSelectedCustomerForEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (cust: CustomerItem) => {
    setSelectedCustomerForEdit({
      id: cust.id,
      name: cust.name,
      mobile: cust.mobile,
      gstn: cust.gstn,
      createdAt: cust.createdAt,
      updatedAt: cust.updatedAt,
    });
    setIsAddEditModalOpen(true);
  };

  const handleSaveCustomer = async (data: { name: string; mobile: string; gstn?: string; id?: string }) => {
    try {
      if (data.id) {
        await updateCustomerMutation.mutateAsync({
          id: data.id,
          name: data.name,
          mobile: data.mobile,
          gstn: data.gstn || undefined,
        });
      } else {
        await createCustomerMutation.mutateAsync({
          name: data.name,
          mobile: data.mobile,
          gstn: data.gstn || undefined,
        });
      }
      setIsAddEditModalOpen(false);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleDeleteCustomer = async (cust: CustomerItem) => {
    const confirmed = await confirmDelete(`customer "${cust.name}"`);
    if (!confirmed) return;

    try {
      await deleteCustomerMutation.mutateAsync(cust.id);
    } catch {
      // Handled in mutation onError
    }
  };

  // ── Export Handlers (Matching Bookings Module Pattern) ────────────────────
  const handleExportCSV = () => {
    if (customers.length === 0) {
      showToast("No customer records to export.", "info");
      return;
    }
    const headers = ["#", "Customer Name", "Mobile Number", "GSTN"];
    const rows = customers.map((c, i) => [
      (currentPage - 1) * itemsPerPage + i + 1,
      c.name || "-",
      c.mobile || "-",
      c.gstn || "-",
    ]);
    exportToCSV(`Customers_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    showToast("Excel (CSV) file downloaded successfully.", "success");
  };

  const handleExportPDF = async () => {
    if (customers.length === 0) {
      showToast("No customer records to export.", "info");
      return;
    }

    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF library"));
          document.head.appendChild(script);
        });
      }

      const dateLabel = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const rowsHtml = customers
        .map(
          (c, idx) => `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px;">
          <td style="padding: 8px 10px;">${(currentPage - 1) * itemsPerPage + idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0C2A42;">${c.name || "-"}</td>
          <td style="padding: 8px 10px;">${c.mobile || "-"}</td>
          <td style="padding: 8px 10px;">${c.gstn || "-"}</td>
        </tr>`
        )
        .join("");

      const reportHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
          <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
            <tr>
              <td style="vertical-align: top;">
                <div style="font-size: 20px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
                <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">CUSTOMER MANAGEMENT REPORT</div>
                <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Generated: ${dateLabel}</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 11px; color: #6B7280;">Total Records: <strong>${pagination.total || customers.length}</strong></div>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #F1F5F9; color: #374151; font-weight: bold;">
                <th style="padding: 8px 10px; text-align: left; width: 40px;">#</th>
                <th style="padding: 8px 10px; text-align: left;">Customer Name</th>
                <th style="padding: 8px 10px; text-align: left;">Mobile Number</th>
                <th style="padding: 8px 10px; text-align: left;">GSTN</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;

      const element = document.createElement("div");
      element.style.width = "750px";
      element.innerHTML = reportHtml;
      document.body.appendChild(element);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Customers_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await (window as any).html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
      showToast("PDF downloaded successfully.", "success");
    } catch (err) {
      console.error("Customer PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    }
  };

  // ── Forbidden Screen for STAFF Role ───────────────────────────────────────
  if (isStaff) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "32px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#FEF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <ShieldAlert size={28} color="#DC2626" />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", margin: "0 0 8px 0" }}>
          Access Forbidden
        </h2>
        <p style={{ fontSize: "13px", color: "#64748B", maxWidth: "420px", margin: 0 }}>
          Staff roles do not have permission to view or manage customer records. Please contact your system administrator.
        </p>
      </div>
    );
  }

  // ── Table Columns Definition ──────────────────────────────────────────────
  const columns: GlobalColumn<CustomerItem>[] = [
    {
      header: "Customer Name",
      cell: (item) => (
        <span style={{ fontWeight: 600, color: "#0C2A42", fontSize: "13px" }}>
          {item.name || "-"}
        </span>
      ),
    },
    {
      header: "Mobile No.",
      cell: (item) => (
        <span style={{ color: "#374151", fontSize: "13px" }}>
          {item.mobile || "-"}
        </span>
      ),
    },
    {
      header: "GSTN",
      cell: (item) => (
        <span
          style={{
            fontFamily: item.gstn ? "'DM Mono', monospace" : "inherit",
            color: item.gstn ? "#0C2A42" : "#94A3B8",
            fontWeight: item.gstn ? 600 : 400,
            fontSize: "12px",
          }}
        >
          {item.gstn || "-"}
        </span>
      ),
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
            <Pencil size={16} color="#2372A5" />
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
            <Trash2 size={16} color="#DC2626" />
          </button>
        </div>
      ),
    },
  ];

  const isFiltered = !!debouncedSearch.trim();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
      }}
    >
      {/* ── Row 1: Export buttons + Add Customer ── */}
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
          disabled={customers.length === 0}
        />

        {/* Add Customer Button */}
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

      {/* ── Row 2: Search & Filter Card ── */}
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
        {/* Search Input */}
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
              placeholder="Search by Customer Name, Mobile No., GSTN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "12px",
                color: "#011B2F",
                background: "transparent",
              }}
            />
          </div>
        </div>

        {/* Reset Button */}
        {isFiltered && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setDebouncedSearch("");
                setCurrentPage(1);
              }}
              style={{
                height: "40px",
                padding: "0 16px",
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
        )}
      </div>

      {/* ── Table with Server-side Pagination ── */}
      <GlobalDataTable
        columns={columns}
        data={customers}
        keyExtractor={(item) => item.id}
        pageSize={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        showSNo={true}
        sNoHeader="S.NO."
        itemLabel="customers"
        isLoading={isLoading}
        emptyIcon={isFiltered ? <SearchX size={26} color="#0C2A42" /> : <Users size={26} color="#0C2A42" />}
        emptyTitle={isFiltered ? "No Matching Customers Found" : "No Customers Found"}
        emptyDescription={
          isFiltered
            ? `No customers found matching "${debouncedSearch}". Try adjusting your search query.`
            : "There are currently no customers recorded in the system. Click 'Add Customer' to create one."
        }
        emptyAction={
          isFiltered ? (
            <button
              onClick={() => {
                setSearchTerm("");
                setDebouncedSearch("");
              }}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "#0C2A42",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={handleOpenAddModal}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "#F4BC43",
                color: "#011B2F",
                border: "none",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Add Customer
            </button>
          )
        }
      />

      {/* ── Add / Edit Customer Modal ── */}
      <AddEditCustomerModal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        customer={selectedCustomerForEdit}
        onSave={handleSaveCustomer}
        isSaving={createCustomerMutation.isPending || updateCustomerMutation.isPending}
      />
    </div>
  );
}
