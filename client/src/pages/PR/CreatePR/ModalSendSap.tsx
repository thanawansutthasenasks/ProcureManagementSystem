import React from "react";
import { Button } from "antd";
import { WarningFilled, CloudUploadOutlined } from "@ant-design/icons";
import { BaseModal } from "../../../components/Modals";

// 🌟 Config: ตั้งค่าคำของปุ่มได้ที่นี่เลยครับ (อยากเปลี่ยนเป็นไทยก็แก้ตรงนี้)
const BUTTON_CONFIG = {
  cancel: "Cancel",
  confirm: "Confirm",
  loading: "Processing..."
};

interface ModalSendSapProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
  itemCount: number;
  docDate: string;
  deliveryDate: string;
  vendorId: string;
  vendorName: string;
}

const ModalSendSap: React.FC<ModalSendSapProps> = ({
  show,
  onClose,
  onConfirm,
  submitting,
  itemCount,
  docDate,
  deliveryDate,
  vendorId,
  vendorName,
}) => {
  // ❌ ลบบรรทัด if (!show) return null; ออกไปแล้ว เพื่อให้แอนิเมชันตอนปิดทำงาน

  const rows = [
    { label: "จำนวนรายการ", value: String(itemCount) },
    { label: "Doc Date", value: docDate },
    { label: "Delivery Date", value: deliveryDate },
    { label: "Vendor", value: vendorId ? `${vendorId} - ${vendorName}` : "-" },
  ];

  return (
    <BaseModal show={show} size="md" onClose={onClose} closeOnBackdrop={!submitting}>
      {/* Header */}
      <div
        className="flex items-center gap-3 pb-4 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "#f59e0b1a", color: "#f59e0b" }}
        >
          <WarningFilled style={{ fontSize: 16 }} />
        </div>
        <div>
          <p className="font-semibold text-sm m-0" style={{ color: "var(--color-text)" }}>
            ยืนยันการส่ง PR ไปยัง SAP
          </p>
          <p className="text-xs m-0 mt-0.5" style={{ color: "var(--color-text-sub)" }}>
            กรุณาตรวจสอบข้อมูลก่อนยืนยัน
          </p>
        </div>
      </div>

      {/* Body — summary rows */}
      <div className="py-4">
        <div
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: "var(--color-border)" }}
        >
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-3 text-sm ${i < rows.length - 1
                ? "border-b"
                : ""
                }`}
              style={{
                borderColor: "var(--color-border)",
                background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-card)",
              }}
            >
              <span style={{ color: "var(--color-text-sub)" }}>{row.label}</span>
              <span className="font-semibold" style={{ color: "var(--color-text)" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex justify-end gap-2 pt-4 border-t"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Button onClick={onClose} disabled={submitting}>
          {BUTTON_CONFIG.cancel}
        </Button>
        <Button
          type="primary"
          loading={submitting}
          icon={!submitting ? <CloudUploadOutlined /> : undefined}
          onClick={onConfirm}
        >
          {submitting ? BUTTON_CONFIG.loading : BUTTON_CONFIG.confirm}
        </Button>
      </div>
    </BaseModal>
  );
};

export default ModalSendSap;