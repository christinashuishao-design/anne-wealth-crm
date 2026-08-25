"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

export function MultiSelectInput({
  name,
  options,
  defaultValue = "",
}: {
  name: string;
  options: string[];
  defaultValue?: string;
}) {
  const [selected, setSelected] = useState<string[]>(() =>
      defaultValue
        .split(/[,，、]/)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
    [custom, setCustom] = useState("");
  const toggle = (value: string) =>
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const addCustom = () => {
    const value = custom.trim();
    if (value && !selected.includes(value)) setSelected((items) => [...items, value]);
    setCustom("");
  };
  return (
    <div className="mt-1 rounded-xl border border-[#d8ccb8] bg-white p-3">
      <input type="hidden" name={name} value={selected.join("、")} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-sm ${selected.includes(option) ? "border-[#173b34] bg-[#173b34] text-white" : "border-[#d8ccb8]"}`}
            key={option}
            onClick={() => toggle(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
      {!!selected.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((value) => (
            <span className="flex items-center gap-1 rounded-lg bg-[#f5efe5] px-2 py-1 text-sm" key={value}>
              {value}
              <button aria-label={`移除${value}`} onClick={() => toggle(value)} type="button">
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <input
          aria-label="自定义下单品类"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 outline-none focus:border-[#173b34]"
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder="输入其他品类"
          value={custom}
        />
        <button className="flex items-center gap-1 rounded-lg border px-3" onClick={addCustom} type="button">
          <Plus size={15} /> 添加
        </button>
      </div>
    </div>
  );
}
