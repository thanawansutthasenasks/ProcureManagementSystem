import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  InputNumber,
  DatePicker,
  Spin,
  Alert,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useMsal } from "@azure/msal-react";
import ModalSendSap from "./ModalSendSap";
import { ModalResult } from "../../../components/Modals";
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
  const [docDate] = useState<string>(today);
  const [deliveryDate, setDeliveryDate] = useState<string>(today);
  const [submitting, setSubmitting] = useState(false);
  const [resultMesge, setResultMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [prNumber, setPrNumber] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor] = useState<string>("");
  const [minDeliveryDate, setMinDeliveryDate] = useState<string>(today);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  // 🌟 State สำหรับเปิด/ปิด Modal เลือกสินค้า
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  const { accounts, instance } = useMsal();

  const selectedVendorName =
    vendors.find((v) => v.VendorID === selectedVendor)?.Name || "";
  const roles = (accounts[0]?.idTokenClaims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");

  const handleUnauthorized = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: "/login" });
  };

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!accounts[0] || isAdmin) return;
    const email =
      accounts[0].username || accounts[0].idTokenClaims?.preferred_username;
    if (!email) return;
    const outletCode = email.split("@")[0].split(".")[0].toUpperCase();
    setSelectedOutlet({ outletcode: outletCode, outletname: outletCode, plant: "" });
  }, [accounts, isAdmin]);

  useEffect(() => {
    if (!accounts[0] || isAdmin) return;
    fetchMaterial();
  }, [accounts, isAdmin]);

  useEffect(() => {
    if (isAdmin || !dataSource.length || !selectedOutlet || selectedOutlet.plant) return;
    const plant = dataSource[0].Plant;
    setSelectedOutlet((prev) => (prev ? { ...prev, plant } : prev));
  }, [dataSource, selectedOutlet, isAdmin]);

  const fetchMaterial = async (plant?: string) => {
    if (!accounts[0]) return;
    setLoading(true);
    try {
      const token = accounts[0].idToken;
      const url = plant
        ? `${API_BASE}/api/t_Material?plant=${plant}`
        : `${API_BASE}/api/t_Material`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) throw new Error("Unauthorized");
      setDataSource(await res.json());
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
          headers: { Authorization: `Bearer ${accounts[0].idToken}` },
        });
        if (res.status === 401) { handleUnauthorized(); return; }
        setVendors(await res.json());
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
          { headers: { Authorization: `Bearer ${accounts[0].idToken}` } }
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
          pdt: row.pdt,
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
    if (!isAdmin || !accounts[0]) return;
    const fetchOutlets = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/outlet/list`, {
          headers: { Authorization: `Bearer ${accounts[0].idToken}` },
        });
        if (!res.ok) throw new Error(await res.text());
        setOutlets(await res.json());
      } catch (err) {
        console.error("fetchOutlets failed:", err);
      }
    };
    fetchOutlets();
  }, [isAdmin, accounts]);

  // ── Handlers ────────────────────────────────────────────────────
  const addDays = (dateStr: string, days: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + Number(days));
    return d.toISOString().split("T")[0];
  };

  const generateLineItem = () => {
    const next = (added.length + 1) * 10;
    return next.toString().padStart(5, "0");
  };

  const handleSearchQtyChange = (material: string, value: number, standardQty: number) => {
    if (isNaN(value)) return;
    if (value.toString().replace(".", "").length > 5) return;
    const newQty = Number(value.toFixed(2)) < standardQty ? standardQty : Number(value.toFixed(2));
    setSearchQty((prev) => ({ ...prev, [material]: newQty }));
  };

  const handleAdd = async (row: Material) => {
    if (added.find((a) => a.Material === row.Material)) return;
    const qty = searchQty[row.Material] ?? row.standard_qty;
    const lineItem = generateLineItem();
    const maxPdt = Math.max(...[...added.map((i) => i.pdt), row.pdt]);
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
          lineItem, material: row.Material,
          Material_Description: row.Material_Description,
          qty, Base_Unit_of_Measure: row.Base_Unit_of_Measure,
          Plant: row.Plant, Name_1: row.Name_1,
          net_price: row.net_price, pdt: row.pdt,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      setAdded((prev) => [...prev, { ...row, lineItem, qty }]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQtyChange = async (index: number, value: number) => {
    if (isNaN(value)) return;
    if (value.toString().replace(".", "").length > 5) return;
    const newQty = value <= 0 ? 1 : Number(value.toFixed(2));
    const lineItem = added[index].lineItem;
    setAdded((prev) => prev.map((row, i) => (i === index ? { ...row, qty: newQty } : row)));
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

  const handleDelete = async (lineItem: string) => {
    try {
      await fetch(`${API_BASE}/api/prtemp/${lineItem}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accounts[0].idToken}` },
      });
      const newItems = added
        .filter((item) => item.lineItem !== lineItem)
        .map((item, index) => ({
          oldLineItem: item.lineItem,
          newLineItem: String((index + 1) * 10).padStart(5, "0"),
        }));
      await fetch(`${API_BASE}/api/prtemp/reindex`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify(newItems),
      });
      setAdded((prev) =>
        prev
          .filter((item) => item.lineItem !== lineItem)
          .map((item, index) => ({
            ...item,
            lineItem: String((index + 1) * 10).padStart(5, "0"),
          }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (added.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sap/createpr2sap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify({
          docDate, deliveryDate,
          items: added, VendorId: selectedVendor,
        }),
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
    ? dataSource.filter((item) =>
      Object.values(item).some((val) =>
        val?.toString().toLowerCase().includes(search.toLowerCase())
      )
    )
    : dataSource;

  const totalPrice = added.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.net_price),
    0
  );

  // ── Columns ─────────────────────────────────────────────────────
  const searchColumns: ColumnsType<Material> = [
    { title: "Material", dataIndex: "Material", width: 120 },
    { title: "Description", dataIndex: "Material_Description", width: 220, ellipsis: true },
    { title: "PlanDate", dataIndex: "pdt", width: 80, align: "center" },
    {
      title: "QTY", width: 90, align: "center",
      render: (_, row) => (
        <InputNumber
          size="small"
          min={row.standard_qty}
          value={searchQty[row.Material] ?? row.standard_qty}
          style={{ width: 70 }}
          onFocus={(e) => e.target.select()}
          onChange={(val) => val !== null && handleSearchQtyChange(row.Material, val, row.standard_qty)}
        />
      ),
    },
    { title: "Unit", dataIndex: "Base_Unit_of_Measure", width: 60, align: "center" },
    { title: "Price", dataIndex: "net_price", width: 70, align: "center" },
    {
      title: "", width: 56, align: "center",
      render: (_, row) => (
        <Button
          type="primary" size="small" icon={<PlusOutlined />}
          onClick={() => handleAdd(row)}
          disabled={!!added.find((a) => a.Material === row.Material)}
        />
      ),
    },
  ];

  const addedColumns: ColumnsType<AddedMaterial> = [
    { title: "Line", dataIndex: "lineItem", width: 60, align: "center" },
    { title: "Material", dataIndex: "Material", width: 120 },
    { title: "Description", dataIndex: "Material_Description", width: 200, ellipsis: true },
    { title: "PlanDate", dataIndex: "pdt", width: 80, align: "center" },
    { title: "Price", dataIndex: "net_price", width: 70, align: "center" },
    {
      title: "QTY", width: 90, align: "center",
      render: (_, row, index) => (
        <InputNumber
          size="small" min={1} value={row.qty} style={{ width: 70 }}
          onFocus={(e) => e.target.select()}
          onChange={(val) => val !== null && handleQtyChange(index, val)}
        />
      ),
    },
    { title: "Unit", dataIndex: "Base_Unit_of_Measure", width: 60, align: "center" },
    {
      title: "Net Price", width: 100, align: "right",
      render: (_, row) => (Number(row.qty) * Number(row.net_price)).toLocaleString(),
    },
    {
      title: "", width: 44, align: "center",
      render: (_, row) => (
        <Button danger size="small" icon={<DeleteOutlined />}
          onClick={() => handleDelete(row.lineItem)} />
      ),
    },
  ];

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col space-y-4">

      {resultMesge && !isSuccess && (
        <Alert
          type="error" message={resultMesge} showIcon closable
          onClose={() => setResultMessage(null)}
          className="flex-none"
        />
      )}

      {/* ── โครงสร้างการ์ดหลัก ── */}
      <div className="card p-0 flex flex-1 flex-col overflow-hidden shadow-sm">

        {/* Header */}
        <div
          className="flex-none flex items-center justify-between px-5 py-4 border-b bg-white"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-base font-semibold m-0" style={{ color: "var(--color-text)" }}>
            Create PR
          </h2>
          {/* ปุ่มเปิด Modal ค้นหาสินค้า */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsMaterialModalOpen(true)}
          >
            Add Material
          </Button>
        </div>

        {/* Body (แสดงเฉพาะรายการที่เลือกแล้ว) */}
        {/* <div className="flex-1 overflow-y-auto p-5 space-y-5 relative bg-slate-50"> */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 relative">

          {/* ส่วนของ Outlet และ Date Picker */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            {isAdmin && (
              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  สาขา
                </label>
                <OutletSelect
                  outlets={outlets}
                  value={selectedOutlet}
                  onChange={(outlet) => {
                    setSelectedOutlet(outlet);
                    if (!outlet) return;
                    fetchMaterial(outlet.plant);
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Doc Date
                </label>
                <DatePicker
                  value={dayjs(docDate)} disabled allowClear={false}
                  style={{ width: 160 }} format="YYYY-MM-DD"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Delivery Date
                </label>
                <DatePicker
                  value={dayjs(deliveryDate)} allowClear={false}
                  style={{ width: 160 }} format="YYYY-MM-DD"
                  disabledDate={(current) =>
                    current && current < dayjs(minDeliveryDate).startOf("day")
                  }
                  onChange={(date) => date && setDeliveryDate(date.format("YYYY-MM-DD"))}
                />
              </div>
            </div>
          </div>

          {/* ตารางสินค้าที่ถูกเพิ่มลง PR แล้ว */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>Selected Materials</h3>

            {added.length > 0 ? (
              <div className="space-y-4">
                <Table<AddedMaterial>
                  dataSource={added}
                  columns={addedColumns}
                  rowKey="lineItem"
                  size="small"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row style={{ background: "var(--color-surface)" }}>
                      <Table.Summary.Cell index={0} colSpan={7}>
                        <span className="font-semibold block text-right pr-2"
                          style={{ color: "var(--color-text)" }}>
                          Total
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} align="right">
                        <span className="font-bold text-lg" style={{ color: "var(--color-brand-600)" }}>
                          {totalPrice.toLocaleString()}
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} />
                    </Table.Summary.Row>
                  )}
                />

                {/* ปุ่ม Submit */}
                <div className="flex justify-end pt-2 border-t border-gray-100 mt-4">
                  <Button
                    type="primary" size="large"
                    icon={<CloudUploadOutlined />}
                    loading={submitting}
                    onClick={() => setShowConfirm(true)}
                  >
                    Send SAP
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-300 text-5xl mb-3"><SearchOutlined /></div>
                <p className="text-gray-500 font-medium">No materials selected</p>
                <p className="text-sm text-gray-400">Please click "Add Material" button to search and add items to your PR.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal ค้นหาสินค้า (แยกตารางออกมาไว้ที่นี่) ── */}
      <Modal
        title={
          <div className="text-lg font-semibold border-b border-gray-200 pb-3 mb-2" style={{ color: "var(--color-text)" }}>
            Search Materials
          </div>
        }
        open={isMaterialModalOpen}
        onCancel={() => setIsMaterialModalOpen(false)}
        width={950} // กว้างพอดีตาราง
        style={{ top: 30 }}
        destroyOnClose={false}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsMaterialModalOpen(false)}>
            Done
          </Button>
        ]}
      >
        <div className="space-y-4 pt-2">
          {/* ช่องค้นหา */}
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search Material Code or Description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="large"
          />

          {/* ตารางค้นหาสินค้า */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <Spin size="large" />
              <span className="text-sm text-gray-500">Loading materials...</span>
            </div>
          ) : (
            <Table<Material>
              dataSource={filteredData}
              columns={searchColumns}
              rowKey="Material"
              size="small"
              scroll={{ y: 'calc(100vh - 320px)' }} // ล็อกความสูงตาราง ให้ Scroll แค่เนื้อหาข้างใน
              pagination={false}
              locale={{ emptyText: "พิมพ์ keyword เพื่อค้นหา Material" }}
            />
          )}
        </div>
      </Modal>

      {/* ── Modals อื่นๆ (Confirm & Success) ── */}
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
    </div>
  );
};

export default CreatePR;