import { PageHeader } from "@/components/page-header";
import { TaskTable, type TaskRow } from "@/components/task-table";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localRows } from "@/lib/local-db";
import { ModalForm } from "@/components/modal-form";
import { createTask } from "./actions";
import { SearchableSelect } from "@/components/searchable-select";
import { ProjectTaskSelect, type ProjectTaskOption } from "@/components/project-task-select";
import { TaskCreateForm } from "@/components/task-create-form";
import { shanghaiDateKey, shanghaiDateTimeInput } from "@/lib/utils";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const now = new Date(),
    today = shanghaiDateKey(now);
  let rows: TaskRow[] = [],
    customers: {
      id: string;
      company_name: string;
      contact_name?: string;
      email?: string;
      phone?: string;
      keywords?: string;
    }[] = [],
    projects: ProjectTaskOption[] = [];
  if (isLocalMode()) {
    customers = localRows("customers").map((c) => ({
      id: String(c.id),
      company_name: String(c.company_name),
      contact_name: c.contact_name ? String(c.contact_name) : undefined,
      email: c.email ? String(c.email) : undefined,
      phone: c.phone ? String(c.phone) : undefined,
      keywords: [c.country, c.contact_name, c.email, c.phone, c.website]
        .filter(Boolean)
        .join(" "),
    }));
    const customerById = new Map(customers.map((customer) => [customer.id, customer]));
    projects = localRows("opportunities").map((project) => ({
      id: String(project.id),
      title: String(project.title),
      code: String(project.opportunity_code || ""),
    }));
    const projectNames = new Map(projects.map((project) => [project.id, project.title]));
    rows = localRows("tasks")
      .filter((t) =>
        view === "today"
          ? String(t.due_at).slice(0, 10) === today &&
            !["已完成", "已取消"].includes(String(t.status))
          : view === "overdue"
            ? new Date(String(t.due_at)) < now &&
              !["已完成", "已取消"].includes(String(t.status))
            : true,
      )
      .map((t) => {
        const customer = customerById.get(String(t.customer_id));
        return {
          ...t,
          id: String(t.id),
          title: String(t.title),
          task_type: String(t.task_type),
          customer_id: t.customer_id ? String(t.customer_id) : undefined,
          customer_name: customer?.company_name,
          customer_contact_name: customer?.contact_name,
          customer_email: customer?.email,
          customer_phone: customer?.phone,
          opportunity_id: t.opportunity_id ? String(t.opportunity_id) : undefined,
          opportunity_name: projectNames.get(String(t.opportunity_id)),
          due_at: String(t.due_at),
          priority: String(t.priority),
          status: String(t.status),
          auto_rule: t.auto_rule ? String(t.auto_rule) : undefined,
        };
      });
  } else {
    const db = await createClient();
    let query = db
      .from("tasks")
      .select("*,customers(company_name,contact_name,email,phone)")
      .is("deleted_at", null)
      .order("due_at");
    if (view === "today")
      query = query
        .gte("due_at", `${today}T00:00:00`)
        .lte("due_at", `${today}T23:59:59`);
    if (view === "overdue")
      query = query
        .lt("due_at", now.toISOString())
        .not("status", "in", "(已完成,已取消)");
    const [tasksResult, customersResult, projectsResult] = await Promise.all([
      query,
      db
        .from("customers")
        .select("id,company_name,country,contact_name,email,phone,website")
        .is("deleted_at", null)
        .order("company_name"),
      db
        .from("opportunities")
        .select("id,title,opportunity_code")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    customers = (customersResult.data ?? []).map((customer) => ({
      id: String(customer.id),
      company_name: String(customer.company_name),
      contact_name: customer.contact_name || undefined,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      keywords: [
        customer.country,
        customer.contact_name,
        customer.email,
        customer.phone,
        customer.website,
      ]
        .filter(Boolean)
        .join(" "),
    }));
    projects = (projectsResult.data ?? []).map((project) => ({
      id: String(project.id),
      title: String(project.title),
      code: String(project.opportunity_code || ""),
    }));
    const projectNames = new Map(projects.map((project) => [project.id, project.title]));
    rows = (tasksResult.data ?? []).map((t) => {
      const customer = t.customers as {
        company_name?: string;
        contact_name?: string;
        email?: string;
        phone?: string;
      } | null;
      return {
        ...t,
        customer_name: customer?.company_name,
        customer_contact_name: customer?.contact_name,
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        opportunity_name: projectNames.get(String(t.opportunity_id)),
      };
    }) as TaskRow[];
  }
  const field = "mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5";
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FOLLOW UP"
        action={
          <ModalForm title="新建任务">
            <TaskCreateForm action={createTask}>
              <label className="text-sm sm:col-span-2">
                任务名称*
                <ProjectTaskSelect projects={projects} />
              </label>
              <label className="text-sm">
                任务类型
                <select className={field} name="task_type">
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
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.company_name,
                    keywords: c.keywords,
                  }))}
                  placeholder="输入客户公司名称搜索"
                />
              </label>
              <label className="text-sm">
                截止时间*
                <input
                  aria-label="截止时间"
                  className={field}
                  defaultValue={view === "today" ? shanghaiDateTimeInput(now) : undefined}
                  name="due_at"
                  type="datetime-local"
                  required
                />
              </label>
              <label className="text-sm">
                优先级
                <select className={field} name="priority">
                  {["高", "中", "低"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                状态
                <select className={field} name="status">
                  {["待处理", "进行中", "已完成", "已取消"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                自动规则
                <input className={field} name="auto_rule" placeholder="选填" />
              </label>
            </TaskCreateForm>
          </ModalForm>
        }
        title={
          view === "overdue"
            ? "逾期任务"
            : view === "today"
              ? "今日待办"
              : "跟进任务"
        }
        description={
          view === "today"
            ? "这里仅显示截止日期为今天的任务；新建任务已默认使用今天的时间。"
            : "点击任务名称或查看按钮查看详情，也可以直接编辑。"
        }
      />
      <TaskTable rows={rows} customers={customers} projects={projects} />
    </div>
  );
}
