import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Globe2,
  MapPin,
  Search,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CustomerResearchPicker } from "@/components/customer-research-picker";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localCustomerResearch, localRows } from "@/lib/local-db";
import { saveCustomerResearch, saveDetailedCustomerResearch } from "./actions";

type Customer = Record<string, unknown> & {
  id: string;
  company_name: string;
};

const present = (value: unknown) => String(value ?? "").trim().length > 0;
const count = (customer: Customer, fields: string[], max: number) => {
  const completed = fields.filter((field) => present(customer[field])).length;
  return Math.round((completed / fields.length) * max);
};

function scoreCustomer(customer: Customer) {
  const sections = [
    {
      label: "主体可追溯性",
      score: count(customer, ["company_name", "country", "website", "source"], 20),
      max: 20,
      hint: "公司名称、国家、官网与来源",
    },
    {
      label: "联系人可信度",
      score: count(customer, ["contact_name", "email", "phone", "position"], 15),
      max: 15,
      hint: "联系人、邮箱、电话与职位",
    },
    {
      label: "采购需求清晰度",
      score: count(customer, ["business_products", "inquiry_grade", "email_content", "next_action"], 25),
      max: 25,
      hint: "意向产品、询盘等级与明确需求",
    },
    {
      label: "互动与购买信号",
      score: count(customer, ["latest_result", "last_follow_up_at", "follow_up_checkin", "stage"], 20),
      max: 20,
      hint: "沟通记录、跟进时间与客户阶段",
    },
    {
      label: "证据留存完整度",
      score: count(customer, ["website", "social_media", "background_summary"], 10),
      max: 10,
      hint: "官网、社媒与背调结论",
    },
    {
      label: "产品与商业匹配",
      score: count(customer, ["business_products", "customer_type", "company_size"], 10),
      max: 10,
      hint: "产品、客户类型与公司规模",
    },
  ];
  const total = sections.reduce((sum, section) => sum + section.score, 0);
  const grade = total >= 85 ? "A" : total >= 70 ? "B" : total >= 50 ? "C" : "D";
  return { sections, total, grade };
}

const field =
  "mt-1 w-full rounded-xl border border-[#d8ccb8] bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c79f52]/30";

function summarySections(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  const heading = /^(?:[一二三四五六七八九十百]+、|\d+[.、]|【[^】]+】)/;
  const sections: Array<{ title: string; body: string[] }> = [];
  let current = { title: "核心结论", body: [] as string[] };
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (heading.test(line)) {
      if (current.body.length) sections.push(current);
      current = { title: line.replace(/^【|】$/g, ""), body: [] };
    } else {
      current.body.push(line.replace(/^[-•]\s*/, ""));
    }
  }
  if (current.body.length || !sections.length) sections.push(current);
  return sections;
}

const researchSections = [
  ["一、基础信息", [["品牌名称", "brand_name"], ["品牌简称", "brand_alias"], ["注册主体", "legal_name"], ["成立时间", "founded_at"], ["总部/国家", "headquarters"], ["公开营业地址", "business_address"], ["公开电话", "public_phone"], ["公开商务邮箱", "public_email"]]],
  ["二、客户身份与业务", [["客户身份", "customer_identity"], ["商业角色", "business_role"], ["生产模式", "production_model"], ["品牌发展", "brand_history"], ["主营产品", "main_products"]]],
  ["三、产品与包装判断", [["质量判断", "quality_judgement"], ["生产能力判断", "production_judgement"], ["当前包装判断", "packaging_judgement"], ["潜在包装需求", "packaging_needs"], ["我司产品匹配", "product_match"], ["MOQ 分析", "moq_analysis"]]],
  ["四、采购与经营能力", [["采购权判断", "purchasing_authority"], ["企业规模", "company_scale"], ["付款能力", "payment_capacity"], ["采购规模", "purchase_scale"], ["成长性", "growth_potential"], ["财务风险", "financial_risk"]]],
  ["五、开发策略", [["销售渠道", "sales_channels"], ["客户痛点", "pain_points"], ["推荐切入点", "entry_strategy"], ["建议联系人", "recommended_contact"], ["开发风险", "development_risk"], ["客户等级", "customer_grade"], ["开发优先级", "development_priority"], ["最终建议", "final_recommendation"]]],
] as const;

export default async function CustomerResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer: requestedId } = await searchParams;
  let customers: Customer[] = [];
  if (isLocalMode()) {
    customers = localRows("customers").map((row) => ({
      ...row,
      id: String(row.id),
      company_name: String(row.company_name),
    }));
  } else {
    const db = await createClient();
    const result = await db
      .from("customers")
      .select("*")
      .is("deleted_at", null)
      .order("company_name");
    customers = (result.data ?? []) as Customer[];
  }
  const selected =
    customers.find((customer) => customer.id === requestedId) ?? customers[0];

  if (!selected) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="DUE DILIGENCE"
          title="客户背调"
          description="请先在客户资料中创建客户，再开始背调。"
        />
      </div>
    );
  }

  let research: { report?: Record<string, unknown>; contacts: Record<string, unknown>[]; sources: Record<string, unknown>[] } = { contacts: [], sources: [] };
  if (isLocalMode()) {
    const local = localCustomerResearch(selected.id);
    research = { report: local.report, contacts: local.contacts, sources: local.sources };
  } else {
    const db = await createClient();
    const [reportResult, contactsResult, sourcesResult] = await Promise.all([
      db.from("customer_research_reports").select("*").eq("customer_id", selected.id).maybeSingle(),
      db.from("customer_research_contacts").select("*").eq("customer_id", selected.id).order("created_at"),
      db.from("customer_research_sources").select("*").eq("customer_id", selected.id).order("created_at"),
    ]);
    research = { report: reportResult.data ?? undefined, contacts: contactsResult.data ?? [], sources: sourcesResult.data ?? [] };
  }
  let reportData: Record<string, string> = {};
  try {
    const value = research.report?.report_data;
    reportData = (typeof value === "string" ? JSON.parse(value) : value ?? {}) as Record<string, string>;
  } catch { reportData = {}; }
  const contactLines = research.contacts.map((c) => [c.name, c.position, c.email, c.phone, c.linkedin, c.source_url, c.verification_status].map((v) => String(v ?? "")).join(" | ")).join("\n");
  const sourceLines = research.sources.map((s) => [s.title, s.url, s.fact_summary, s.verification_status].map((v) => String(v ?? "")).join(" | ")).join("\n");

  const { sections, total, grade } = scoreCustomer(selected);
  const query = encodeURIComponent(selected.company_name);
  const countryQuery = encodeURIComponent(
    `${selected.company_name} ${String(selected.country ?? "")}`,
  );
  const website = String(selected.website ?? "").trim();
  const websiteHref = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : "";
  const risks = [
    !website && "尚未记录官网，需核验公司主体与域名。",
    !present(selected.email) && "尚未记录企业邮箱，联系人身份需要复核。",
    !present(selected.background_summary) && "尚未保存人工背调结论。",
    !present(selected.business_products) && "采购产品或需求尚不明确。",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="DUE DILIGENCE · CUSTOMER PROFILE"
        title="客户尽调、画像与跟进策略"
        description="评分反映 CRM 资料完整度，不代表征信结论；外部事实需人工核验。"
      />

      <CustomerResearchPicker
        selectedId={selected.id}
        customers={customers.map((customer) => ({
          id: customer.id,
          company_name: customer.company_name,
          customer_code: String(customer.customer_code ?? ""),
          contact_name: String(customer.contact_name ?? ""),
          phone: String(customer.phone ?? ""),
          email: String(customer.email ?? ""),
          country: String(customer.country ?? ""),
        }))}
      />

      <section className="rounded-2xl border border-[#dce8df] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs tracking-[.18em] text-[#8a6a2d]">CURRENT CUSTOMER</p>
            <h2 className="mt-1 text-2xl font-semibold text-[#173b34]">{selected.company_name}</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {String(selected.country ?? "国家未填")} · {String(selected.stage ?? "阶段未填")} · {String(selected.grade ?? "未分级")}级客户
            </p>
          </div>
          <div className="rounded-2xl border border-[#b8dccb] bg-[#eef8f2] px-5 py-3 text-center">
            <div className="text-3xl font-semibold text-[#167052]">{total}<span className="text-sm">/100</span></div>
            <div className="text-sm font-medium text-[#167052]">{grade} · 资料完整度</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <div key={section.label} className="rounded-xl border border-[#e7dece] p-4">
              <div className="flex justify-between gap-3 text-sm font-medium">
                <span>{section.label}</span><span className="text-[#167052]">{section.score}/{section.max}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eee8dc]">
                <div className="h-full rounded-full bg-[#1f755d]" style={{ width: `${(section.score / section.max) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-neutral-500">{section.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="flex items-center gap-2 font-medium text-amber-900"><AlertTriangle size={17}/>风险与待核验项</h3>
            <ul className="mt-2 space-y-1 text-sm text-amber-900/80">
              {(risks.length ? risks : ["核心资料较完整，仍建议在成交前核验付款主体和收货信息。"])
                .map((risk) => <li key={risk}>• {risk}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="flex items-center gap-2 font-medium text-emerald-900"><Target size={17}/>建议行动顺序</h3>
            <ol className="mt-2 space-y-1 text-sm text-emerald-900/80">
              <li>1. 核对官网、公司注册名称与企业邮箱域名。</li>
              <li>2. 确认联系人职位、采购权限和实际需求。</li>
              <li>3. 根据风险与意向等级建立下一次跟进任务。</li>
            </ol>
          </div>
        </div>

        <div className="mt-4 border-l-2 border-[#1f755d] bg-[#f8faf8] p-4">
          <h3 className="font-medium text-[#173b34]">外部核验工具</h3>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {websiteHref && <a target="_blank" rel="noreferrer" href={websiteHref} className="rounded-full border bg-white px-3 py-2 flex gap-1.5"><Globe2 size={15}/>客户官网<ExternalLink size={13}/></a>}
            <a target="_blank" rel="noreferrer" href={`https://www.google.com/search?q=${countryQuery}`} className="rounded-full border bg-white px-3 py-2 flex gap-1.5"><Search size={15}/>公司背景搜索<ExternalLink size={13}/></a>
            <a target="_blank" rel="noreferrer" href={`https://www.linkedin.com/search/results/companies/?keywords=${query}`} className="rounded-full border bg-white px-3 py-2 flex gap-1.5"><Users size={15}/>LinkedIn 核验<ExternalLink size={13}/></a>
            <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/${countryQuery}`} className="rounded-full border bg-white px-3 py-2 flex gap-1.5"><MapPin size={15}/>地址与地图<ExternalLink size={13}/></a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#dce8df] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-semibold text-[#173b34]">详细客户背调报告</h2><p className="mt-1 text-xs text-neutral-500">保存公开商业信息及其来源；私人联系方式、无来源信息和推测不得标为“已核验”。</p></div>
          <div className="flex gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">已核验事实</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">合理推断</span><span className="rounded-full bg-neutral-100 px-3 py-1">待核验</span></div>
        </div>
        <form action={saveDetailedCustomerResearch} className="mt-5 space-y-6">
          <input type="hidden" name="customer_id" value={selected.id}/>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">整份报告状态<select name="verification_status" className={field} defaultValue={String(research.report?.verification_status ?? "待核验")}><option>待核验</option><option>部分核验</option><option>已核验</option></select></label>
            <label className="text-sm">查询/核验日期<input name="researched_at" type="date" className={field} defaultValue={String(research.report?.researched_at ?? "").slice(0, 10)}/></label>
          </div>
          {researchSections.map(([title, fields], index) => <details key={title} open={index === 0} className="group rounded-xl border border-[#e7dece] bg-[#fffdf9]"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium text-[#173b34]"><span>{title}</span><span className="flex items-center gap-2 text-xs font-normal text-neutral-500">{fields.filter(([, name]) => present(reportData[name])).length}/{fields.length} 项已填写<ChevronDown size={17} className="transition-transform group-open:rotate-180"/></span></summary><div className="grid gap-4 border-t border-[#eee6da] p-4 md:grid-cols-2">{fields.map(([label, name]) => <label key={name} className="text-sm">{label}<textarea name={name} className={`${field} min-h-20`} defaultValue={reportData[name] ?? ""}/></label>)}</div></details>)}
          <fieldset className="rounded-xl border border-[#e7dece] p-4"><legend className="px-2 font-medium text-[#173b34]">六、事实、推断与待核验项</legend><div className="grid gap-4 md:grid-cols-3"><label className="text-sm text-emerald-800">已核验事实<textarea name="verified_facts" className={`${field} min-h-32`} defaultValue={reportData.verified_facts ?? ""} placeholder="逐条记录，并在证据来源中提供 URL。"/></label><label className="text-sm text-amber-800">合理推断<textarea name="reasoned_inferences" className={`${field} min-h-32`} defaultValue={reportData.reasoned_inferences ?? ""} placeholder="说明判断依据，不能当作事实。"/></label><label className="text-sm">待核验信息<textarea name="pending_verification" className={`${field} min-h-32`} defaultValue={reportData.pending_verification ?? ""}/></label></div></fieldset>
          <fieldset className="rounded-xl border border-[#e7dece] p-4"><legend className="px-2 font-medium text-[#173b34]">七、公开联系人与联系方式</legend><p className="mb-2 text-xs text-neutral-500">每行格式：姓名 | 职位 | 邮箱 | 电话 | LinkedIn | 来源网址 | 已核验/待核验</p><textarea name="public_contacts" className={`${field} min-h-32 font-mono text-xs`} defaultValue={contactLines} placeholder="Jane Doe | Purchasing Manager | jane@company.com | +1... | https://linkedin... | https://company.com/contact | 已核验"/></fieldset>
          <fieldset className="rounded-xl border border-[#e7dece] p-4"><legend className="px-2 font-medium text-[#173b34]">八、证据来源</legend><p className="mb-2 text-xs text-neutral-500">每行格式：来源标题 | 完整 URL | 支持的事实 | 已核验/待核验</p><textarea name="evidence_sources" className={`${field} min-h-36 font-mono text-xs`} defaultValue={sourceLines} placeholder="公司官网 About | https://... | 总部地址及品牌历史 | 已核验"/></fieldset>
          <button className="w-full rounded-xl bg-[#173b34] py-3 text-white flex items-center justify-center gap-2"><CheckCircle2 size={17}/>保存详细背调报告</button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#dce8df] bg-white p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#167052]" size={20}/>
          <div><h2 className="font-semibold text-[#173b34]">人工背调记录</h2><p className="text-xs text-neutral-500">只保存已核验事实，并注明风险和下一步动作。</p></div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_.5fr]">
          <div className="rounded-xl border border-[#e7dece] bg-[#fffdf9] p-4">
            <h3 className="flex items-center gap-2 font-medium text-[#173b34]"><FileText size={17}/>背调结论</h3>
            {summarySections(selected.background_summary).length ? <div className="mt-3 space-y-2">{summarySections(selected.background_summary).map((section, index) => <details key={`${section.title}-${index}`} open={index === 0} className="group rounded-lg border border-[#eee6da] bg-white"><summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-[#173b34]"><span>{section.title}</span><ChevronDown size={16} className="transition-transform group-open:rotate-180"/></summary><div className="space-y-1.5 border-t border-[#f0eadf] px-3 py-3 text-sm leading-6 text-neutral-700">{section.body.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}</div></details>)}</div> : <p className="mt-3 text-sm text-neutral-400">暂无背调结论</p>}
          </div>
          <div className="grid gap-3">
            {[{ label: "最近沟通", value: selected.latest_result, tone: "border-sky-100 bg-sky-50/60" }, { label: "下一步行动", value: selected.next_action, tone: "border-emerald-100 bg-emerald-50/60" }, { label: "风险备注", value: selected.notes, tone: "border-amber-100 bg-amber-50/60" }].map((item) => <div key={item.label} className={`rounded-xl border p-4 ${item.tone}`}><h3 className="text-sm font-medium text-[#173b34]">{item.label}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-700">{String(item.value ?? "").trim() || "暂无记录"}</p></div>)}
          </div>
        </div>
        <details className="group mt-4 rounded-xl border border-dashed border-[#cdbb9f] bg-[#faf7f1]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-[#173b34]"><span>编辑人工背调记录</span><ChevronDown size={17} className="transition-transform group-open:rotate-180"/></summary>
          <form action={saveCustomerResearch} className="grid gap-4 border-t border-[#e7dece] p-4 md:grid-cols-2">
            <input type="hidden" name="customer_id" value={selected.id}/>
            <label className="text-sm md:col-span-2">背调结论<textarea className={`${field} min-h-40`} name="background_summary" defaultValue={String(selected.background_summary ?? "")} placeholder="记录公司主体、网站、主营业务、规模、采购能力及证据来源。"/></label>
            <label className="text-sm">最近沟通情况<textarea className={`${field} min-h-24`} name="latest_result" defaultValue={String(selected.latest_result ?? "")}/></label>
            <label className="text-sm">下一步行动<textarea className={`${field} min-h-24`} name="next_action" defaultValue={String(selected.next_action ?? "")}/></label>
            <label className="text-sm md:col-span-2">风险备注<textarea className={`${field} min-h-24`} name="notes" defaultValue={String(selected.notes ?? "")} placeholder="例如：付款主体不一致、邮箱域名异常、地址无法核验等。"/></label>
            <button className="md:col-span-2 rounded-xl bg-[#173b34] py-3 text-white flex items-center justify-center gap-2"><CheckCircle2 size={17}/>保存背调记录</button>
          </form>
        </details>
      </section>
    </div>
  );
}
