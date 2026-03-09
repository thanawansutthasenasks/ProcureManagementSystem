import React from "react";

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
    if (!show || !prNumber) return null;

    return (
        <>

            <div className="modal-backdrop fade show"></div>


            <div className="modal fade show d-block" tabIndex={-1}>
                <div className="modal-dialog modal-dialog-centered modal-md">
                    <div className="modal-content shadow border-0">


                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">Confirm Cancel PR</h5>
                            <button
                                type="button"
                                className="btn-close btn-close-white"
                                onClick={onClose}
                            />
                        </div>

                        <div className="modal-body text-center">
                            <p className="fw-semibold mb-3">
                                คุณต้องการยกเลิก PR หมายเลข
                            </p>

                            <h4 className="text-danger mb-3">{prNumber}</h4>


                        </div>


                        <div className="modal-footer justify-content-end">
                            <button
                                className="btn btn-danger px-4"
                                disabled={submitting}
                                onClick={() => {
                                    if (prNumber) {
                                        onConfirm(prNumber);
                                    }
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        กำลังยกเลิก...
                                    </>
                                ) : (
                                    "Confirm"
                                )}
                            </button>

                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default ModalCancelSap;
