import React, { useEffect, useState } from "react";

// BaseModal

export interface BaseModalProps {
    show: boolean;
    // ขนาด dialog md (default) หรือตัวเลข px
    size?: "sm" | "md" | "lg" | "xl" | number;
    // เรียกเมื่อกด backdrop
    onClose: () => void;
    // ซ่อนปุ่ม × มุมขวาบน
    hideCloseButton?: boolean;
    // ปิดเมื่อคลิก backdrop (default: true)
    closeOnBackdrop?: boolean;
    children: React.ReactNode;
}

const SIZE_MAP: Record<string, number> = {
    sm: 300,
    md: 480,
    lg: 640,
    xl: 800,
};

export const BaseModal: React.FC<BaseModalProps> = ({
    show,
    size = "md",
    onClose,
    hideCloseButton = false,
    closeOnBackdrop = true,
    children,
}) => {
    if (!show) return null;

    const maxWidth = typeof size === "number" ? size : SIZE_MAP[size] ?? SIZE_MAP.md;

    return (
        <>
            <div className="modal-backdrop fade show" />
            <div
                className="modal fade show d-block"
                tabIndex={-1}
                role="dialog"
                onClick={e => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
            >
                <div
                    className="modal-dialog modal-dialog-centered"
                    style={{ maxWidth }}
                >
                    <div className="modal-content rounded-4 shadow position-relative">
                        {/* ปุ่ม × */}
                        {!hideCloseButton && (
                            <button
                                type="button"
                                className="btn-close position-absolute top-0 end-0 m-3"
                                style={{ zIndex: 1 }}
                                onClick={onClose}
                                aria-label="Close"
                            />
                        )}
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
};

// ModalResult

export type ResultVariant = "success" | "error" | "warning" | "info";

const RESULT_CONFIG: Record<
    ResultVariant,
    { icon: string; bgClass: string; textClass: string; defaultTitle: string }
> = {
    success: { icon: "fa-check", bgClass: "bg-success", textClass: "text-success", defaultTitle: "สำเร็จ" },
    error: { icon: "fa-times", bgClass: "bg-danger", textClass: "text-danger", defaultTitle: "เกิดข้อผิดพลาด" },
    warning: { icon: "fa-exclamation-triangle", bgClass: "bg-warning", textClass: "text-warning", defaultTitle: "แจ้งเตือน" },
    info: { icon: "fa-info", bgClass: "bg-info", textClass: "text-info", defaultTitle: "ข้อมูล" },
};

export interface ModalResultProps {
    show: boolean;
    variant?: ResultVariant;
    // ถ้าไม่ระบุ ใช้ default ของ variant
    title?: string;
    message: string;
    // ข้อความบนปุ่ม (default: "ตกลง")
    confirmLabel?: string;
    onClose: () => void;
}

export const ModalResult: React.FC<ModalResultProps> = ({
    show,
    variant = "info",
    title,
    message,
    confirmLabel = "ตกลง",
    onClose,
}) => {
    const cfg = RESULT_CONFIG[variant];

    return (
        <BaseModal show={show} size="sm" onClose={onClose}>
            <div className="modal-body text-center p-4 p-md-5">
                {/* Icon */}
                <div
                    className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 ${cfg.bgClass} bg-opacity-10 ${cfg.textClass}`}
                    style={{ width: 56, height: 56, fontSize: 22 }}
                >
                    <i className={`fas ${cfg.icon}`} />
                </div>

                <h5 className="fw-bold mb-2">{title ?? cfg.defaultTitle}</h5>
                <p className="text-muted mb-4" style={{ fontSize: 13.5 }}>{message}</p>

                <button
                    type="button"
                    className={`btn w-100 ${variant === "success" ? "btn-success" : variant === "error" ? "btn-danger" : variant === "warning" ? "btn-warning" : "btn-info"}`}
                    onClick={onClose}
                >
                    {confirmLabel}
                </button>
            </div>
        </BaseModal>
    );
};

// ModalConfirm

export interface ModalConfirmProps {
    show: boolean;
    variant?: ResultVariant;
    title?: string;
    message: string;
    // ข้อความปุ่มยืนยัน (default: "ยืนยัน")
    confirmLabel?: string;
    // ข้อความปุ่มยกเลิก (default: "ยกเลิก")
    cancelLabel?: string;
    // แสดง spinner บนปุ่มยืนยัน
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export const ModalConfirm: React.FC<ModalConfirmProps> = ({
    show,
    variant = "warning",
    title,
    message,
    confirmLabel = "ยืนยัน",
    cancelLabel = "ยกเลิก",
    loading = false,
    onConfirm,
    onClose,
}) => {
    const cfg = RESULT_CONFIG[variant];
    const btnClass =
        variant === "error" ? "btn-danger" :
            variant === "success" ? "btn-success" :
                variant === "info" ? "btn-info" :
                    "btn-warning";

    return (
        <BaseModal show={show} size="sm" onClose={onClose} closeOnBackdrop={!loading}>
            <div className="modal-body text-center p-4 p-md-5">
                {/* Icon */}
                <div
                    className={`rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 ${cfg.bgClass} bg-opacity-10 ${cfg.textClass}`}
                    style={{ width: 56, height: 56, fontSize: 22 }}
                >
                    <i className={`fas ${cfg.icon}`} />
                </div>

                <h5 className="fw-bold mb-2">{title ?? cfg.defaultTitle}</h5>
                <p className="text-muted mb-4" style={{ fontSize: 13.5 }}>{message}</p>

                <div className="d-flex gap-2 justify-content-center">
                    <button
                        type="button"
                        className="btn btn-outline-secondary flex-fill"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`btn ${btnClass} flex-fill d-flex align-items-center justify-content-center gap-2`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading && <i className="fas fa-spinner fa-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};

// ModalEmail  (PO-specific)

export interface EmailPayload {
    poNumber: string;
    to: string;
    cc: string;
}

export interface POListItem {
    PONumber: string;
    [key: string]: any;
    VendorEmail?: string;
}

export interface ModalEmailProps {
    show: boolean;
    // รายการ PO ที่จะส่ง
    selectedPOs: POListItem[];
    mode: "individual" | "bulk";
    submitting: boolean;
    onClose: () => void;
    onConfirm: (payload: EmailPayload[]) => Promise<void>;
}

const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const ModalEmail: React.FC<ModalEmailProps> = ({
    show,
    selectedPOs,
    mode,
    submitting,
    onClose,
    onConfirm,
}) => {
    const [to, setTo] = useState("");
    const [cc, setCc] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (show) {
            // เช็กว่าถ้าเลือกอันเดียว และ PO ใบแรกมี VendorEmail ให้ใช้อันนั้น
            const contactEmail = selectedPOs[0]?.VendorEmail;

            if (mode === "individual" && contactEmail) {
                setTo(contactEmail);
            } else {
                // ถ้าไม่มีอีเมล หรือเป็นโหมด Bulk ส่งหลายใบ ให้ค่า Default เป็นเมลนี้
                setTo("");
            }

            setCc("");
            setError("");
        }
    }, [show, selectedPOs, mode]);

    const handleConfirm = async () => {
        if (!to.trim()) { setError("กรุณากรอก Email ผู้รับ"); return; }

        const toList = to.split(",").map(e => e.trim());
        if (toList.some(e => !validateEmail(e))) { setError("รูปแบบ Email ไม่ถูกต้อง"); return; }

        if (cc.trim()) {
            const ccList = cc.split(",").map(e => e.trim());
            if (ccList.some(e => !validateEmail(e))) { setError("รูปแบบ Email CC ไม่ถูกต้อง"); return; }
        }

        setError("");
        await onConfirm(
            selectedPOs.map(po => ({ poNumber: po.PONumber, to: to.trim(), cc: cc.trim() }))
        );
    };

    return (
        <BaseModal show={show} size="md" onClose={onClose} closeOnBackdrop={!submitting}>
            {/* Header */}
            <div className="modal-header">
                <div className="d-flex align-items-center gap-3">
                    <div
                        className="rounded-3 bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 38, height: 38, fontSize: 16 }}
                    >
                        <i className="fas fa-envelope" />
                    </div>
                    <div>
                        <h5 className="modal-title fw-bold mb-0" style={{ fontSize: 15 }}>
                            ส่ง PO ทาง Email
                        </h5>
                        <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>
                            {mode === "bulk"
                                ? `${selectedPOs.length} รายการที่เลือก`
                                : `PO: ${selectedPOs[0]?.PONumber}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="modal-body d-flex flex-column gap-3">
                {/* PO chips (bulk) */}
                {mode === "bulk" && selectedPOs.length > 0 && (
                    <div className="d-flex flex-wrap gap-2">
                        {selectedPOs.map(po => (
                            <span
                                key={po.PONumber}
                                className="badge rounded-pill text-bg-light border fw-normal"
                                style={{ fontSize: 12 }}
                            >
                                <i className="fas fa-file-invoice me-1" />
                                {po.PONumber}
                            </span>
                        ))}
                    </div>
                )}

                {/* To */}
                <div>
                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                        Email ผู้รับ <span className="text-danger">*</span>
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="example@company.com, another@company.com"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        disabled={submitting}
                    />
                    <div className="form-text">คั่นหลาย email ด้วย comma ( , )</div>
                </div>

                {/* CC */}
                <div>
                    <label className="form-label fw-semibold" style={{ fontSize: 13 }}>
                        CC (ถ้ามี)
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="cc@company.com"
                        value={cc}
                        onChange={e => setCc(e.target.value)}
                        disabled={submitting}
                    />
                    <div className="form-text">คั่นหลาย email ด้วย comma ( , )</div>
                </div>

                {/* Error */}
                {error && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-0" role="alert">
                        <i className="fas fa-exclamation-circle flex-shrink-0" />
                        <span style={{ fontSize: 13 }}>{error}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={onClose}
                    disabled={submitting}
                >
                    ยกเลิก
                </button>
                <button
                    type="button"
                    className="btn btn-danger d-flex align-items-center gap-2"
                    onClick={handleConfirm}
                    disabled={submitting}
                >
                    {submitting
                        ? <><i className="fas fa-spinner fa-spin" />กำลังส่ง...</>
                        : <><i className="fas fa-paper-plane" />ส่ง Email</>}
                </button>
            </div>
        </BaseModal>
    );
};