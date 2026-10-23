"use client";

import { useEffect, useRef, useState } from "react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function MultiSelectDropdown({ label, options, selected, onChange }: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((o) => o !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  // When nothing is selected, preview a couple of the actual options (e.g. "small,
  // medium, etc.") instead of a generic "Any", so the placeholder hints at what this
  // particular dropdown filters by.
  const placeholder = `${options.slice(0, 2).join(", ").toLowerCase()}, etc.`;
  const summary =
    selected.length === 0 ? placeholder : selected.length <= 2 ? selected.join(", ") : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5 text-sm text-fg-muted">
      {label}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-between rounded-lg border border-edge-strong bg-field px-3 py-2 text-left text-fg outline-none focus:border-accent-bright"
      >
        <span className={selected.length === 0 ? "text-fg-faint" : ""}>{summary}</span>
        <span className="text-fg-faint">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-edge-strong bg-field p-2 shadow-lg">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-fg-muted hover:bg-panel"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
                className="h-4 w-4 rounded border-edge-strong bg-field accent-accent"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
