"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CustomerOption = {
  id: string;
  company_name: string;
  customer_code: string;
  contact_name: string;
  phone: string;
  email: string;
  country: string;
};

const normalize = (value: string) =>
  value.toLocaleLowerCase().replace(/[\s()\-+_.@，,]/g, "");

export function CustomerResearchPicker({
  customers,
  selectedId,
}: {
  customers: CustomerOption[];
  selectedId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState(selectedId);
  const filtered = useMemo(() => {
    const keyword = normalize(query.trim());
    if (!keyword) return customers;
    return customers.filter((customer) =>
      normalize([
        customer.company_name,
        customer.customer_code,
        customer.contact_name,
        customer.phone,
        customer.email,
        customer.country,
      ].join(" ")).includes(keyword),
    );
  }, [customers, query]);
  const targetId = filtered.some((customer) => customer.id === customerId)
    ? customerId
    : filtered[0]?.id ?? "";

  const openCustomer = () => {
    if (targetId) router.push(`/customer-research?customer=${encodeURIComponent(targetId)}`);
  };

  return (
    <div className="rounded-2xl border border-[#e7dece] bg-white p-4">
      <label className="text-sm">
        模糊搜索客户
        <div className="relative mt-1">
          <Search className="absolute left-3 top-3 text-neutral-400" size={18}/>
          <input
            className="w-full rounded-xl border border-[#d8ccb8] bg-white py-2.5 pl-10 pr-3 outline-none focus:ring-2 focus:ring-[#c79f52]/30"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); openCustomer(); } }}
            placeholder="输入公司名、联系人、电话、邮箱、国家或客户编号"
          />
        </div>
      </label>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-72 flex-1 text-sm">
          选择客户
          <select
            className="mt-1 w-full rounded-xl border border-[#d8ccb8] bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c79f52]/30"
            value={targetId}
            onChange={(event) => setCustomerId(event.target.value)}
            disabled={!filtered.length}
          >
            {filtered.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.company_name} · {customer.contact_name || "联系人未填"} · {customer.phone || customer.email || "联系方式未填"}
              </option>
            ))}
          </select>
        </label>
        <div className="pb-2.5 text-xs text-neutral-500">找到 {filtered.length} 个客户</div>
        <button type="button" onClick={openCustomer} disabled={!targetId} className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white disabled:opacity-40">查看背调</button>
      </div>
      {!filtered.length && <p className="mt-3 text-sm text-amber-700">没有匹配客户，请尝试输入更短的公司名、姓名、电话或邮箱片段。</p>}
    </div>
  );
}
