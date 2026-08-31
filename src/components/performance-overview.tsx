"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Pencil, Target } from "lucide-react";

type Goals = {
  monthSales: number;
  yearSales: number;
  monthProfit: number;
  yearProfit: number;
};

const emptyGoals: Goals = {
  monthSales: 0,
  yearSales: 0,
  monthProfit: 0,
  yearProfit: 0,
};

export function PerformanceOverview({
  monthSales,
  yearSales,
  monthProfit,
  yearProfit,
  countries,
}: {
  monthSales: number;
  yearSales: number;
  monthProfit: number;
  yearProfit: number;
  countries: { country: string; timeZone: string }[];
}) {
  const [goals, setGoals] = useState<Goals>(emptyGoals);
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("anne-performance-goals");
      if (saved) setGoals({ ...emptyGoals, ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function saveGoals(next: Goals) {
    setGoals(next);
    window.localStorage.setItem("anne-performance-goals", JSON.stringify(next));
    setEditing(false);
  }

  const rows = useMemo(
    () => [
      { label: "本月销售额", actual: monthSales, target: goals.monthSales },
      { label: "本年销售额", actual: yearSales, target: goals.yearSales },
      { label: "本月利润", actual: monthProfit, target: goals.monthProfit },
      { label: "本年利润", actual: yearProfit, target: goals.yearProfit },
    ],
    [goals, monthProfit, monthSales, yearProfit, yearSales],
  );

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,.8fr)]">
      <div className="overflow-hidden rounded-2xl border border-[#e7dece] bg-white">
        <div className="flex items-center justify-between border-b border-[#e7dece] px-5 py-4">
          <div className="flex items-center gap-2">
            <Target className="text-[#b18436]" size={20} />
            <div>
              <h2 className="font-semibold text-[#173b34]">业绩与利润目标</h2>
              <p className="mt-0.5 text-xs text-neutral-500">人民币口径 · 按订单日期统计</p>
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs text-neutral-600 hover:border-[#b18436]"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Pencil size={13} /> 设置目标
          </button>
        </div>
        <div className="grid gap-px bg-[#eee7dc] sm:grid-cols-2">
          {rows.map((row) => (
            <ProgressCard key={row.label} {...row} />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e7dece] bg-white">
        <div className="flex items-center gap-2 border-b border-[#e7dece] px-5 py-4">
          <Clock3 className="text-[#b18436]" size={20} />
          <div>
            <h2 className="font-semibold text-[#173b34]">客户所在地时间</h2>
            <p className="mt-0.5 text-xs text-neutral-500">根据 CRM 主要客户国家显示</p>
          </div>
        </div>
        {countries.length ? (
          <div className="grid grid-cols-2 gap-px bg-[#eee7dc]">
            {countries.map((item) => (
              <div className="bg-white px-4 py-3" key={`${item.country}-${item.timeZone}`}>
                <div className="truncate text-xs text-neutral-500">{item.country}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-[#173b34]">
                  {new Intl.DateTimeFormat("zh-CN", {
                    timeZone: item.timeZone,
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }).format(now)}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {new Intl.DateTimeFormat("zh-CN", {
                    timeZone: item.timeZone,
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                  }).format(now)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-neutral-400">
            客户资料中还没有可识别的国家
          </div>
        )}
      </div>

      {editing && (
        <GoalEditor goals={goals} onCancel={() => setEditing(false)} onSave={saveGoals} />
      )}
    </section>
  );
}

function ProgressCard({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
  const reached = target > 0 && actual >= target;
  return (
    <div className="bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-[#173b34]">
            ¥{actual.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}
          </div>
        </div>
        {target > 0 ? (
          <span
            className={`rounded-md px-2 py-1 text-xs ${
              reached ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {reached ? "已达标" : `${percentage}%`}
          </span>
        ) : (
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
            未设目标
          </span>
        )}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eee9df]">
        <div
          className={`h-full rounded-full ${reached ? "bg-emerald-500" : "bg-[#d4af67]"}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-neutral-400">
        <span>{target > 0 ? `目标 ¥${target.toLocaleString("zh-CN")}` : "点击右上角设置目标"}</span>
        {reached && <CheckCircle2 className="text-emerald-500" size={15} />}
      </div>
    </div>
  );
}

function GoalEditor({
  goals,
  onCancel,
  onSave,
}: {
  goals: Goals;
  onCancel: () => void;
  onSave: (goals: Goals) => void;
}) {
  const [draft, setDraft] = useState(goals);
  const fields: { key: keyof Goals; label: string }[] = [
    { key: "monthSales", label: "月度销售目标" },
    { key: "yearSales", label: "年度销售目标" },
    { key: "monthProfit", label: "月度利润目标" },
    { key: "yearProfit", label: "年度利润目标" },
  ];
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4">
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
      >
        <h2 className="text-lg font-semibold text-[#173b34]">设置业绩与利润目标</h2>
        <p className="mt-1 text-sm text-neutral-500">金额单位：人民币</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <label className="text-sm" key={field.key}>
              {field.label}
              <input
                className="mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5 outline-none focus:border-[#173b34]"
                min="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    [field.key]: Number(event.target.value || 0),
                  }))
                }
                step="0.01"
                type="number"
                value={draft[field.key] || ""}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-xl border px-5 py-2.5" onClick={onCancel} type="button">
            取消
          </button>
          <button className="rounded-xl bg-[#173b34] px-5 py-2.5 text-white" type="submit">
            保存目标
          </button>
        </div>
      </form>
    </div>
  );
}
