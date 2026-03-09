import React, { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import "bootstrap/dist/css/bootstrap.min.css";
//
import ModalCancelSap from "./ModalCancelSap";
import OutletSelect from "../../../components/OutletSelect";
import type { Outlet } from "../../../components/OutletSelect";
import { useMsal } from "@azure/msal-react";
const API_BASE = "http://localhost:3001";
interface PRItem {
  prNumber: string;
  pr_date: string;
  line_item: string;
  Material: string;
  Material_Description: string;
  qty: number;
  Base_Unit_of_Measure: string;
  Plant: string;
  Name_1: string;
  status_d: number;
  vendorId: string;
  vendorName: string;
}

const ReportPR: React.FC = () => {
  const [data, setData] = useState<PRItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [prNumber, setPrNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10; //  10 PR ต่อหน้า
  const [total, setTotal] = useState(0);
  const { accounts } = useMsal();
  const claims: any = accounts[0]?.idTokenClaims;
  const roles: string[] = claims?.roles || [];

  const isAdmin = roles.includes("Admin");
  const isOutlet = roles.includes("outlet");
  const [searched, setSearched] = useState(false);
  const [, setSearchKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  useEffect(() => {
    const fetchOutlets = async () => {
      if (!accounts[0]) return;

      const token = accounts[0].idToken;
      const claims: any = accounts[0].idTokenClaims;
      const roles: string[] = claims?.roles || [];

      const email =
        accounts[0].username ||
        claims?.preferred_username ||
        "";

      const outletCode = email.split(".")[0].trim();

      const url = roles.includes("Admin")
        ? `${API_BASE}/api/outlet/list`
        : `${API_BASE}/api/outlet/me?outletCode=${outletCode}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      setOutlets(Array.isArray(json) ? json : [json]);
    };

    fetchOutlets();
  }, [accounts]);

  useEffect(() => {
    if (!accounts[0]) return;
    if (outlets.length === 0) return;

    const claims: any = accounts[0].idTokenClaims;
    const roles: string[] = claims?.roles || [];

    // ทำเฉพาะ user role outlet
    if (!roles.includes("outlet")) return;

    const email: string =
      claims?.preferred_username || claims?.email || "";

    if (!email) return;

    const outletCode = email.split(".")[0].trim();

    const matchedOutlet = outlets.find(
      o => o.outletcode?.trim() === outletCode
    );

    if (matchedOutlet) {
      setSelectedOutlet(matchedOutlet);
    }
  }, [accounts, outlets]);
  useEffect(() => {
    if (!selectedOutlet) return;
    if (!accounts[0]) return;

    const claims: any = accounts[0].idTokenClaims;
    const roles: string[] = claims?.roles || [];

    // auto search เฉพาะ role outlet
    if (!roles.includes("outlet")) return;

    setPage(1);
    setSearchKey(prev => prev + 1);
    setSearched(true);
    loadData();
  }, [selectedOutlet, accounts]);


  const loadData = async () => {
    setLoading(true);

    const params = new URLSearchParams({
      prNumber,
      fromDate,
      toDate,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (selectedOutlet?.plant) {
      params.append("plant", selectedOutlet.plant);
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/history/pr?${params}`
      );
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
      setExpanded({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searched) {
      setPage(1);
      setSearchKey(prev => prev + 1);
    }
  }, [selectedOutlet]);


  const groupedArray = Object.values(
    data.reduce<Record<string, PRItem[]>>((acc, row) => {
      acc[row.prNumber] = acc[row.prNumber] || [];
      acc[row.prNumber].push(row);
      return acc;
    }, {})
  ).sort((a, b) => {
    return (
      new Date(b[0].pr_date).getTime() -
      new Date(a[0].pr_date).getTime()
    );
  });

  const toggle = (pr: string) => {
    setExpanded(prev => ({ ...prev, [pr]: !prev[pr] }));
  };

  const formatDate = (d: string) =>
    new Date(d.replace(" ", "T")).toLocaleDateString("th-TH");

  const totalPages = Math.ceil(total / pageSize);


  const confirmCancelPR = async (prNumber: string) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/api/sap/cancelpr2sap`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accounts[0].idToken}`,
          },
          body: JSON.stringify({ prNumber }),
        }
      );

      if (!res.ok) {
        throw new Error("Cancel failed");
      }

      setShowCancelModal(false);
      setSelectedPR(null);
      loadData();
    } catch (err) {
      alert("ไม่สามารถยกเลิก PR ได้");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (searched) {
      loadData();
    }
  }, [page]);

  const isOver24H = (prDate: string) => {
    if (!prDate) return false;

    const prTime = new Date(prDate.replace(" ", "T")).getTime();
    const now = Date.now();

    return now - prTime > 24 * 60 * 60 * 1000;
  };

  return (

    <div className="card shadow-sm">
      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">

              {/* ===== ADMIN: เลือกสาขาได้ ===== */}
              {isAdmin && (
                <OutletSelect
                  outlets={outlets}
                  value={selectedOutlet}
                  onChange={setSelectedOutlet}
                />
              )}

              {isOutlet && selectedOutlet && (
                <input
                  className="form-control"
                  value={`${selectedOutlet.outletcode} - ${selectedOutlet.outletname}`}
                  disabled
                />
              )}

            </div>

          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        {/* <div className="card-header bg-dark text-white">
          <h6 className="mb-0">Top 10 Material (By Qty)</h6>
          <small className="text-white-50">
            {fromDate || "All"} - {toDate || "All"}
          </small>
        </div> */}

        {/* <div className="card-body">

          <TopMaterialChart
            fromDate={fromDate}
            toDate={toDate}
            plant={selectedOutlet?.plant}
            searchKey={searchKey}
          />
        </div> */}

      </div>
      <div className="card-header bg-gold text-white">
        <h5 className="mb-0">PR Report</h5>
      </div>

      <div className="card-body">
        {/* ===== SEARCH ===== */}
        <div className="row g-2 mb-3">
          <div className="col-md-3">
            <input
              className="form-control"
              placeholder="PR Number"
              value={prNumber}
              onChange={e => setPrNumber(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <input
              type="date"
              className="form-control"
              value={toDate}
              min={fromDate || undefined}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <button
              className="btn btn-outline-primary w-100"
              onClick={() => {
                console.log("SELECTED OUTLET:", selectedOutlet);
                setPage(1);
                setSearchKey(prev => prev + 1);
                setSearched(true);
                loadData();
              }}
            >
              Search
            </button>
          </div>
        </div>

        {loading && <div className="text-center py-4">Loading...</div>}


        {!loading &&
          groupedArray.map(items => {
            const prNumber = items[0].prNumber;
            const over24H = isOver24H(items[0].pr_date);
            const isCanceled = items[0].status_d === 0;
            return (

              <div key={prNumber} className="mb-3 border rounded">
                <div
                  className="d-flex justify-content-between align-items-center px-3 py-2 bg-light"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggle(prNumber)}
                >
                  <div className={isCanceled ? "text-danger" : ""}>
                    <strong>PR :</strong> {prNumber}
                    <span className={`ms-3 ${isCanceled ? "text-danger" : "text-muted"}`}>
                      <strong>Date :</strong> {formatDate(items[0].pr_date)}
                    </span>
                    <span className="ms-3">
                      <strong>Vendor :</strong> {items[0].vendorName}
                    </span>

                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span
                      className={`badge ${isCanceled ? "bg-danger" : "bg-secondary"}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => toggle(prNumber)}
                    >
                      {expanded[prNumber] ? "Hide" : "Show"}
                    </span>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      disabled={over24H || isCanceled}
                      onClick={e => {
                        e.stopPropagation();
                        if (over24H || isCanceled) return;
                        setSelectedPR(prNumber);
                        setShowCancelModal(true);
                      }}
                    >
                      Cancel
                    </button>

                  </div>
                </div>

                {expanded[prNumber] && (
                  <div className="table-responsive">
                    <table className="table table-sm table-striped mb-0">
                      <thead className="table-dark">
                        <tr>
                          <th>Line</th>
                          <th>Material</th>
                          <th>Description</th>
                          <th className="text-center">Qty</th>
                          <th className="text-center">Unit</th>
                          <th className="text-center">Plant</th>
                          <th>Plant Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(row => (
                          <tr key={row.line_item}>
                            <td className="text-center">{row.line_item}</td>
                            <td>{row.Material}</td>
                            <td>{row.Material_Description}</td>
                            <td className="text-center">{row.qty}</td>
                            <td className="text-center">
                              {row.Base_Unit_of_Measure}
                            </td>
                            <td className="text-center">{row.Plant}</td>
                            <td>{row.Name_1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        }


        {searched && totalPages > 1 && (
          <ReactPaginate
            pageCount={totalPages}
            forcePage={page - 1}
            onPageChange={e => setPage(e.selected + 1)}
            containerClassName="pagination justify-content-center mt-3"
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
      </div>
      <ModalCancelSap
        show={showCancelModal}
        prNumber={selectedPR}
        submitting={loading}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedPR(null);
        }}
        onConfirm={confirmCancelPR}
      />

    </div>
  );
};

export default ReportPR;