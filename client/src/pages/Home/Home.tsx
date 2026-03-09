import React from "react";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      
      className="d-flex justify-content-center align-items-center"
    >
      <div className="container">
        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="fw-bold display-5 text-dark">
            Procure Management System
          </h1>
        
        </div>

        {/* Cards */}
        <div className="row justify-content-center g-4">
          <div className="col-md-4 col-sm-6">
            <div
              className="card modern-card text-center h-100"
              onClick={() => navigate("/createPR")}
            >
              <div className="card-body">
                <div className="icon-circle bg-success">
                  <i className="fas fa-plus"></i>
                </div>
                <h5 className="fw-bold mt-3">Create PR</h5>
                <p className="text-muted">สร้างใบขอซื้อสินค้าใหม่</p>
              </div>
            </div>
          </div>

          <div className="col-md-4 col-sm-6">
            <div
              className="card modern-card text-center h-100"
              onClick={() => navigate("/HistoryPR")}
            >
              <div className="card-body">
                <div className="icon-circle bg-primary">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <h5 className="fw-bold mt-3">History PR</h5>
                <p className="text-muted">ดูประวัติใบขอซื้อย้อนหลัง</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        body {
          margin: 0;
          overflow: hidden;
        }

        .modern-card {
          cursor: pointer;
          border: none;
          border-radius: 20px;
          padding: 20px;
          background: rgba(255,255,255,0.9);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          height: 260px;
        }

        .modern-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 15px 35px rgba(0,0,0,0.15);
        }

        .icon-circle {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 28px;
          margin: auto;
        }
      `}</style>
    </div>
  );
};

export default Home;
