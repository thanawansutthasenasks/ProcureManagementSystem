import React from "react";

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

const OutletSelect: React.FC<OutletSelectProps> = ({
  outlets,
  value,
  onChange,
}) => {
  return (
    <div className="mb-3">
      <label className="form-label fw-bold">เลือกสาขา</label>

      <select
        className="form-select form-select-sm"
        value={value?.plant ?? ""}
        onChange={(e) => {
          const outlet =
            outlets.find(o => o.plant === e.target.value) ?? null;
          onChange(outlet);
        }}
      >
        <option value="">-- กรุณาเลือกสาขา --</option>

        {outlets.map(o => (
          <option key={o.plant} value={o.plant}>
            {o.outletcode} - {o.outletname} - ({o.plant})   
          </option>
        ))}
      </select>
    </div>
  );
};

export default OutletSelect;
