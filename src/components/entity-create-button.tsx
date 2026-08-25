"use client";
import { useState } from "react";
import { ModalForm } from "@/components/modal-form";
import { createEntity } from "@/app/(crm)/entity-actions";
import { SearchableSelect } from "@/components/searchable-select";
import { MultiSelectInput } from "@/components/multi-select-input";
type Option = string | { value: string; label: string };
type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "multiselect" | "textarea";
  options?: Option[];
  required?: boolean;
  defaultValue?: string;
};
const input = "mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5";
export function EntityCreateButton({
  table,
  label,
  fields,
}: {
  table: "suppliers" | "opportunities" | "orders";
  label: string;
  fields: Field[];
}) {
  const [revenue, setRevenue] = useState(0),
    [cost, setCost] = useState(0),
    profit = revenue - cost,
    margin = revenue ? (profit / revenue) * 100 : 0;
  return (
    <ModalForm title={`新建${label}`}>
      <form
        action={createEntity.bind(null, table)}
        className="grid gap-4 sm:grid-cols-2"
      >
        {fields.map((field) => (
          <label className="text-sm" key={field.key}>
            {field.label}
            {field.type === "select" &&
            field.options?.some((option) => typeof option !== "string") ? (
              <SearchableSelect
                name={field.key}
                options={field.options as { value: string; label: string }[]}
                required={field.required}
                defaultValue={field.defaultValue}
                placeholder={`搜索${field.label}`}
              />
            ) : field.type === "multiselect" ? (
              <MultiSelectInput
                name={field.key}
                options={field.options as string[]}
                defaultValue={field.defaultValue}
              />
            ) : field.type === "textarea" ? (
              <textarea
                aria-label={field.label}
                className={`${input} min-h-24`}
                defaultValue={field.defaultValue}
                name={field.key}
              />
            ) : field.type === "select" ? (
              <select
                className={input}
                name={field.key}
                required={field.required}
              >
                {field.options?.map((option) => {
                  const value =
                      typeof option === "string" ? option : option.value,
                    text = typeof option === "string" ? option : option.label;
                  return (
                    <option value={value} key={value}>
                      {text}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                aria-label={field.label}
                className={input}
                name={field.key}
                type={field.type || "text"}
                required={field.required}
                defaultValue={field.defaultValue}
                readOnly={
                  table === "orders" &&
                  ["net_profit_cny", "profit_margin"].includes(field.key)
                }
                value={
                  table === "orders" && field.key === "net_profit_cny"
                    ? profit
                    : table === "orders" && field.key === "profit_margin"
                      ? margin.toFixed(2)
                      : undefined
                }
                onChange={
                  table === "orders" && field.key === "revenue_cny"
                    ? (e) => setRevenue(Number(e.target.value))
                    : table === "orders" && field.key === "total_cost_cny"
                      ? (e) => setCost(Number(e.target.value))
                      : undefined
                }
              />
            )}
          </label>
        ))}
        <button className="rounded-xl bg-[#173b34] py-3 text-white sm:col-span-2">
          保存{label}
        </button>
      </form>
    </ModalForm>
  );
}
