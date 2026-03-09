import React, { useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import Handlebars from "handlebars";
import poTemplateSource from "./po-template.hbs?raw";
import ThaiBahtText from "thai-baht-text";
import {
    ModalEmail,
    ModalResult,
    type EmailPayload,
} from "../../../components/Modals";
import ReactPaginate from "react-paginate";
import "bootstrap/dist/css/bootstrap.min.css";

const API_BASE = "http://localhost:3001";
// Handlebars Helpers
Handlebars.registerHelper("numberPlus1", (index: number) => index + 1);
Handlebars.registerHelper("gt", (a: number, b: number) => a > b);

const template = Handlebars.compile(poTemplateSource);

interface POListItem {
    PONumber: string;
    PODate: string;
    SupplierNo: string;
    VendorName: string;
}

// helper font
const toBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};

const openPreview = async (data: any) => {
    const [fontNormal, fontBold] = await Promise.all([
        toBase64("/fonts/THSarabunNew.ttf"),
        toBase64("/fonts/THSarabunNew_Bold.ttf"),
    ]);

    const allItems: any[] = Array.isArray(data.items) ? data.items : [];
    const SINGLE_PAGE_MAX = 5;
    const FIRST_PAGE_MAX = 5;
    const MIDDLE_PAGE_MAX = 20;
    const LAST_PAGE_MAX = 5;
    const chunks: any[][] = [];

    if (allItems.length === 0) {
        chunks.push([]);
    } else if (allItems.length <= SINGLE_PAGE_MAX) {
        chunks.push([...allItems]);
    } else {
        const lastPageItems = allItems.slice(-LAST_PAGE_MAX);
        const middleItems = allItems.slice(
            FIRST_PAGE_MAX,
            allItems.length - LAST_PAGE_MAX,
        );
        chunks.push(allItems.slice(0, FIRST_PAGE_MAX));
        let cursor = 0;
        while (cursor < middleItems.length) {
            chunks.push(middleItems.slice(cursor, cursor + MIDDLE_PAGE_MAX));
            cursor += MIDDLE_PAGE_MAX;
        }
        chunks.push(lastPageItems);
    }

    const totalPages = chunks.length;
    const renderedPages = chunks.map((pageItems, i) =>
        template({
            ...data,
            items: pageItems,
            emptyRows: [],
            isFirstPage: i === 0,
            isLastPage: i === totalPages - 1,
            footer: { ...data.footer, pageNumber: i + 1, totalPages },
        }),
    );

    // CSS ของหน้าต่าง preview ที่เปิดแยก ไม่ใช่ของ component นี้
    const fullHtml = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8" />
      <title>PO ${data.po?.poNumber ?? ""}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <style>
        @font-face { font-family:"TH Sarabun New"; src:url("${fontNormal}") format("truetype"); font-weight:normal; }
        @font-face { font-family:"TH Sarabun New"; src:url("${fontBold}")   format("truetype"); font-weight:bold;   }
        .preview-toolbar {
          position:fixed; top:0; left:0; right:0; height:48px;
          background:#; color:#4b0c10;
          display:flex; align-items:center; padding:0 16px; gap:10px;
          z-index:9999; font-family:'Sarabun',Arial,sans-serif; font-size:13px;
        }
        .toolbar-title { flex:1; font-weight:600; }
        .toolbar-btn { padding:6px 16px; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; display:flex; align-items:center; gap:6px; }
        .btn-pdf { background:#c0392b; color:#fff; }
        body { padding-top:48px; }
        @media print { .preview-toolbar { display:none !important; } body { padding-top:0 !important; } }
      </style>
    </head>
    <body>
      <div class="preview-toolbar">
        <span class="toolbar-title"></span>
        <button class="toolbar-btn btn-pdf" onclick="window.print()">📄 Save as PDF / Print</button>
      </div>
      ${renderedPages.join("\n")}
    </body>
    </html>`;

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(
        url,
        "_blank",
        "noopener,noreferrer,width=1100,height=850",
    );
    if (win) win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ═══════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════ */
const ExportPO: React.FC = () => {
    const { accounts, instance } = useMsal();
    const [poList, setPoList] = useState<POListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searched, setSearched] = useState(false);
    const [selectedPOs, setSelectedPOs] = useState<Set<string>>(new Set());
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailModalPOs, setEmailModalPOs] = useState<POListItem[]>([]);
    const [emailMode, setEmailMode] = useState<"individual" | "bulk">(
        "individual",
    );
    const [submitting, setSubmitting] = useState(false);
    const [resultModal, setResultModal] = useState<{
        show: boolean;
        variant: "success" | "error";
        message: string;
    }>({ show: false, variant: "success", message: "" });

    /* Pagination */
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);

    const getToken = () => accounts[0]?.idToken ?? "";
    const handleUnauthorized = () =>
        instance.logoutRedirect({ postLogoutRedirectUri: "/login" });

    /* ── Fetch ── */
    const fetchPOList = useCallback(
        async (p: number) => {
            if (!accounts[0]) return;
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: p.toString(),
                    pageSize: pageSize.toString(),
                    search: search.trim(),
                    fromDate,
                    toDate,
                });
                const res = await fetch(`${API_BASE}/api/po/list?${params}`, {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                if (res.status === 401) {
                    handleUnauthorized();
                    return;
                }
                if (!res.ok) throw new Error("Fetch PO list failed");
                const json = await res.json();
                setPoList(json.data);
                setTotal(json.total);
            } catch (err) {
                console.error(err);
                setPoList([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        },
        [accounts, search, fromDate, toDate],
    );

    useEffect(() => {
        if (searched) fetchPOList(page);
    }, [page, searched]);

    const handleSearch = () => {
        setPage(1);
        setSearched(true);
        setSelectedPOs(new Set());
        fetchPOList(1);
    };

    const handlePageChange = (event: { selected: number }) => {
        setSelectedPOs(new Set());
        setPage(event.selected + 1);
    };

    /* ── Select ── */
    const toggleSelect = (poNumber: string) =>
        setSelectedPOs((prev) => {
            const next = new Set(prev);
            next.has(poNumber) ? next.delete(poNumber) : next.add(poNumber);
            return next;
        });

    const toggleSelectAll = () =>
        setSelectedPOs(
            selectedPOs.size === poList.length
                ? new Set()
                : new Set(poList.map((p) => p.PONumber)),
        );

    const isAllSelected = poList.length > 0 && selectedPOs.size === poList.length;

    /* ── Preview ── */
    const handlePreview = async (poNumber: string) => {
        setPreviewLoading(poNumber);
        try {
            const res = await fetch(`${API_BASE}/api/po/detail/${poNumber}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.status === 401) {
                handleUnauthorized();
                return;
            }
            if (!res.ok) throw new Error("Fetch PO detail failed");
            const json = await res.json();
            if (!json.success) throw new Error(json.message);
            const totalAmount = json.data?.summary?.totalTHB
                ? parseFloat(String(json.data.summary.totalTHB).replace(/,/g, ""))
                : 0;
            json.data.summary.amountInWords = ThaiBahtText(totalAmount);
            openPreview(json.data);
        } catch (err) {
            console.error(err);
            alert("ไม่สามารถโหลดข้อมูล PO ได้");
        } finally {
            setPreviewLoading(null);
        }
    };

    /* ── Email ── */
    const openIndividualEmail = (po: POListItem) => {
        setEmailModalPOs([po]);
        setEmailMode("individual");
        setShowEmailModal(true);
    };

    const openBulkEmail = () => {
        setEmailModalPOs(poList.filter((p) => selectedPOs.has(p.PONumber)));
        setEmailMode("bulk");
        setShowEmailModal(true);
    };

    const handleSendEmail = async (payload: EmailPayload[]) => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/po/send-email`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`,
                },
                body: JSON.stringify({ emails: payload }),
            });
            const json = await res.json();
            setShowEmailModal(false);
            setResultModal({
                show: true,
                variant: json.success ? "success" : "error",
                message: json.success
                    ? `ส่ง Email สำเร็จ ${payload.length} รายการ`
                    : json.message || "เกิดข้อผิดพลาด",
            });
            if (json.success) setSelectedPOs(new Set());
        } catch (err: any) {
            setShowEmailModal(false);
            setResultModal({ show: true, variant: "error", message: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="card shadow-sm">
                {/* ── Card Header ── */}
                <div className="card-header bg-gold d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                        <i className="fas fa-file-invoice" />
                        Export PO
                    </h5>
                    <button
                        className="btn btn-sukishi btn-sm d-flex align-items-center gap-1"
                        disabled={selectedPOs.size === 0}
                        onClick={openBulkEmail}
                    >
                        <i className="fas fa-paper-plane" />
                        ส่ง Email ({selectedPOs.size})
                    </button>
                </div>

                {/* ── Search Bar ── */}
                <div className="card-body border-bottom py-3 bg-light">
                    <div className="row g-2">
                        <div className="col-md-3">
                            <input
                                className="form-control"
                                placeholder="PO Number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <div className="col-md-3">
                            <input
                                type="date"
                                className="form-control"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <input
                                type="date"
                                className="form-control"
                                value={toDate}
                                min={fromDate || undefined}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <button
                                className="btn btn-outline-primary w-100"
                                onClick={handleSearch}
                            >
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="card-body p-0">
                    <div
                        className="table-responsive overflow-y-auto"
                        style={{ maxHeight: "calc(100vh - 320px)" }}
                    >
                        <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="table-secondary sticky-top">
                                <tr>
                                    <th style={{ width: 40, paddingLeft: 16 }}>
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={isAllSelected}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th style={{ width: "10%" }}>PO Number</th>
                                    <th>Vendor Name</th>
                                    <th className="text-center" style={{ width: 160 }}>
                                        PO Date (DD/MM/YYYY)
                                    </th>
                                    <th style={{ width: 140 }} />
                                </tr>
                            </thead>

                            <tbody>
                                {/* ── ยังไม่ได้ Search ── */}
                                {!searched ? (
                                    <tr>
                                        <td colSpan={5} className="text-center text-muted py-5">
                                            กรุณากดปุ่ม Search เพื่อค้นหาข้อมูล
                                        </td>
                                    </tr>
                                ) : /* ── Skeleton loading ── */
                                    loading ? (
                                        Array(20)
                                            .fill(0)
                                            .map((_, i) => (
                                                <tr key={i}>
                                                    {Array(5)
                                                        .fill(0)
                                                        .map((__, j) => (
                                                            <td key={j}>
                                                                <p className="placeholder-glow mb-0">
                                                                    <span className="placeholder col-12 rounded" />
                                                                </p>
                                                            </td>
                                                        ))}
                                                </tr>
                                            ))
                                    ) : /* ── Data rows ── */
                                        poList.length > 0 ? (
                                            poList.map((po, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={
                                                        selectedPOs.has(po.PONumber) ? "table-warning" : ""
                                                    }
                                                    onClick={() => toggleSelect(po.PONumber)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <td
                                                        style={{ paddingLeft: 16 }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={selectedPOs.has(po.PONumber)}
                                                            onChange={() => toggleSelect(po.PONumber)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <span
                                                            className="fw-semibold"
                                                            style={{
                                                                fontSize: 13,
                                                                fontVariantNumeric: "tabular-nums",
                                                            }}
                                                        >
                                                            {po.PONumber}
                                                        </span>
                                                    </td>
                                                    <td className="text-truncate" style={{ maxWidth: 280 }}>
                                                        {po.VendorName || po.SupplierNo}
                                                    </td>
                                                    <td className="text-center text-nowrap">
                                                        {po.PODate
                                                            ? new Date(po.PODate).toLocaleDateString("th-TH")
                                                            : "-"}
                                                    </td>
                                                    <td
                                                        className="text-center"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="d-flex justify-content-center gap-1">
                                                            <button
                                                                className="btn btn-outline-secondary btn-sm"
                                                                title="Preview / Save PDF"
                                                                disabled={previewLoading === po.PONumber}
                                                                onClick={() => handlePreview(po.PONumber)}
                                                            >
                                                                {previewLoading === po.PONumber ? (
                                                                    <i className="fas fa-spinner fa-spin" />
                                                                ) : (
                                                                    <i className="fas fa-file-pdf" />
                                                                )}
                                                            </button>
                                                            <button
                                                                className="btn btn-sukishi btn-sm"
                                                                title="ส่ง Email"
                                                                onClick={() => openIndividualEmail(po)}
                                                            >
                                                                <i className="fas fa-envelope" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="text-center text-muted py-5">
                                                    <i className="fas fa-inbox fa-2x mb-3 d-block opacity-25" />
                                                    ไม่พบข้อมูล PO
                                                </td>
                                            </tr>
                                        )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="card-footer bg-light border-top py-2">
                    {searched && totalPages > 1 && (
                        <ReactPaginate
                            key={`paginate-${page}`}
                            pageCount={totalPages}
                            forcePage={page - 1}
                            onPageChange={handlePageChange}
                            containerClassName="pagination justify-content-center mb-1 mt-2"
                            pageClassName="page-item"
                            pageLinkClassName="page-link"
                            previousLabel="«"
                            nextLabel="»"
                            previousClassName="page-item me-1"
                            nextClassName="page-item ms-1"
                            previousLinkClassName="page-link"
                            nextLinkClassName="page-link"
                            activeClassName="active"
                        />
                    )}

                    <div
                        className="d-flex justify-content-between text-muted"
                        style={{ fontSize: 12.5 }}
                    >
                        <span>
                            {loading
                                ? "Loading..."
                                : total > 0 && searched
                                    ? `Show ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total} items`
                                    : ""}
                        </span>
                        <span>
                            {!loading &&
                                selectedPOs.size > 0 &&
                                `Selected ${selectedPOs.size} items`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ModalEmail
                show={showEmailModal}
                selectedPOs={emailModalPOs}
                mode={emailMode}
                submitting={submitting}
                onClose={() => setShowEmailModal(false)}
                onConfirm={handleSendEmail}
            />
            <ModalResult
                show={resultModal.show}
                variant={resultModal.variant}
                message={resultModal.message}
                onClose={() => setResultModal((r) => ({ ...r, show: false }))}
            />
        </>
    );
};

export default ExportPO;
