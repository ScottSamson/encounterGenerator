import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "className"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function FormField({ label, value, onChange, ...inputProps }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-fg-muted">
      {label}
      <input
        {...inputProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-edge-strong bg-field px-3 py-2 text-fg outline-none focus:border-accent-bright"
      />
    </label>
  );
}
