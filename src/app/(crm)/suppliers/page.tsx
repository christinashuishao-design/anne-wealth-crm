import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ManagedEntityTable } from "@/components/managed-entity-table";
import { isLocalMode, localRows } from "@/lib/local-db";
import { EntityCreateButton } from "@/components/entity-create-button";
import { SupplierImportButton } from "@/components/supplier-import-button";
export default async function Page() {
  const data = isLocalMode()
    ? localRows("suppliers")
    : ((
        await (
          await createClient()
        )
          .from("suppliers")
          .select("*")
          .is("deleted_at", null)
          .order("total_score", { ascending: false })
      ).data ?? []);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SUPPLIERS"
        action={
          <div className="flex gap-2">
            <SupplierImportButton />
            <EntityCreateButton
            table="suppliers"
            label="供应商"
            fields={[
              { key: "company_name", label: "供应商名称", required: true },
              { key: "location", label: "所在地区（如广州）" },
              { key: "supplier_type", label: "供应商类型" },
              { key: "standard_moq", label: "MOQ", type: "number" },
              { key: "lead_time_days", label: "交期（天）", type: "number" },
              { key: "total_score", label: "总分", type: "number" },
              {
                key: "grade",
                label: "等级",
                type: "select",
                options: ["A", "B", "C"],
              },
              {
                key: "status",
                label: "状态",
                type: "select",
                options: ["可合作", "观察中", "暂停合作", "淘汰"],
              },
            ]}
            />
          </div>
        }
        title="供应商管理"
        description="查看、编辑供应能力与合作状态，支持勾选和批量删除。"
      />
      <ManagedEntityTable
        table="suppliers"
        label="供应商"
        rows={data as (Record<string, unknown> & { id: string })[]}
        columns={[
          { key: "supplier_code", label: "编号" },
          { key: "company_name", label: "供应商" },
          { key: "location", label: "地区" },
          { key: "supplier_type", label: "类型" },
          { key: "standard_moq", label: "MOQ" },
          { key: "lead_time_days", label: "交期（天）" },
          { key: "total_score", label: "总分" },
          { key: "grade", label: "等级" },
          { key: "status", label: "状态" },
        ]}
        fields={[
          { key: "company_name", label: "供应商名称" },
          { key: "location", label: "所在地区（如广州）" },
          { key: "supplier_type", label: "供应商类型" },
          { key: "standard_moq", label: "MOQ", type: "number" },
          { key: "lead_time_days", label: "交期（天）", type: "number" },
          { key: "total_score", label: "总分", type: "number" },
          {
            key: "grade",
            label: "等级",
            type: "select",
            options: ["A", "B", "C"],
          },
          {
            key: "status",
            label: "状态",
            type: "select",
            options: ["可合作", "观察中", "暂停合作", "淘汰"],
          },
        ]}
      />
    </div>
  );
}
