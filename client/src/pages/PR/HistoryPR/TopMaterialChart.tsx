import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useMsal } from "@azure/msal-react";

const API_BASE = "https://uat-pms.sukishigroup.com";

interface TopMaterial {
  Material: string;
  Material_Description: string;
  total_qty: number;
}

interface Props {
  fromDate?: string;
  toDate?: string;
  plant?: string;
  searchKey: number;
}

const TopMaterialChart: React.FC<Props> = ({
  fromDate,
  toDate,
  plant,
  searchKey
}) => {
  const [data, setData] = useState<TopMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const { accounts } = useMsal();

  useEffect(() => {
    if (searchKey > 0 && accounts[0]) {
      loadData();
    }
  }, [searchKey, plant, fromDate, toDate, accounts]);

  const loadData = async () => {
    if (!accounts[0]) return;

    try {
      setLoading(true);

      const params = new URLSearchParams({
        fromDate: fromDate || "",
        toDate: toDate || "",
        top: "10"
      });

      if (plant) {
        params.append("plant", plant);
      }

      const res = await fetch(
        `${API_BASE}/api/report/pr/top-material?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accounts[0].idToken}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = await res.json();
      setData(json);

    } catch (err) {
      console.error("TopMaterialChart error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  if (searchKey === 0) {
    return (
      <div className="text-center text-muted py-4">
        กรุณาเลือกเงื่อนไขแล้วกด Search
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-4">Loading chart...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        ไม่พบข้อมูล
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 350 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical">
          <XAxis type="number" />
          <YAxis type="category" dataKey="Material" width={220} />
          <Tooltip formatter={(value) => [Number(value).toLocaleString(), "Qty"]} />
          <Bar dataKey="total_qty" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopMaterialChart;
