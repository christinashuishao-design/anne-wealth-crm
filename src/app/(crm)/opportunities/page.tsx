import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ManagedEntityTable } from "@/components/managed-entity-table";
import { isLocalMode, localRows } from "@/lib/local-db";
import { EntityCreateButton } from "@/components/entity-create-button";
import { OpportunityBoard, QuotedFollowUpWorkspace } from "@/components/opportunity-workspaces";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; status?: string }> }) {
  const params = await searchParams;
  const workspace = params.view === "board" ? "board" : params.status === "已报价" ? "quoted" : "all";
  let data: Record<string, unknown>[];
  let customers: Record<string, unknown>[];
  if (isLocalMode()) {
    data = localRows("opportunities");
    customers = localRows("customers");
  } else {
    const db = await createClient();
    const [opportunitiesResult, customersResult] = await Promise.all([
      db.from("opportunities").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
      db.from("customers").select("id,company_name,contact_name,email,phone,country").is("deleted_at", null).order("company_name"),
    ]);
    data = opportunitiesResult.data ?? [];
    customers = customersResult.data ?? [];
  }
  const customerOptions = customers.map((c) => ({
    value: String(c.id),
    label: String(c.company_name),
    keywords: [c.contact_name, c.email, c.phone, c.country]
      .filter(Boolean)
      .map(String)
      .join(" "),
  }));
  const customerById = new Map(customers.map((customer) => [String(customer.id), customer]));
  const displayData = (data as Record<string, unknown>[]).map((project) => ({
    ...project,
    id: String(project.id),
    customer_name:
      customerById.get(String(project.customer_id || ""))?.company_name || "未关联客户",
    customer_contact_name:
      customerById.get(String(project.customer_id || ""))?.contact_name || "",
    customer_email: customerById.get(String(project.customer_id || ""))?.email || "",
    customer_phone: customerById.get(String(project.customer_id || ""))?.phone || "",
    customer_country: customerById.get(String(project.customer_id || ""))?.country || "",
  }));
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={workspace === "board" ? "PROJECT PIPELINE" : workspace === "quoted" ? "QUOTE FOLLOW-UP" : "OPPORTUNITIES"}
        action={
          <EntityCreateButton
            table="opportunities"
            label="项目"
            fields={[
              { key: "title", label: "项目名称", required: true },
              {
                key: "customer_id",
                label: "关联客户",
                type: "select",
                options: customerOptions,
              },
              {
                key: "status",
                label: "阶段",
                type: "select",
                options: [
                  "需求确认中",
                  "有明确询盘",
                  "已报价",
                  "样品准备中",
                  "样品已寄",
                  "价格谈判",
                  "等待订单",
                  "已成交",
                  "已流失",
                ],
              },
              { key: "estimated_amount", label: "预计金额", type: "number" },
              {
                key: "currency",
                label: "币种",
                type: "select",
                options: ["USD", "EUR", "CNY", "GBP"],
              },
              {
                key: "expected_close_date",
                label: "预计成交日期",
                type: "date",
              },
              {
                key: "project_progress",
                label: "项目进度",
                type: "textarea",
              },
            ]}
          />
        }
        title={workspace === "board" ? "项目看板" : workspace === "quoted" ? "报价后待回复" : "全部项目"}
        description={workspace === "board" ? "按阶段查看项目分布，快速发现推进堵点。" : workspace === "quoted" ? "聚焦已报价项目，按照等待时间安排客户跟进。" : "集中检索、编辑和批量管理全部询盘项目。"}
      />
      {workspace === "board" ? (
        <OpportunityBoard rows={displayData as (Record<string, unknown> & { id: string })[]}/>
      ) : workspace === "quoted" ? (
        <QuotedFollowUpWorkspace rows={displayData as (Record<string, unknown> & { id: string })[]}/>
      ) : <ManagedEntityTable
        table="opportunities"
        label="项目"
        rows={displayData as (Record<string, unknown> & { id: string })[]}
        columns={[
          { key: "opportunity_code", label: "项目编号" },
          { key: "title", label: "项目" },
          { key: "customer_name", label: "客户公司" },
          { key: "status", label: "阶段" },
          { key: "project_progress", label: "最新进度" },
          { key: "estimated_amount", label: "预计金额", format: "money" },
          { key: "currency", label: "币种" },
          { key: "expected_close_date", label: "预计成交", format: "date" },
        ]}
        fields={[
          { key: "title", label: "项目名称" },
          {
            key: "customer_id",
            label: "客户公司",
            type: "select",
            options: customerOptions,
          },
          {
            key: "status",
            label: "阶段",
            type: "select",
            options: [
              "需求确认中",
              "有明确询盘",
              "已报价",
              "样品准备中",
              "样品已寄",
              "价格谈判",
              "等待订单",
              "已成交",
              "已流失",
            ],
          },
          { key: "estimated_amount", label: "预计金额", type: "number" },
          {
            key: "currency",
            label: "币种",
            type: "select",
            options: ["USD", "EUR", "CNY", "GBP"],
          },
          { key: "expected_close_date", label: "预计成交日期", type: "date" },
          { key: "project_progress", label: "项目进度", type: "textarea" },
        ]}
      />}
    </div>
  );
}
