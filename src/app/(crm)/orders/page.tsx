import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ManagedEntityTable } from "@/components/managed-entity-table";
import { isLocalMode, localRows } from "@/lib/local-db";
import { EntityCreateButton } from "@/components/entity-create-button";
import { nextOrderNumber } from "@/lib/order-number";
export default async function Page() {
  const data = isLocalMode()
    ? localRows("orders")
    : ((
        await (
          await createClient()
        )
          .from("orders")
          .select("*")
          .is("deleted_at", null)
          .order("order_date", { ascending: false })
      ).data ?? []);
  const customerOptions = (
    isLocalMode()
      ? localRows("customers")
      : ((
          await (
            await createClient()
          )
            .from("customers")
            .select("id,company_name")
            .is("deleted_at", null)
            .order("company_name")
        ).data ?? [])
  ).map((c) => ({ value: String(c.id), label: String(c.company_name) }));
  const customerNames = new Map(customerOptions.map((c) => [c.value, c.label]));
  const suggestedOrderNumber = nextOrderNumber(
    (data as Record<string, unknown>[]).map((order) => order.order_number),
  );
  const displayData = (data as Record<string, unknown>[]).map((order) => ({
    ...order,
    id: String(order.id),
    customer_name: customerNames.get(String(order.customer_id)) || "—",
  }));
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ORDERS"
        action={
          <EntityCreateButton
            table="orders"
            label="订单"
            fields={[
              {
                key: "order_number",
                label: "PI号码",
                required: true,
                defaultValue: suggestedOrderNumber,
              },
              {
                key: "customer_id",
                label: "关联客户",
                type: "select",
                options: customerOptions,
                required: true,
              },
              {
                key: "order_categories",
                label: "下单品类（可多选）",
                type: "multiselect",
                options: ["瓶器", "纸盒", "美妆工具"],
              },
              {
                key: "status",
                label: "状态",
                type: "select",
                options: [
                  "待确认",
                  "生产中",
                  "待发货",
                  "已发货",
                  "已完成",
                  "已取消",
                ],
              },
              {
                key: "order_date",
                label: "订单日期",
                type: "date",
                required: true,
              },
              { key: "sales_amount", label: "销售额", type: "number" },
              {
                key: "sales_currency",
                label: "销售币种",
                type: "select",
                options: ["USD", "EUR", "CNY", "GBP"],
              },
              { key: "revenue_cny", label: "收入人民币", type: "number" },
              { key: "total_cost_cny", label: "总成本人民币", type: "number" },
              { key: "net_profit_cny", label: "净利润人民币", type: "number" },
              { key: "profit_margin", label: "利润率", type: "number" },
            ]}
          />
        }
        title="订单管理"
        description="查看、编辑和批量管理订单、交付与利润。"
      />
      <ManagedEntityTable
        table="orders"
        label="订单"
        rows={displayData as (Record<string, unknown> & { id: string })[]}
        columns={[
          { key: "order_number", label: "PI号码" },
          { key: "customer_name", label: "客户公司" },
          { key: "order_categories", label: "下单品类" },
          { key: "status", label: "状态" },
          { key: "order_date", label: "日期", format: "date" },
          { key: "sales_amount", label: "销售额", format: "money" },
          { key: "revenue_cny", label: "收入人民币", format: "money" },
          { key: "net_profit_cny", label: "净利润", format: "money" },
          { key: "profit_margin", label: "利润率", format: "percent" },
        ]}
        fields={[
          { key: "order_number", label: "PI号码" },
          {
            key: "customer_id",
            label: "客户公司",
            type: "select",
            options: customerOptions,
          },
          {
            key: "order_categories",
            label: "下单品类（可多选）",
            type: "multiselect",
            options: ["瓶器", "纸盒", "美妆工具"],
          },
          {
            key: "status",
            label: "状态",
            type: "select",
            options: [
              "待确认",
              "生产中",
              "待发货",
              "已发货",
              "已完成",
              "已取消",
            ],
          },
          { key: "order_date", label: "订单日期", type: "date" },
          { key: "sales_amount", label: "销售额", type: "number" },
          {
            key: "sales_currency",
            label: "销售币种",
            type: "select",
            options: ["USD", "EUR", "CNY", "GBP"],
          },
          { key: "revenue_cny", label: "收入人民币", type: "number" },
          { key: "total_cost_cny", label: "总成本人民币", type: "number" },
          { key: "net_profit_cny", label: "净利润人民币", type: "number" },
          { key: "profit_margin", label: "利润率", type: "number" },
        ]}
      />
    </div>
  );
}
