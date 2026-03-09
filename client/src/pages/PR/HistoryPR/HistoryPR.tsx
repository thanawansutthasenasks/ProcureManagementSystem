import React, { useEffect, useState } from "react";
import {
  Input, Button, DatePicker, Spin, Tag, Pagination, Modal, Table,
} from "antd";
import {
  SearchOutlined, CalendarOutlined, StopOutlined, DownOutlined, RightOutlined, BarChartOutlined
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMsal } from "@azure/msal-react";
import ModalCancelSap from "./ModalCancelSap";
import TopMaterialChart from "./TopMaterialChart";
import OutletSelect from "../../../components/OutletSelect";
import type { Outlet } from "../../../components/OutletSelect";

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

const HistoryPR: React.FC = () => {
  const [data, setData] = useState<PRItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [prNumber, setPrNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [chartSearchKey, setChartSearchKey] = useState(0);

  const pageSize = 10;
  const { accounts } = useMsal();
  const claims = accounts[0]?.idTokenClaims as any;
  const roles = (claims?.roles as string[]) || [];
  const isAdmin = roles.includes("Admin");
  const isOutlet = roles.includes("outlet");

  useEffect(() => {
    if (!accounts[0]) return;
    const token = accounts[0].idToken;
    const email = accounts[0].username || claims?.preferred_username || "";
    const outletCode = email.split(".")[0].trim();
    const url = isAdmin
      ? `${API_BASE}/api/outlet/list`
      : `${API_BASE}/api/outlet/me?outletCode=${outletCode}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => setOutlets(Array.isArray(json) ? json : [json]))
      .catch(console.error);
  }, [accounts, isAdmin]);

  useEffect(() => {
    if (!accounts[0] || outlets.length === 0 || !isOutlet) return;
    const email = (claims?.preferred_username || claims?.email || "") as string;
    if (!email) return;
    const outletCode = email.split(".")[0].trim();
    const matched = outlets.find((o) => o.outletcode?.trim() === outletCode);
    if (matched) setSelectedOutlet(matched);
  }, [accounts, outlets, isOutlet]);

  useEffect(() => {
    if (!selectedOutlet || !accounts[0] || !isOutlet) return;
    setPage(1);
    setSearched(true);
    loadData();
  }, [selectedOutlet, accounts, isOutlet]);

  useEffect(() => {
    if (searched) loadData();
  }, [page]);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      prNumber, fromDate, toDate,
      page: page.toString(), pageSize: pageSize.toString(),
    });
    if (selectedOutlet?.plant) params.append("plant", selectedOutlet.plant);
    try {
      const res = await fetch(`${API_BASE}/api/history/pr?${params}`);
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
      setExpanded({});
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setSearched(true);
    loadData();
    setChartSearchKey(prev => prev + 1);
  };

  const confirmCancelPR = async (prNum: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/sap/cancelpr2sap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accounts[0].idToken}`,
        },
        body: JSON.stringify({ prNumber: prNum }),
      });
      if (!res.ok) throw new Error("Cancel failed");
      setShowCancelModal(false);
      setSelectedPR(null);
      loadData();
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d.replace(" ", "T")).toLocaleDateString("th-TH");

  const isOver24H = (prDate: string) => {
    if (!prDate) return false;
    return Date.now() - new Date(prDate.replace(" ", "T")).getTime() > 24 * 60 * 60 * 1000;
  };

  const toggle = (pr: string) => setExpanded((prev) => ({ ...prev, [pr]: !prev[pr] }));

  const groupedArray = Object.values(
    data.reduce<Record<string, PRItem[]>>((acc, row) => {
      acc[row.prNumber] = acc[row.prNumber] || [];
      acc[row.prNumber].push(row);
      return acc;
    }, {})
  ).sort((a, b) => new Date(b[0].pr_date).getTime() - new Date(a[0].pr_date).getTime());

  const lineColumns: ColumnsType<PRItem> = [
    { title: "Line", dataIndex: "line_item", width: 64, align: "center" },
    { title: "Material", dataIndex: "Material", width: 130 },
    { title: "Description", dataIndex: "Material_Description", ellipsis: true },
    { title: "Qty", dataIndex: "qty", width: 72, align: "center" },
    { title: "Unit", dataIndex: "Base_Unit_of_Measure", width: 64, align: "center" },
    { title: "Plant", dataIndex: "Plant", width: 72, align: "center" },
    { title: "Plant Name", dataIndex: "Name_1", width: 160 },
  ];

  return (
    <div className="w-full h-full flex flex-col space-y-4">

      {/* ── 1. Search Card ── */}
      <div className="flex-none card p-5 w-full">
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-text)" }}>
          PR Report
        </h2>

        <div className="flex flex-wrap gap-3 items-end">
          {isAdmin && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                สาขา
              </label>
              <OutletSelect outlets={outlets} value={selectedOutlet} onChange={setSelectedOutlet} />
            </div>
          )}

          {isOutlet && selectedOutlet && (
            <div className="flex flex-col gap-1.5 min-w-[220px]">
              <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                สาขา
              </label>
              <Input value={`${selectedOutlet.outletcode} - ${selectedOutlet.outletname}`} disabled style={{ width: "100%" }} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>PR Number</label>
            <Input
              prefix={<SearchOutlined style={{ color: "var(--color-text-muted)" }} />}
              placeholder="PR Number"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              style={{ width: 180 }}
              allowClear
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>From</label>
            <DatePicker
              value={fromDate ? dayjs(fromDate) : null}
              format="YYYY-MM-DD" style={{ width: 148 }}
              onChange={(d) => setFromDate(d ? d.format("YYYY-MM-DD") : "")}
              placeholder="From date"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>To</label>
            <DatePicker
              value={toDate ? dayjs(toDate) : null}
              format="YYYY-MM-DD" style={{ width: 148 }}
              disabledDate={(current) => fromDate ? current && current < dayjs(fromDate).startOf("day") : false}
              onChange={(d) => setToDate(d ? d.format("YYYY-MM-DD") : "")}
              placeholder="To date"
            />
          </div>

          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* ── 2. Results Card (ล็อก Pagenation ติดหนึบด้านล่าง) ── */}
      <div className="flex flex-1 flex-col card p-0 w-full overflow-hidden">

        {/* Header ติดหนึบด้านบน */}
        <div className="flex-none flex justify-between items-center px-5 py-4 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h3 className="text-base font-semibold m-0" style={{ color: "var(--color-text)" }}>PR List</h3>
          <Button icon={<BarChartOutlined />} onClick={() => {
            setIsChartModalOpen(true);
            if (chartSearchKey === 0) setChartSearchKey(1);
          }}>
            Analytics
          </Button>
        </div>

        {/* Body พื้นที่เลื่อนได้อิสระ */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spin size="large" />
              <span className="text-sm" style={{ color: "var(--color-text-sub)" }}>Loading...</span>
            </div>
          ) : !searched ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <CalendarOutlined style={{ fontSize: 36, color: "var(--color-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>
                Please enter some filter and click Search.
              </p>
            </div>
          ) : groupedArray.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <SearchOutlined style={{ fontSize: 36, color: "var(--color-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-sub)" }}>ไม่พบข้อมูล</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {groupedArray.map((items) => {
                const prNum = items[0].prNumber;
                const over24H = isOver24H(items[0].pr_date);
                const isCanceled = items[0].status_d === 0;
                const isOpen = expanded[prNum];

                return (
                  <div
                    key={prNum}
                    className="rounded-xl overflow-hidden border"
                    style={{ borderColor: isCanceled ? "#fecaca" : "var(--color-border)" }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                      style={{
                        background: isCanceled ? "#fff1f2" : "var(--color-surface)",
                      }}
                      onClick={() => toggle(prNum)}
                    >
                      <div className="flex items-center gap-4 flex-wrap text-sm min-w-0">
                        {/* 🌟 ปรับตัวอักษรให้บางลงและดูคลีนขึ้นตรงนี้ครับ */}
                        <span className="font-medium" style={{ color: isCanceled ? "#ef4444" : "var(--color-text)" }}>
                          {prNum}
                        </span>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          {formatDate(items[0].pr_date)}
                        </span>
                        {items[0].vendorName && (
                          <span className="truncate" style={{ color: "var(--color-text-muted)" }}>
                            {items[0].vendorName}
                          </span>
                        )}
                        {isCanceled && (
                          <Tag color="error" icon={<StopOutlined />}>Cancelled</Tag>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isOpen
                          ? <DownOutlined style={{ fontSize: 11, color: "var(--color-text-sub)" }} />
                          : <RightOutlined style={{ fontSize: 11, color: "var(--color-text-sub)" }} />
                        }
                        <Button
                          size="small"
                          danger
                          disabled={over24H || isCanceled}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (over24H || isCanceled) return;
                            setSelectedPR(prNum);
                            setShowCancelModal(true);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: "1px solid var(--color-border)" }}>
                        <Table<PRItem>
                          dataSource={items}
                          columns={lineColumns}
                          rowKey="line_item"
                          size="small"
                          pagination={false}
                          scroll={{ x: "max-content" }}
                          style={{ borderRadius: 0 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌟 Footer ล็อกแถบ Pagination ไว้ด้านล่างเสมอ (ย้ายออกมานอกพื้นที่ Scroll) */}
        {!loading && searched && total > pageSize && (
          <div
            className="flex-none flex justify-center py-3 border-t bg-white"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Pagination
              current={page}
              total={total}
              pageSize={pageSize}
              showSizeChanger={false}
              onChange={(p) => setPage(p)}
            />
          </div>
        )}

      </div>

      <Modal
        title={<div className="text-lg font-semibold border-b border-gray-200 pb-3 mb-2" style={{ color: "var(--color-text)" }}>Top 10 Materials (Analytics)</div>}
        open={isChartModalOpen}
        onCancel={() => setIsChartModalOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <TopMaterialChart fromDate={fromDate} toDate={toDate} plant={selectedOutlet?.plant} searchKey={chartSearchKey} />
      </Modal>

      <ModalCancelSap
        show={showCancelModal}
        prNumber={selectedPR}
        submitting={loading}
        onClose={() => { setShowCancelModal(false); setSelectedPR(null); }}
        onConfirm={confirmCancelPR}
      />
    </div>
  );
};

export default HistoryPR;