import type { InputHTMLAttributes } from "react";

interface RangeFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "className" | "placeholder"> {
  label: string;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

export default function RangeField({ label, minValue, maxValue, onMinChange, onMaxChange, ...inputProps }: RangeFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 text-sm text-fg-muted">
      {label}
      <div className="flex gap-2">
        <input
          {...inputProps}
          placeholder="Min"
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          className="w-1/2 rounded-lg border border-edge-strong bg-field px-3 py-2 text-fg outline-none focus:border-accent-bright"
        />
        <input
          {...inputProps}
          placeholder="Max"
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          className="w-1/2 rounded-lg border border-edge-strong bg-field px-3 py-2 text-fg outline-none focus:border-accent-bright"
        />
      </div>
    </div>
  );
}
