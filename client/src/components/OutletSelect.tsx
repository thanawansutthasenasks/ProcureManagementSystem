import React from "react";
import { Select } from "antd";

export type Outlet = {
  plant: string;
  outletname: string;
  outletcode: string;
};

export interface OutletSelectProps {
  outlets: Outlet[];
  value: Outlet | null;
  onChange: (outlet: Outlet | null) => void;
}

const OutletSelect: React.FC<OutletSelectProps> = ({ outlets, value, onChange }) => {
  return (
    <Select
      style={{ width: "100%", minWidth: 220, maxWidth: 360 }} // เพิ่ม minWidth ให้ช่องไม่หดสั้นเกินไป
      placeholder="-- กรุณาเลือกสาขา --"
      value={value?.plant ?? undefined}
      allowClear
      showSearch
      filterOption={(input, option) =>
        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
      }
      onChange={(val) => {
        const outlet = outlets.find((o) => o.plant === val) ?? null;
        onChange(outlet);
      }}
      options={outlets.map((o) => ({
        value: o.plant,
        label: `${o.outletcode} - ${o.outletname} (${o.plant})`,
      }))}
    />
  );
};

export default OutletSelect;