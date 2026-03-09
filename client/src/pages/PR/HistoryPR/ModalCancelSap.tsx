import React from "react";
import { Button } from "antd";
import { ExclamationCircleFilled } from "@ant-design/icons";
import { BaseModal } from "../../../components/Modals";

// 🌟 Config: ตั้งค่าคำของปุ่มได้ที่นี่
const BUTTON_CONFIG = {
    cancel: "Cancel",
    confirm: "Confirm",
    loading: "Processing..."
};

interface ModalCancelSapProps {
    show: boolean;
    prNumber: string | null;
    submitting: boolean;
    onClose: () => void;
    onConfirm: (prNumber: string) => void;
}

const ModalCancelSap: React.FC<ModalCancelSapProps> = ({
    show,
    prNumber,
    submitting,
    onClose,
    onConfirm,
}) => {
    // ❌ ลบบรรทัด if (!show || !prNumber) return null; ออกไปแล้ว

    return (
        <BaseModal show={show} size="sm" onClose={onClose} closeOnBackdrop={!submitting}>
            <div className="flex flex-col items-center text-center px-4 py-6 gap-3">

                {/* Icon */}
                <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: "#ef44441a" }}
                >
                    <ExclamationCircleFilled style={{ fontSize: 28, color: "#ef4444" }} />
                </div>

                {/* Text */}
                <div className="space-y-2">
                    <h5 className="text-base font-bold m-0" style={{ color: "var(--color-text)" }}>
                        Confirm Cancel PR
                    </h5>
                    <p className="text-sm m-0 mt-1" style={{ color: "var(--color-text-sub)" }}>
                        คุณต้องการยกเลิก PR หมายเลข
                    </p>
                    <p className="text-lg font-bold m-0 mt-1" style={{ color: "#ef4444" }}>
                        {prNumber}
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 w-full mt-2">
                    <Button block onClick={onClose} disabled={submitting}>
                        {BUTTON_CONFIG.cancel}
                    </Button>
                    <Button
                        block danger type="primary"
                        loading={submitting}
                        onClick={() => prNumber && onConfirm(prNumber)}
                    >
                        {submitting ? BUTTON_CONFIG.loading : BUTTON_CONFIG.confirm}
                    </Button>
                </div>

            </div>
        </BaseModal>
    );
};

export default ModalCancelSap;