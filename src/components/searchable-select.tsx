"use client";
import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
export type SearchOption = { value: string; label: string; keywords?: string };
export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "输入名称搜索",
  required = false,
  allowCustom = false,
}: {
  name: string;
  options: SearchOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;
}) {
  const initial =
      options.find((o) => o.value === defaultValue)?.label || defaultValue,
    [value, setValue] = useState(defaultValue),
    [query, setQuery] = useState(initial),
    [open, setOpen] = useState(false);
  const filtered = useMemo(
    () =>
      options
        .filter((o) => {
          const normalize = (value: string) =>
              value.toLowerCase().replace(/[\s\-_.，,()（）]/g, ""),
            needle = normalize(query),
            haystack = normalize(`${o.label} ${o.keywords || ""}`);
          return haystack.includes(needle);
        })
        .slice(0, 30),
    [options, query],
  );
  return (
    <div className="relative mt-1">
      <input type="hidden" name={name} value={allowCustom ? query : value} />
      <div className="flex items-center rounded-xl border border-[#d8ccb8] bg-white px-3">
        <Search size={15} className="text-neutral-400" />
        <input
          aria-label={placeholder}
          className="w-full px-2 py-2.5 outline-none"
          value={query}
          placeholder={placeholder}
          required={required}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!allowCustom) setValue("");
            setOpen(true);
          }}
        />
        <ChevronDown size={16} />
      </div>
      {open && (
        <div className="absolute z-[80] mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white p-1 shadow-xl">
          {!required && (
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f5efe5]"
              onClick={() => {
                setValue("");
                setQuery("");
                setOpen(false);
              }}
            >
              不选择
            </button>
          )}
          {filtered.map((option) => (
            <button
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f5efe5]"
              key={option.value}
              onClick={() => {
                setValue(option.value);
                setQuery(option.label);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
          {!filtered.length && (
            <div className="p-3 text-sm text-neutral-400">
              没有匹配结果{allowCustom ? "，可直接使用输入内容" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
