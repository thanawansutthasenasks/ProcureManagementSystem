import React from "react";

interface Props {
  show: boolean;
  prNumber: string | null;
  onClose: () => void;
}

const ModalSuccess: React.FC<Props> = ({ show, prNumber, onClose }) => {
  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header bg-danger text-white">

            <h5 className="modal-title"><i className="fa-regular fa-bell"></i>  Notication</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body text-center">
            <h5>PR created success</h5>
            <p className="mt-2">
              <strong>PR Number:</strong> {prNumber}
            </p>
          </div>

          <div className="modal-footer">
            <button className="btn btn-danger" onClick={onClose}>
              OK
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ModalSuccess;
