"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { deleteTasks, updateTask } from "@/app/(crm)/tasks/actions";
import { ProjectTaskSelect, type ProjectTaskOption } from "@/components/project-task-select";
import { SearchableSelect } from "@/components/searchable-select";

export type TaskRow = {
  id: string;
  title: string;
  task_type: string;
  customer_id?: string;
  customer_name?: string;
  opportunity_id?: string;
  opportunity_name?: string;
  due_at: string;
  priority: string;
  status: string;
  auto_rule?: string;
};
type CustomerOption = { id: string; company_name: string; keywords?: string };
const field =
  "mt-1 w-full rounded-xl border border-[#d8ccb8] bg-white px-3 py-2.5 outline-none focus:border-[#173b34]";

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
  const [isDeleting, startDelete] = useTransition();
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
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#e7dece] bg-white px-4 py-2">
        <span className="text-sm text-neutral-500">
          {checked.length
            ? `已选择 ${checked.length} 条任务`
            : "勾选任务后可批量删除"}
        </span>
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
      <div className="overflow-x-auto rounded-2xl border border-[#e7dece] bg-white">
        {rows.length ? (
          <table className="w-full text-sm">
            <thead className="bg-[#faf7f1]">
              <tr>
                <th className="w-12 p-3 text-center">
                  <input
                    aria-label="全选任务"
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                  />
                </th>
                {[
                  "任务",
                  "类型",
                  "客户",
                  "关联项目",
                  "截止时间",
                  "优先级",
                  "状态",
                  "自动规则",
                  "操作",
                ].map((label) => (
                  <th className="p-3 text-left" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => (
                <tr
                  key={task.id}
                  className="border-t transition hover:bg-[#fbf8f1]"
                >
                  <td className="p-4 text-center">
                    <input
                      aria-label={`选择 ${task.title}`}
                      type="checkbox"
                      checked={checked.includes(task.id)}
                      onChange={() => toggleOne(task.id)}
                    />
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      className="font-medium text-[#173b34] hover:underline"
                      onClick={() => open(task)}
                    >
                      {task.title}
                    </button>
                  </td>
                  <td className="p-4">{task.task_type || "—"}</td>
                  <td className="p-4">{task.customer_name || "—"}</td>
                  <td className="p-4">{task.opportunity_name || "—"}</td>
                  <td className="p-4">
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
                  <td className="p-4">{task.priority || "—"}</td>
                  <td className="p-4">{task.status || "—"}</td>
                  <td className="p-4">{task.auto_rule || "—"}</td>
                  <td className="p-4">
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
