import React, { useState, useEffect } from "react";
import ModalSendSap from "./ModalSendSap";
// import ModalSuccess from "./ModalSuccess";
import { ModalResult } from "../../../components/Modals";
import "bootstrap/dist/css/bootstrap.min.css";
import { useMsal } from "@azure/msal-react";
import OutletSelect from "../../../components/OutletSelect";
import type { Outlet } from "../../../components/OutletSelect";

const API_BASE = "http://localhost:3001";
interface Material {
  Plant: string;
  Name_1: string;
  Distribution_Channel: string;
  Material_Type: string;
  Material: string;
  Material_Description: string;
  Base_Unit_of_Measure: string;
  Material_Group: string;
  Material_grp_desc_2: string;
  net_price: number;
  pdt: number;
  standard_qty: number;
}

interface AddedMaterial extends Material {
  lineItem: string;
  qty: number;
}
interface Vendor {
  VendorID: string;
  Name: string;
  Description: string;
}


const today = new Date().toISOString().split("T")[0];


const CreatePR: React.FC = () => {
  const [search, setSearch] = useState("");
  const [dataSource, setDataSource] = useState<Material[]>([]);
  const [added, setAdded] = useState<AddedMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQty, setSearchQty] = useState<Record<string, number>>({});
  const [docDate] = useState<string>(today); // ห้ามแก้
  const [deliveryDate, setDeliveryDate] = useState<string>(today);
  const [submitting, setSubmitting] = useState(false);
  const [resultMesge, setResultMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [prNumber, setPrNumber] = useState<string | null>(null);
  const { accounts } = useMsal();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor] = useState<string>("");
  const [minDeliveryDate, setMinDeliveryDate] = useState<string>(today);
  const selectedVendorName =
    vendors.find(v => v.VendorID === selectedVendor)?.Name || "";
  const roles =
    (accounts[0]?.idTokenClaims?.roles as string[]) || [];

  const isAdmin = roles.includes("Admin");
  useEffect(() => {
    if (!accounts[0]) return;
    if (isAdmin) return;

    const email =
      accounts[0].username ||
      accounts[0].idTokenClaims?.preferred_username;

    if (!email) return;

    const outletCode = email.split("@")[0].split(".")[0].toUpperCase();


    setSelectedOutlet({
      outletcode: outletCode,
      outletname: outletCode,
      plant: ""
    });
  }, [accounts, isAdmin]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const { instance } = useMsal();

  const handleUnauthorized = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: "/login",
    });
  };
  useEffect(() => {
    if (!accounts[0]) return;


    if (!isAdmin) {
      fetchMaterial();
    }
  }, [accounts, isAdmin]);
  useEffect(() => {
    if (isAdmin) return;
    if (!dataSource.length) return;
    if (!selectedOutlet) return;
    if (selectedOutlet.plant) return;

    const plant = dataSource[0].Plant;

    setSelectedOutlet(prev =>
      prev ? { ...prev, plant } : prev
    );
  }, [dataSource, selectedOutlet, isAdmin]);


  const fetchMaterial = async (plant?: string) => {
    if (!accounts[0]) return;

    setLoading(true);
    try {
      const token = accounts[0].idToken;

      const url = plant
        ? `${API_BASE}/api/t_Material?plant=${plant}`
        : `${API_BASE}/api/t_Material`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) throw new Error("Unauthorized");

      const json: Material[] = await res.json();
      setDataSource(json);
    } catch (err) {
      console.error(err);
      setDataSource([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accounts[0]) return;

    const fetchVendors = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/vendor/list`, {
          headers: {
            Authorization: `Bearer ${accounts[0].idToken}`,
          },
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        const json = await res.json();
        setVendors(json);
      } catch (err) {
        console.error("fetch vendor failed", err);
      }
    };

    fetchVendors();
  }, [accounts]);


  useEffect(() => {
    if (!selectedOutlet) return;

    const fetchPRTemp = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/prtemp?plant=${selectedOutlet.plant}`,
          {
            headers: {
              Authorization: `Bearer ${accounts[0].idToken}`,
            },
          }
        );


        const data = await res.json();
        const mapped = data.map((row: any) => ({
          lineItem: row.lineItem,
          Material: row.Material,
          Material_Description: row.Material_Description,
          qty: row.qty,
          Base_Unit_of_Measure: row.Base_Unit_of_Measure,
          Plant: row.Plant,
          Name_1: row.Name_1,
          net_price: row.net_price,
          pdt: row.pdt
        }));

        setAdded(mapped);
        if (mapped.length > 0) {
          const maxPdt = Math.max(...mapped.map((i: AddedMaterial) => Number(i.pdt)));
          const newDeliveryDate = addDays(today, maxPdt);
          setDeliveryDate(newDeliveryDate);
          setMinDeliveryDate(newDeliveryDate);
        }
      } catch (err) {
        console.error("Load PR temp failed", err);
      }
    };

    fetchPRTemp();
  }, [selectedOutlet]);


  useEffect(() => {
    if (!isAdmin) return;
    if (!accounts[0]) return;

    const fetchOutlets = async () => {
      try {
        const token = accounts[0].idToken;

        const res = await fetch(
          `${API_BASE}/api/outlet/list`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }

        const json = await res.json();

        setOutlets(json);
      } catch (err) {
        console.error("fetchOutlets failed:", err);
      }
    };

    fetchOutlets();
  }, [isAdmin, accounts]);


  const generateLineItem = () => {
    const next = (added.length + 1) * 10;
    return next.toString().padStart(5, "0");
  };

  const handleSearchQtyChange = (material: string, value: number, standardQty: number) => {
    if (isNaN(value)) return;
    const strValue = value.toString().replace(".", "");
    if (strValue.length > 5) return;

    let newQty = Number(value.toFixed(2));
    if (newQty < standardQty) {
      newQty = standardQty;
    }
    setSearchQty(prev => ({
      ...prev,
      [material]: newQty,
    }));
  };

  const handleAdd = async (row: Material) => {

    if (added.find(a => a.Material === row.Material)) return;

    const qty = searchQty[row.Material] ?? row.standard_qty;
    const lineItem = generateLineItem();
    const allPdt = [...added.map(i => i.pdt), row.pdt];

    const maxPdt = Math.max(...allPdt);
    const newDeliveryDate = addDays(today, maxPdt);
    setDeliveryDate(newDeliveryDate);
    setMinDeliveryDate(newDeliveryDate);

    try {
      const res = await fetch(`${API_BASE}/api/prtemp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify({
          lineItem,
          material: row.Material,
          Material_Description: row.Material_Description,
          qty,
          Base_Unit_of_Measure: row.Base_Unit_of_Measure,
          Plant: row.Plant,
          Name_1: row.Name_1,
          net_price: row.net_price,
          pdt: row.pdt
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setAdded(prev => [...prev, { ...row, lineItem, qty }]);

    } catch (err) {
      console.error(err);
      alert("Add material failed");
    }
  };

  const handleQtyChange = async (index: number, value: number) => {
    if (isNaN(value)) return;
    const strValue = value.toString().replace(".", "");
    if (strValue.length > 5) return;
    const newQty = value <= 0 ? 1 : Number(value.toFixed(2));
    const lineItem = added[index].lineItem;

    setAdded(prev =>
      prev.map((row, i) =>
        i === index ? { ...row, qty: newQty } : row
      )
    );

    try {
      await fetch(`${API_BASE}/api/prtemp/updateQty`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify({ lineItem, qty: newQty }),
      });
    } catch (err) {
      console.error("Update qty failed", err);
    }
  };


  const handleSubmit = async () => {
    if (added.length === 0) {
      alert("No items added.");
      return;
    }
    setSubmitting(true);
    // setResultMessage(null);
    // setIsSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/api/sap/createpr2sap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify({
          docDate,
          deliveryDate,
          items: added,
          VendorId: selectedVendor
        })
      });
      const json = await res.json();

      if (json.success) {
        setPrNumber(json.prNumber);
        setShowResultModal(true);
        setAdded([]);
      } else {
        setIsSuccess(false);
        setResultMessage(json.message);
      }
    } catch (err: any) {
      setIsSuccess(false);
      setResultMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredData = search.trim()
    ? dataSource.filter(item =>
      Object.values(item).some(val =>
        val.toString().toLowerCase().includes(search.toLowerCase())
      )
    )
    : dataSource;


  const totalPrice = added.reduce((sum, row) => {
    return sum + Number(row.qty) * Number(row.net_price);
  }, 0);

  const addDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Number(days));
    return d.toISOString().split("T")[0];
  };
  const handleDelete = async (lineItem: string) => {
    try {
      await fetch(`${API_BASE}/api/prtemp/${lineItem}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
      });


      const newItems = added
        .filter(item => item.lineItem !== lineItem)
        .map((item, index) => ({
          oldLineItem: item.lineItem,
          newLineItem: String((index + 1) * 10).padStart(5, "0")
        }));


      await fetch(`${API_BASE}/api/prtemp/reindex`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify(newItems),
      });

      // 4. update state
      setAdded(prev =>
        prev
          .filter(item => item.lineItem !== lineItem)
          .map((item, index) => ({
            ...item,
            lineItem: String((index + 1) * 10).padStart(5, "0")
          }))
      );

    } catch (err) {
      console.error(err);
      alert("Delete & reindex failed");
    }
  };




  return (
    <div className="w-100">
      {resultMesge && (
        <div
          className={`alert mt-3 ${isSuccess ? "alert-success" : "alert-danger"
            }`}
        >
          {resultMesge}
        </div>
      )}
      <div className="card shadow-sm w-100">
        <div className="card-header bg-gold d-flex justify-content-between">
          <h5 className="mb-0">Create PR</h5>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 220 }}
            placeholder="Search Material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card-body">
          {isAdmin && (
            <OutletSelect
              outlets={outlets}
              value={selectedOutlet}
              onChange={(outlet) => {
                setSelectedOutlet(outlet);
                if (!outlet) return;
                fetchMaterial(outlet.plant);
              }}
            />
          )}
          {loading ? (
            <div className="text-center py-5">Loading...</div>
          ) : (
            <>

              <div className="border rounded mb-4" style={{ maxHeight: 240, overflowY: "auto" }}>
                <table className="table table-striped table-sm mb-0">
                  <thead className="table-secondary sticky-top">
                    <tr>
                      <th style={{ width: 120 }}>Material</th>
                      <th style={{ width: 300 }}>Description</th>
                      <th style={{ width: 40 }} className="text-center">PlanDate</th>
                      <th style={{ width: 40 }} className="text-center">QTY</th>
                      <th style={{ width: 70 }} className="text-center">Unit</th>
                      <th style={{ width: 40 }} className="text-center">Price</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length > 0 ? (
                      filteredData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.Material}</td>
                          <td>{row.Material_Description}</td>
                          <td className="text-center">{row.pdt}</td>
                          <td>
                            <input
                              type="number"
                              step="1"
                              min={row.standard_qty}
                              inputMode="decimal"
                              className="form-control form-control-sm text-center mx-auto"
                              style={{ width: 70 }}
                              value={searchQty[row.Material] ?? row.standard_qty}
                              onFocus={e => e.target.select()}
                              onInput={e => {
                                const input = e.target as HTMLInputElement;
                                if (input.value.replace(".", "").length > 5) {
                                  input.value = input.value.slice(0, 5);
                                }
                              }}
                              onChange={e =>
                                handleSearchQtyChange(
                                  row.Material,
                                  Number(e.target.value),
                                  row.standard_qty
                                )
                              }
                            />


                          </td>
                          <td style={{ textAlign: "center" }}>{row.Base_Unit_of_Measure}</td>
                          <td style={{ textAlign: "center" }}>{row.net_price}</td>
                          <td className="text-center">
                            <button
                              className="btn btn-outline-success btn-sm px-2"
                              onClick={() => handleAdd(row)}
                            >
                              <i className="fa-solid fa-plus"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-3">
                          พิมพ์ keyword เพื่อค้นหา Material
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ---------- Selected Items ---------- */}
              {added.length > 0 && (
                <>
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label fw-bold">Doc Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={docDate}

                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label fw-bold">Delivery Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={deliveryDate}
                        min={minDeliveryDate}
                        onChange={e => setDeliveryDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-striped table-sm align-middle">
                      <thead className="table-secondary">
                        <tr>
                          <th className="text-center text-nowrap" style={{ width: 60 }}>Line</th>
                          <th style={{ width: 120 }}>Material</th>
                          <th style={{ width: 300 }}>Description</th>
                          <th className="text-center text-nowrap" style={{ width: 70 }}>PlanDate</th>
                          <th className="text-center text-nowrap" style={{ width: 70 }}>Price</th>
                          <th className="text-center text-nowrap" style={{ width: 70 }}>QTY</th>
                          <th className="text-center text-nowrap" style={{ width: 60 }}>Unit</th>
                          <th className="d-none d-md-table-cell text-center" style={{ width: 80 }}>Net Price</th>
                          <th style={{ width: 32 }}></th>
                        </tr>
                      </thead>

                      <tbody>
                        {added.map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-center">{row.lineItem}</td>
                            <td className="text-nowrap">{row.Material}</td>
                            <td className="text-truncate" style={{ maxWidth: 200 }}>
                              {row.Material_Description}
                            </td>
                            <td className="text-center">{row.pdt}</td>
                            <td style={{ textAlign: "center" }}>{row.net_price}</td>
                            <td className="text-center">
                              <div className="d-flex justify-content-center">
                                <input
                                  type="number"
                                  step="1"
                                  min={row.standard_qty}
                                  inputMode="decimal"
                                  className="form-control form-control-sm text-center"
                                  style={{ width: 70 }}
                                  value={row.qty}
                                  onFocus={e => e.target.select()}
                                  onInput={e => {
                                    const input = e.target as HTMLInputElement;
                                    if (input.value.replace(".", "").length > 5) {
                                      input.value = input.value.slice(0, 5);
                                    }
                                  }}
                                  onChange={e => handleQtyChange(idx, Number(e.target.value))}
                                />

                              </div>
                            </td>

                            <td className="text-center">{row.Base_Unit_of_Measure}</td>
                            <td className="d-none d-md-table-cell text-center">
                              {(Number(row.qty) * Number(row.net_price)).toLocaleString()}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-outline-danger btn-sm px-2"
                                onClick={() => handleDelete(row.lineItem)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr className="table-secondary fw-bold">
                          <td colSpan={7} className="text-end">
                            Total
                          </td>
                          <td className="d-none d-md-table-cell text-center">
                            {totalPrice.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>

                  </div>

                  <div className="d-flex justify-content-end mt-3">
                    <button
                      className="btn btn-sukishi px-4"
                      onClick={() => setShowConfirm(true)}
                      disabled={submitting}
                    >
                      Send SAP
                      <i className="fa-solid fa-upload ms-2"></i>
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <ModalSendSap
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        submitting={submitting}
        itemCount={added.length}
        docDate={docDate}
        deliveryDate={deliveryDate}
        vendorId={selectedVendor}
        vendorName={selectedVendorName}
        onConfirm={async () => {
          setShowConfirm(false);
          await handleSubmit();
        }}
      />


      <ModalResult
        show={showResultModal}
        variant="success"
        title="PR Created Successfully"
        message={`PR Number: ${prNumber}`}
        onClose={() => setShowResultModal(false)}
      />

      {/* <ModalSuccess
        show={showResultModal}
        prNumber={prNumber}
        onClose={() => setShowResultModal(false)}
      /> */}
    </div>
  );
};
export default CreatePR;
