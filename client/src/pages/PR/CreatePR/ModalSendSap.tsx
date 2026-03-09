import React from "react";
import { BaseModal } from "../../../components/Modals";

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
  if (!show) return null;

  return (
    <BaseModal show={show} size="md" onClose={onClose} closeOnBackdrop={!submitting}>

      {/* Header */}
      <div className="modal-header">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 bg-warning bg-opacity-10 text-warning d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 38, height: 38, fontSize: 16 }}
          >
            <i className="fa-regular fa-bell" />
          </div>
          <div>
            <h5 className="modal-title fw-bold mb-0" style={{ fontSize: 15 }}>
              ยืนยันการส่ง PR ไปยัง SAP
            </h5>
            <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>
              กรุณาตรวจสอบข้อมูลก่อนยืนยัน
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="modal-body">
        <ul className="list-group list-group-flush">
          <li className="list-group-item d-flex justify-content-between">
            <span className="text-muted">จำนวนรายการ</span>
            <strong>{itemCount}</strong>
          </li>
          <li className="list-group-item d-flex justify-content-between">
            <span className="text-muted">Doc Date</span>
            <strong>{docDate}</strong>
          </li>
          <li className="list-group-item d-flex justify-content-between">
            <span className="text-muted">Delivery Date</span>
            <strong>{deliveryDate}</strong>
          </li>
          <li className="list-group-item d-flex justify-content-between">
            <span className="text-muted">Vendor</span>
            <strong>{vendorId ? `${vendorId} - ${vendorName}` : "-"}</strong>
          </li>
        </ul>
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
          className="btn btn-sukishi px-4 d-flex align-items-center gap-2"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? (
            <><span className="spinner-border spinner-border-sm" />กำลังส่ง...</>
          ) : (
            <><i className="fa-solid fa-upload" />Confirm</>
          )}
        </button>
      </div>

    </BaseModal>
  );
};

export default ModalSendSap;