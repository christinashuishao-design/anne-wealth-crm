"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowDownUp, Eye, Pencil, Rows3, Trash2, X } from "lucide-react";
import { deleteTasks, updateTask } from "@/app/(crm)/tasks/actions";
import { ProjectTaskSelect, type ProjectTaskOption } from "@/components/project-task-select";
import { SearchableSelect } from "@/components/searchable-select";

export type TaskRow = {
  id: string;
  title: string;
  task_type: string;
  customer_id?: string;
  customer_name?: string;
  customer_contact_name?: string;
  customer_email?: string;
  customer_phone?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  due_at: string;
  priority: string;
  status: string;
  auto_rule?: string;
};
type CustomerOption = {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  keywords?: string;
};
const field =
  "mt-1 w-full rounded-xl border border-[#d8ccb8] bg-white px-3 py-2.5 outline-none focus:border-[#173b34]";
type Density = "compact" | "standard" | "comfortable";
type DateOrder = "asc" | "desc";
const densityPadding: Record<Density, string> = {
  compact: "p-2.5",
  standard: "p-4",
  comfortable: "px-4 py-6",
};

export function TaskTable({
  rows,
  customers,
  projects,
}: {
  rows: TaskRow[];
  customers: CustomerOption[];
  projects: ProjectTaskOption[];
}) {
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [density, setDensity] = useState<Density>("standard");
  const [dateOrder, setDateOrder] = useState<DateOrder>("asc");
  const [isDeleting, startDelete] = useTransition();
  useEffect(() => {
    const storedDensity = window.localStorage.getItem("task-table-density");
    const storedOrder = window.localStorage.getItem("task-table-date-order");
    if (["compact", "standard", "comfortable"].includes(storedDensity || ""))
      setDensity(storedDensity as Density);
    if (["asc", "desc"].includes(storedOrder || ""))
      setDateOrder(storedOrder as DateOrder);
  }, []);
  const changeDensity = (value: Density) => {
    setDensity(value);
    window.localStorage.setItem("task-table-density", value);
  };
  const changeDateOrder = (value: DateOrder) => {
    setDateOrder(value);
    window.localStorage.setItem("task-table-date-order", value);
  };
  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => {
      const leftTime = new Date(left.due_at).getTime();
      const rightTime = new Date(right.due_at).getTime();
      const safeLeft = Number.isFinite(leftTime) ? leftTime : Number.MAX_SAFE_INTEGER;
      const safeRight = Number.isFinite(rightTime) ? rightTime : Number.MAX_SAFE_INTEGER;
      return dateOrder === "asc" ? safeLeft - safeRight : safeRight - safeLeft;
    }),
    [dateOrder, rows],
  );
  const allChecked = rows.length > 0 && checked.length === rows.length;
  const open = (task: TaskRow, edit = false) => {
    setSelected(task);
    setEditing(edit);
  };
  const toggleAll = () =>
    setChecked(allChecked ? [] : rows.map((row) => row.id));
  const toggleOne = (id: string) =>
    setChecked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  const confirmDelete = () =>
    startDelete(async () => {
      await deleteTasks(deleteTargets);
      setChecked([]);
      setDeleteTargets([]);
    });

  return (
    <>
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7dece] bg-white px-4 py-2">
        <span className="text-sm text-neutral-500">
          {checked.length
            ? `已选择 ${checked.length} 条任务`
            : "勾选任务后可批量删除"}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-[#ded5c5] bg-[#faf7f1] px-3 py-2 text-sm text-neutral-600">
            <Rows3 size={15}/><span>行距</span>
            <select aria-label="表格行距" value={density} onChange={(event) => changeDensity(event.target.value as Density)} className="bg-transparent font-medium text-[#173b34] outline-none">
              <option value="compact">紧凑</option>
              <option value="standard">标准</option>
              <option value="comfortable">宽松</option>
            </select>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[#ded5c5] bg-[#faf7f1] px-3 py-2 text-sm text-neutral-600">
            <ArrowDownUp size={15}/><span>截止时间</span>
            <select aria-label="截止时间排序" value={dateOrder} onChange={(event) => changeDateOrder(event.target.value as DateOrder)} className="bg-transparent font-medium text-[#173b34] outline-none">
              <option value="asc">最早优先</option>
              <option value="desc">最新优先</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!checked.length}
            onClick={() => setDeleteTargets(checked)}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            <Trash2 size={16} />
            批量删除
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#e7dece] bg-white">
        {rows.length ? (
          <table className="w-full min-w-[1420px] table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-[#faf7f1] shadow-[0_1px_0_#e7dece]">
              <tr>
                <th className="w-12 p-3 text-center">
                  <input
                    aria-label="全选任务"
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                  />
                </th>
                <th className="w-64 p-3 text-left">任务</th>
                <th className="w-24 p-3 text-left">类型</th>
                <th className="w-80 p-3 text-left">客户</th>
                <th className="w-44 p-3 text-left">关联项目</th>
                <th className="w-36 p-3 text-left">截止时间</th>
                <th className="w-20 p-3 text-left">优先级</th>
                <th className="w-20 p-3 text-left">状态</th>
                <th className="w-64 p-3 text-left">自动规则</th>
                <th className="w-28 p-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((task) => (
                <tr
                  key={task.id}
                  className="border-t transition hover:bg-[#fbf8f1]"
                >
                  <td className={`${densityPadding[density]} text-center`}>
                    <input
                      aria-label={`选择 ${task.title}`}
                      type="checkbox"
                      checked={checked.includes(task.id)}
                      onChange={() => toggleOne(task.id)}
                    />
                  </td>
                  <td className={`${densityPadding[density]} align-top`}>
                    <button
                      type="button"
                      className="break-words text-left font-medium leading-6 text-[#173b34] hover:underline"
                      onClick={() => open(task)}
                    >
                      {task.title}
                    </button>
                  </td>
                  <td className={`${densityPadding[density]} align-top leading-6`}>{task.task_type || "—"}</td>
                  <td className={`${densityPadding[density]} align-top`}>
                    <div className="break-words font-medium leading-6 text-[#173b34]">
                      {task.customer_name || "—"}
                    </div>
                    {task.customer_contact_name && (
                      <div className="mt-1 break-words text-xs leading-5 text-neutral-600">
                        联系人：{task.customer_contact_name}
                      </div>
                    )}
                    {(task.customer_phone || task.customer_email) && (
                      <div className="mt-1 break-words text-xs leading-5 text-neutral-500">
                        {[task.customer_phone, task.customer_email]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className={`${densityPadding[density]} align-top break-words leading-6`}>{task.opportunity_name || "—"}</td>
                  <td className={`${densityPadding[density]} align-top leading-6`}>
                    {task.due_at
                      ? new Date(task.due_at).toLocaleString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className={`${densityPadding[density]} align-top leading-6`}>{task.priority || "—"}</td>
                  <td className={`${densityPadding[density]} align-top leading-6`}>{task.status || "—"}</td>
                  <td className={`${densityPadding[density]} align-top break-words leading-6`}>{task.auto_rule || "—"}</td>
                  <td className={`${densityPadding[density]} align-top`}>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        title="查看任务"
                        onClick={() => open(task)}
                        className="text-neutral-500 hover:text-[#173b34]"
                      >
                        <Eye size={17} />
                      </button>
                      <button
                        type="button"
                        title="编辑任务"
                        onClick={() => open(task, true)}
                        className="text-neutral-500 hover:text-[#173b34]"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type="button"
                        title="删除任务"
                        onClick={() => setDeleteTargets([task.id])}
                        className="text-neutral-500 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-neutral-400">暂无任务</div>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b p-5">
              <div>
                <p className="text-xs tracking-[.2em] text-[#b18436]">
                  TASK DETAIL
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[#173b34]">
                  {editing ? "编辑任务" : "任务详情"}
                </h2>
              </div>
              <button
                type="button"
                title="关闭"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </header>
            {editing ? (
              <form
                action={updateTask.bind(null, selected.id)}
                className="grid gap-4 p-5 sm:grid-cols-2"
                onSubmit={() => setSelected(null)}
              >
                <label className="text-sm sm:col-span-2">
                  任务名称
                  <ProjectTaskSelect
                    projects={projects}
                    defaultOpportunityId={selected.opportunity_id}
                    defaultTitle={selected.title}
                  />
                </label>
                <label className="text-sm">
                  任务类型
                  <select
                    className={field}
                    name="task_type"
                    defaultValue={selected.task_type}
                  >
                    {[
                      "客户跟进",
                      "报价跟进",
                      "样品跟进",
                      "订单跟进",
                      "收款跟进",
                      "其他",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  关联客户
                  <SearchableSelect
                    name="customer_id"
                    options={customers.map((customer) => ({
                      value: customer.id,
                      label: customer.company_name,
                      keywords: customer.keywords,
                    }))}
                    defaultValue={selected.customer_id || ""}
                    placeholder="输入公司、国家、联系人、邮箱或电话搜索"
                  />
                </label>
                <label className="text-sm">
                  截止时间
                  <input
                    aria-label="截止时间"
                    className={field}
                    name="due_at"
                    type="datetime-local"
                    defaultValue={selected.due_at?.slice(0, 16)}
                    required
                  />
                </label>
                <label className="text-sm">
                  优先级
                  <select
                    className={field}
                    name="priority"
                    defaultValue={selected.priority}
                  >
                    {["高", "中", "低"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  状态
                  <select
                    className={field}
                    name="status"
                    defaultValue={selected.status}
                  >
                    {["待处理", "进行中", "已完成", "已取消"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  自动规则
                  <input
                    className={field}
                    name="auto_rule"
                    defaultValue={selected.auto_rule || ""}
                  />
                </label>
                <div className="flex justify-end gap-3 sm:col-span-2">
                  <button
                    type="button"
                    className="rounded-xl border px-5 py-2.5"
                    onClick={() => setEditing(false)}
                  >
                    取消编辑
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white"
                  >
                    保存修改
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5">
                <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                  {[
                    ["任务名称", selected.title],
                    ["任务类型", selected.task_type],
                    ["关联客户", selected.customer_name || "未关联"],
                    ["客户联系人", selected.customer_contact_name || "—"],
                    [
                      "客户联系方式",
                      [selected.customer_phone, selected.customer_email]
                        .filter(Boolean)
                        .join(" · ") || "—",
                    ],
                    ["关联项目", selected.opportunity_name || "未关联"],
                    [
                      "截止时间",
                      new Date(selected.due_at).toLocaleString("zh-CN"),
                    ],
                    ["优先级", selected.priority],
                    ["状态", selected.status],
                    ["自动规则", selected.auto_rule || "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-neutral-500">{label}</dt>
                      <dd className="mt-1 font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#173b34] px-5 py-2.5 text-white"
                  >
                    <Pencil size={16} />
                    编辑任务
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!!deleteTargets.length && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-3 text-red-600">
                <Trash2 size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#173b34]">
                  确认删除任务？
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  将删除选中的 {deleteTargets.length}{" "}
                  条任务。删除后不会再出现在今日待办、逾期提醒和跟进任务中。
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargets([])}
                className="rounded-xl border px-5 py-2.5"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-white disabled:opacity-60"
              >
                {isDeleting
                  ? "正在删除…"
                  : `确认删除 ${deleteTargets.length} 条`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
