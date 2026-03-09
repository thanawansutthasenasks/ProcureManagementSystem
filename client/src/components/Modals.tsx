import React, { useEffect, useState } from "react";
import { Modal, Button, Input } from "antd";
import {
    CheckCircleFilled,
    CloseCircleFilled,
    ExclamationCircleFilled,
    InfoCircleFilled,
    MailOutlined,
    FileProtectOutlined,
} from "@ant-design/icons";

// ─── BaseModal ─────────────────────────────────────────────────────────────────

export interface BaseModalProps {
    show: boolean;
    size?: "sm" | "md" | "lg" | "xl" | number;
    onClose: () => void;
    hideCloseButton?: boolean;
    closeOnBackdrop?: boolean;
    children: React.ReactNode;
}

const SIZE_MAP: Record<string, number> = {
    sm: 360,
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
    const width = typeof size === "number" ? size : (SIZE_MAP[size] ?? SIZE_MAP.md);

    return (
        <Modal
            open={show}
            onCancel={onClose}
            footer={null}
            width={width}
            closable={!hideCloseButton}
            // mask={{ closable: closeOnBackdrop }}
            destroyOnHidden
            centered
            transitionName="ant-zoom"
            maskTransitionName="ant-fade"
        >
            {children}
        </Modal>
    );
};

// ─── ModalResult ───────────────────────────────────────────────────────────────

export type ResultVariant = "success" | "error" | "warning" | "info";

const RESULT_CONFIG: Record<
    ResultVariant,
    { icon: React.ReactNode; color: string; defaultTitle: string }
> = {
    success: {
        icon: <CheckCircleFilled style={{ fontSize: 28, color: "#22c55e" }} />,
        color: "#22c55e",
        defaultTitle: "สำเร็จ",
    },
    error: {
        icon: <CloseCircleFilled style={{ fontSize: 28, color: "#ef4444" }} />,
        color: "#ef4444",
        defaultTitle: "เกิดข้อผิดพลาด",
    },
    warning: {
        icon: <ExclamationCircleFilled style={{ fontSize: 28, color: "#f59e0b" }} />,
        color: "#f59e0b",
        defaultTitle: "แจ้งเตือน",
    },
    info: {
        icon: <InfoCircleFilled style={{ fontSize: 28, color: "#6366f1" }} />,
        color: "#6366f1",
        defaultTitle: "ข้อมูล",
    },
};

export interface ModalResultProps {
    show: boolean;
    variant?: ResultVariant;
    title?: string;
    message: string;
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
            <div className="flex flex-col items-center text-center px-4 py-6 gap-3">
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: `${cfg.color}18` }}
                >
                    {cfg.icon}
                </div>
                <div className="space-y-1">
                    <h5 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                        {title ?? cfg.defaultTitle}
                    </h5>
                    <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>
                        {message}
                    </p>
                </div>
                <Button
                    type="primary"
                    block
                    onClick={onClose}
                    style={{ background: cfg.color, borderColor: cfg.color, marginTop: 4 }}
                >
                    {confirmLabel}
                </Button>
            </div>
        </BaseModal>
    );
};

// ─── ModalConfirm ──────────────────────────────────────────────────────────────

export interface ModalConfirmProps {
    show: boolean;
    variant?: ResultVariant;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
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

    return (
        <BaseModal show={show} size="sm" onClose={onClose} closeOnBackdrop={!loading}>
            <div className="flex flex-col items-center text-center px-4 py-6 gap-3">
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: `${cfg.color}18` }}
                >
                    {cfg.icon}
                </div>
                <div className="space-y-1">
                    <h5 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                        {title ?? cfg.defaultTitle}
                    </h5>
                    <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>
                        {message}
                    </p>
                </div>
                <div className="flex gap-2 w-full mt-1">
                    <Button block onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        block
                        type="primary"
                        loading={loading}
                        onClick={onConfirm}
                        style={{ background: cfg.color, borderColor: cfg.color }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

// ─── ModalEmail ────────────────────────────────────────────────────────────────

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
            const contactEmail = selectedPOs[0]?.VendorEmail;
            setTo(mode === "individual" && contactEmail ? contactEmail : "");
            setCc("");
            setError("");
        }
    }, [show, selectedPOs, mode]);

    const handleConfirm = async () => {
        if (!to.trim()) { setError("กรุณากรอก Email ผู้รับ"); return; }
        const toList = to.split(",").map((e) => e.trim());
        if (toList.some((e) => !validateEmail(e))) { setError("รูปแบบ Email ไม่ถูกต้อง"); return; }
        if (cc.trim()) {
            const ccList = cc.split(",").map((e) => e.trim());
            if (ccList.some((e) => !validateEmail(e))) { setError("รูปแบบ Email CC ไม่ถูกต้อง"); return; }
        }
        setError("");
        await onConfirm(
            selectedPOs.map((po) => ({ poNumber: po.PONumber, to: to.trim(), cc: cc.trim() }))
        );
    };

    return (
        <BaseModal show={show} size="md" onClose={onClose} closeOnBackdrop={!submitting}>
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "var(--color-border)" }}>
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#ef44441a", color: "#ef4444" }}
                >
                    <MailOutlined style={{ fontSize: 16 }} />
                </div>
                <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                        ส่ง PO ทาง Email
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-sub)" }}>
                        {mode === "bulk"
                            ? `${selectedPOs.length} รายการที่เลือก`
                            : `PO: ${selectedPOs[0]?.PONumber}`}
                    </p>
                </div>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4">
                {mode === "bulk" && selectedPOs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {selectedPOs.map((po) => (
                            <span
                                key={po.PONumber}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border"
                                style={{
                                    background: "var(--color-surface)",
                                    borderColor: "var(--color-border)",
                                    color: "var(--color-text-sub)",
                                }}
                            >
                                <FileProtectOutlined style={{ fontSize: 11 }} />
                                {po.PONumber}
                            </span>
                        ))}
                    </div>
                )}
                <div className="space-y-1">
                    <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        Email ผู้รับ <span className="text-red-500">*</span>
                    </label>
                    <Input
                        placeholder="example@company.com, another@company.com"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        disabled={submitting}
                    />
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        คั่นหลาย email ด้วย comma ( , )
                    </p>
                </div>
                <div className="space-y-1">
                    <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        CC (ถ้ามี)
                    </label>
                    <Input
                        placeholder="cc@company.com"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        disabled={submitting}
                    />
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        คั่นหลาย email ด้วย comma ( , )
                    </p>
                </div>
                {error && (
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                        style={{ background: "#fee2e2", color: "#be123c" }}
                    >
                        <ExclamationCircleFilled style={{ fontSize: 13, flexShrink: 0 }} />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                <Button onClick={onClose} disabled={submitting}>ยกเลิก</Button>
                <Button
                    type="primary"
                    danger
                    loading={submitting}
                    icon={!submitting ? <MailOutlined /> : undefined}
                    onClick={handleConfirm}
                >
                    {submitting ? "กำลังส่ง..." : "ส่ง Email"}
                </Button>
            </div>
        </BaseModal>
    );
};