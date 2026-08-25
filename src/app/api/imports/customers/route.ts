import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { isLocalMode, localImportCustomers } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";

const aliases: Record<string, string[]> = {
  company_name: ["公司名称", "客户名称", "企业名称", "company_name", "company"],
  customer_type: ["客户类型"],
  business_products: ["我司产品", "产品"],
  stage: ["客户阶段", "阶段"],
  inquiry_grade: ["询盘等级"],
  email_content: ["邮件内容"],
  contact_name: ["联系人", "姓名"],
  email: ["邮箱", "邮件", "email"],
  position: ["职位"],
  social_media: ["社媒", "社交媒体"],
  phone: ["电话", "手机"],
  latest_result: ["最近沟通情况", "最近沟通结果"],
  next_action: ["下一步跟进", "下一步行动"],
  follow_up_reminder: ["提醒跟进"],
  follow_up_checkin: ["跟进打卡"],
  lark_created_at: ["创建时间"],
  last_follow_up_at: ["最后跟进时间", "最后跟进"],
  background_summary: ["背调", "背景调查"],
  company_size: ["客户规模", "公司规模"],
  country: ["国家", "国家/地区"],
  website: ["网站", "网址"],
  grade: ["客户等级", "等级"],
  source: ["来源", "客户来源"],
  notes: ["备注"],
  next_follow_up_at: ["下次跟进", "下次跟进时间"],
};
const normalize = (raw: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const [key, names] of Object.entries(aliases)) {
    const found = names.find(
      (name) => raw[name] !== undefined && String(raw[name]).trim() !== "",
    );
    if (found) result[key] = String(raw[found]).trim();
  }
  return result;
};

export async function POST(request: Request) {
  try {
    const form = await request.formData(),
      file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    let raw: Record<string, unknown>[];
    if (file.name.toLowerCase().endsWith(".csv"))
      raw = Papa.parse<Record<string, unknown>>(await file.text(), {
        header: true,
        skipEmptyLines: true,
      }).data;
    else {
      const workbook = XLSX.read(await file.arrayBuffer());
      raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
        defval: "",
      });
    }
    const rows = raw.map(normalize).filter((row) => row.company_name);
    if (!rows.length)
      return NextResponse.json(
        { error: "没有识别到“公司名称”列，请检查表头" },
        { status: 400 },
      );
    if (isLocalMode()) return NextResponse.json(localImportCustomers(rows));
    const db = await createClient();
    let created = 0,
      updated = 0;
    for (const row of rows) {
      const { data: old } = await db
        .from("customers")
        .select("id")
        .ilike("company_name", String(row.company_name))
        .limit(1)
        .maybeSingle();
      if (old) {
        const { error } = await db
          .from("customers")
          .update({ ...row, deleted_at: null })
          .eq("id", old.id);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await db
          .from("customers")
          .insert({
            ...row,
            customer_code: `IMP-${Date.now().toString().slice(-8)}-${created}`,
            stage: row.stage || "待开发",
            grade: row.grade || "C",
          });
        if (error) throw error;
        created++;
      }
    }
    return NextResponse.json({
      total: rows.length,
      created,
      updated,
      skipped: raw.length - rows.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导入失败" },
      { status: 500 },
    );
  }
}
