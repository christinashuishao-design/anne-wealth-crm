import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Users,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, shanghaiDateKey, shortDate } from "@/lib/utils";
import { isLocalMode, localRows } from "@/lib/local-db";

type DashboardTask = {
  id: string;
  title: string;
  due_at: string;
  priority: string;
  customer_name?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
};

export default async function Dashboard() {
  if (isLocalMode()) return <LocalDashboard />;

  const supabase = await createClient();
  const currentDate = new Date();
  const today = shanghaiDateKey(currentDate);
  const month = today.slice(0, 7);
  const expiryLimit = new Date(currentDate);
  expiryLimit.setDate(expiryLimit.getDate() + 7);

  const [customers, projects, todayTasks, overdue, orders, receivables, quotes] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${month}-01`)
        .is("deleted_at", null),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("status", "已报价")
        .is("deleted_at", null),
      supabase
        .from("tasks")
        .select("id,title,due_at,priority,customers(company_name,contact_name,phone,email)")
        .gte("due_at", `${today}T00:00:00`)
        .lt("due_at", `${today}T23:59:59`)
        .not("status", "in", "(已完成,已取消)")
        .order("due_at")
        .limit(10),
      supabase
        .from("tasks")
        .select("id,title,due_at,priority,customers(company_name,contact_name,phone,email)")
        .lt("due_at", `${today}T00:00:00`)
        .not("status", "in", "(已完成,已取消)")
        .order("due_at")
        .limit(10),
      supabase
        .from("orders")
        .select("sales_amount,sales_currency,net_profit_cny")
        .gte("order_date", `${month}-01`)
        .is("deleted_at", null),
      supabase
        .from("receivables")
        .select("outstanding_amount")
        .gt("outstanding_amount", 0),
      supabase
        .from("supplier_quotations")
        .select("id,quotation_number,valid_until")
        .gte("valid_until", today)
        .lte("valid_until", expiryLimit.toISOString().slice(0, 10))
        .order("valid_until")
        .limit(5),
    ]);

  const normalizeTasks = (items: typeof todayTasks.data): DashboardTask[] =>
    (items ?? []).map((task) => {
      const customer = task.customers as {
        company_name?: string;
        contact_name?: string;
        phone?: string;
        email?: string;
      } | null;
      return {
        id: String(task.id),
        title: String(task.title),
        due_at: String(task.due_at),
        priority: String(task.priority),
        customer_name: customer?.company_name,
        contact_name: customer?.contact_name,
        phone: customer?.phone,
        email: customer?.email,
      };
    });

  const tasks = [
    ...normalizeTasks(overdue.data),
    ...normalizeTasks(todayTasks.data),
  ].slice(0, 10);
  const orderTotal = (orders.data ?? []).reduce(
    (sum, order) => sum + Number(order.sales_amount),
    0,
  );
  const outstanding = (receivables.data ?? []).reduce(
    (sum, item) => sum + Number(item.outstanding_amount),
    0,
  );
  const profit = (orders.data ?? []).reduce(
    (sum, order) => sum + Number(order.net_profit_cny || 0),
    0,
  );

  return (
    <DashboardView
      dateText={new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(
        currentDate,
      )}
      metrics={[
        {
          label: "已逾期任务",
          value: overdue.data?.length ?? 0,
          detail: "需要优先处理",
          href: "/tasks?view=overdue",
          tone: "red",
          icon: "alert",
        },
        {
          label: "今日待跟进",
          value: todayTasks.data?.length ?? 0,
          detail: "今天完成",
          href: "/tasks?view=today",
          tone: "amber",
          icon: "clock",
        },
        {
          label: "已报价项目",
          value: projects.count ?? 0,
          detail: "等待客户反馈",
          href: "/opportunities",
          tone: "green",
          icon: "calendar",
        },
        {
          label: "本月新增客户",
          value: customers.count ?? 0,
          detail: "客户资产",
          href: "/customers",
          tone: "green",
          icon: "users",
        },
      ]}
      tasks={tasks}
      finance={{ orderTotal, outstanding, profit }}
      quotes={(quotes.data ?? []).map((quote) => ({
        id: String(quote.id),
        number: String(quote.quotation_number),
        validUntil: String(quote.valid_until),
      }))}
    />
  );
}

type Metric = {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  tone: string;
  icon: string;
};

function DashboardView({
  dateText,
  metrics,
  tasks,
  finance,
  quotes,
}: {
  dateText: string;
  metrics: Metric[];
  tasks: DashboardTask[];
  finance: { orderTotal: number; outstanding: number; profit: number };
  quotes: { id: string; number: string; validUntil: string }[];
}) {
  const iconMap = {
    alert: AlertTriangle,
    clock: Clock3,
    calendar: CalendarClock,
    users: Users,
  };
  const toneMap: Record<string, string> = {
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs tracking-[.22em] text-[#b18436]">TODAY'S WORKSPACE</p>
          <h1 className="mt-1 text-3xl font-semibold text-[#173b34]">
            Anne 的客户跟进工作台
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{dateText}</p>
        </div>
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#173b34] px-4 py-2.5 text-sm text-white"
          href="/tasks"
        >
          查看全部任务 <ArrowRight size={15} />
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = iconMap[metric.icon as keyof typeof iconMap];
          return (
            <Link
              className="group flex items-center gap-4 rounded-2xl border border-[#e7dece] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              href={metric.href}
              key={metric.label}
            >
              <span className={`rounded-xl p-3 ${toneMap[metric.tone]}`}>
                <Icon size={21} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-neutral-500">{metric.label}</span>
                <span className="mt-0.5 block text-2xl font-semibold text-[#173b34]">
                  {metric.value}
                </span>
                <span className="block text-xs text-neutral-400">{metric.detail}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-[#e7dece] bg-white">
          <div className="flex items-center justify-between border-b border-[#e7dece] px-5 py-4">
            <div>
              <h2 className="font-semibold text-[#173b34]">优先待跟进</h2>
              <p className="mt-1 text-xs text-neutral-500">先显示逾期，再显示今日任务</p>
            </div>
            <Link className="text-sm text-[#9a742d]" href="/tasks">
              查看全部 <ArrowRight className="inline" size={14} />
            </Link>
          </div>
          {tasks.length ? (
            <div className="divide-y divide-[#eee7dc]">
              {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-400">
              <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={30} />
              今天没有待处理的跟进任务
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-[#e7dece] bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <CircleDollarSign className="text-[#b18436]" size={20} />
              <h2 className="font-semibold text-[#173b34]">本月业务摘要</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FinanceNumber label="订单金额" value={money(finance.orderTotal)} />
              <FinanceNumber label="待收款" value={money(finance.outstanding)} warn />
              <FinanceNumber
                label="净利润"
                value={finance.profit ? money(finance.profit) : "—"}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#e7dece] bg-white">
            <div className="flex items-center justify-between border-b border-[#e7dece] px-5 py-4">
              <h2 className="font-semibold text-[#173b34]">七天内到期报价</h2>
              <Link className="text-xs text-[#9a742d]" href="/suppliers">
                供应商
              </Link>
            </div>
            {quotes.length ? (
              <div className="divide-y divide-[#eee7dc]">
                {quotes.map((quote) => (
                  <div className="flex justify-between gap-3 px-5 py-3" key={quote.id}>
                    <span className="text-sm font-medium">{quote.number}</span>
                    <span className="whitespace-nowrap text-xs text-red-600">
                      {shortDate(quote.validUntil)} 到期
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-neutral-400">
                未来 7 天没有到期报价
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TaskItem({ task }: { task: DashboardTask }) {
  const overdue = new Date(task.due_at) < new Date();
  const contact = [task.contact_name, task.phone, task.email].filter(Boolean).join(" · ");
  return (
    <Link
      className="grid gap-3 px-5 py-4 transition hover:bg-[#fbf8f1] sm:grid-cols-[22px_minmax(0,1fr)_auto] sm:items-center"
      href="/tasks"
    >
      {overdue ? (
        <AlertTriangle className="text-red-500" size={18} />
      ) : (
        <Clock3 className="text-amber-500" size={18} />
      )}
      <span className="min-w-0">
        <span className="block font-medium text-[#173b34]">{task.title}</span>
        <span className="mt-1 block text-sm text-neutral-600">
          {task.customer_name || "未关联客户"}
        </span>
        {contact && (
          <span className="mt-0.5 block break-all text-xs text-neutral-400">{contact}</span>
        )}
      </span>
      <span className="flex items-center gap-2 text-xs sm:justify-end">
        <span
          className={`rounded-md px-2 py-1 ${
            overdue ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
          }`}
        >
          {overdue ? "已逾期" : "今日"}
        </span>
        <span className="whitespace-nowrap text-neutral-500">
          {shortDate(task.due_at)} · {task.priority}
        </span>
      </span>
    </Link>
  );
}

function FinanceNumber({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#faf7f1] p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div
        className={`mt-2 break-all text-base font-semibold ${
          warn ? "text-amber-700" : "text-[#173b34]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function LocalDashboard() {
  const customers = localRows("customers");
  const projects = localRows("opportunities");
  const taskRows = localRows("tasks");
  const orders = localRows("orders");
  const now = new Date();
  const todayKey = shanghaiDateKey(now);
  const active = (task: Record<string, unknown>) =>
    !["已完成", "已取消"].includes(String(task.status));
  const today = taskRows.filter(
    (task) => String(task.due_at).slice(0, 10) === todayKey && active(task),
  );
  const overdue = taskRows.filter(
    (task) =>
      new Date(String(task.due_at)) < now &&
      String(task.due_at).slice(0, 10) !== todayKey &&
      active(task),
  );
  const customersById = new Map(customers.map((customer) => [String(customer.id), customer]));
  const tasks: DashboardTask[] = [...overdue, ...today].slice(0, 10).map((task) => {
    const customer = customersById.get(String(task.customer_id));
    return {
      id: String(task.id),
      title: String(task.title),
      due_at: String(task.due_at),
      priority: String(task.priority),
      customer_name: customer?.company_name ? String(customer.company_name) : undefined,
      contact_name: customer?.contact_name ? String(customer.contact_name) : undefined,
      phone: customer?.phone ? String(customer.phone) : undefined,
      email: customer?.email ? String(customer.email) : undefined,
    };
  });
  const orderTotal = orders.reduce((sum, order) => sum + Number(order.sales_amount), 0);
  const profit = orders.reduce((sum, order) => sum + Number(order.net_profit_cny), 0);

  return (
    <DashboardView
      dateText={`本地数据库已连接 · ${new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "full",
      }).format(now)}`}
      metrics={[
        { label: "已逾期任务", value: overdue.length, detail: "需要优先处理", href: "/tasks?view=overdue", tone: "red", icon: "alert" },
        { label: "今日待跟进", value: today.length, detail: "今天完成", href: "/tasks?view=today", tone: "amber", icon: "clock" },
        { label: "项目总数", value: projects.length, detail: "持续推进", href: "/opportunities", tone: "green", icon: "calendar" },
        { label: "客户总数", value: customers.length, detail: "客户资产", href: "/customers", tone: "green", icon: "users" },
      ]}
      tasks={tasks}
      finance={{ orderTotal, outstanding: 0, profit }}
      quotes={[]}
    />
  );
}
