import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe2,
  MapPin,
  Search,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localRows } from "@/lib/local-db";
import { saveCustomerResearch } from "./actions";

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

      <form className="rounded-2xl border border-[#e7dece] bg-white p-4 flex flex-wrap gap-3 items-end">
        <label className="min-w-72 flex-1 text-sm">
          选择客户
          <select className={field} name="customer" defaultValue={selected.id}>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.company_name} · {String(customer.country ?? "国家未填")}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white">查看背调</button>
      </form>

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
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-[#167052]" size={20}/>
          <div><h2 className="font-semibold text-[#173b34]">人工背调记录</h2><p className="text-xs text-neutral-500">只保存已核验事实，并注明风险和下一步动作。</p></div>
        </div>
        <form action={saveCustomerResearch} className="mt-5 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="customer_id" value={selected.id}/>
          <label className="text-sm md:col-span-2">背调结论<textarea className={`${field} min-h-28`} name="background_summary" defaultValue={String(selected.background_summary ?? "")} placeholder="记录公司主体、网站、主营业务、规模、采购能力及证据来源。"/></label>
          <label className="text-sm">最近沟通情况<textarea className={`${field} min-h-24`} name="latest_result" defaultValue={String(selected.latest_result ?? "")}/></label>
          <label className="text-sm">下一步行动<textarea className={`${field} min-h-24`} name="next_action" defaultValue={String(selected.next_action ?? "")}/></label>
          <label className="text-sm md:col-span-2">风险备注<textarea className={`${field} min-h-24`} name="notes" defaultValue={String(selected.notes ?? "")} placeholder="例如：付款主体不一致、邮箱域名异常、地址无法核验等。"/></label>
          <button className="md:col-span-2 rounded-xl bg-[#173b34] py-3 text-white flex items-center justify-center gap-2"><CheckCircle2 size={17}/>保存背调记录</button>
        </form>
      </section>
    </div>
  );
}
