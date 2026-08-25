import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { localDb, localNextCustomerCode } from "./local-db";

export type LarkMapping = Record<string, string> & { company_name: string };
type LarkRecord = { record_id: string; fields: Record<string, unknown>; last_modified_time?: number };
type Connection = { id: string; name: string; region?: string; app_id: string; app_secret_encrypted: string; base_token: string; table_id: string; field_mapping: string; last_synced_at?: string };
const mappedColumns = ["customer_type","business_products","stage","inquiry_grade","email_content","contact_name","email","position","social_media","phone","latest_result","next_action","follow_up_reminder","follow_up_checkin","lark_created_at","last_follow_up_at","background_summary","company_size","country","website","grade","source","notes","next_follow_up_at"] as const;

function key() { return createHash("sha256").update(process.env.LOCAL_SESSION_SECRET || "").digest() }
export function encryptSecret(value: string) { const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",key(),iv), encrypted=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]); return [iv.toString("base64"),cipher.getAuthTag().toString("base64"),encrypted.toString("base64")].join(".") }
function decryptSecret(value:string){const [iv,tag,data]=value.split("."),decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64"));decipher.setAuthTag(Buffer.from(tag,"base64"));return Buffer.concat([decipher.update(Buffer.from(data,"base64")),decipher.final()]).toString("utf8")}
function apiHost(c:Connection){return c.region==="feishu"?"https://open.feishu.cn":"https://open.larksuite.com"}

export function saveLarkConnection(input:{name:string;region:string;appId:string;appSecret:string;baseToken:string;tableId:string;mapping:LarkMapping}){const db=localDb(),existing=db.prepare("select id from lark_connections limit 1").get() as {id:string}|undefined,id=existing?.id||crypto.randomUUID();db.prepare("insert into lark_connections(id,name,region,app_id,app_secret_encrypted,base_token,table_id,field_mapping,updated_at) values(?,?,?,?,?,?,?,?,?) on conflict(id) do update set name=excluded.name,region=excluded.region,app_id=excluded.app_id,app_secret_encrypted=excluded.app_secret_encrypted,base_token=excluded.base_token,table_id=excluded.table_id,field_mapping=excluded.field_mapping,updated_at=excluded.updated_at").run(id,input.name,input.region,input.appId,encryptSecret(input.appSecret),input.baseToken,input.tableId,JSON.stringify(input.mapping),new Date().toISOString());return id}
export function getLarkConnection(){return localDb().prepare("select id,name,region,app_id,base_token,table_id,field_mapping,last_synced_at from lark_connections limit 1").get() as Omit<Connection,"app_secret_encrypted">|undefined}
function fullConnection(id:string){return localDb().prepare("select * from lark_connections where id=?").get(id) as Connection|undefined}
async function token(c:Connection){const response=await fetch(`${apiHost(c)}/open-apis/auth/v3/tenant_access_token/internal`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({app_id:c.app_id,app_secret:decryptSecret(c.app_secret_encrypted)}),cache:"no-store"});const body=await response.json() as {code:number;msg:string;tenant_access_token?:string};if(!response.ok||body.code!==0||!body.tenant_access_token)throw new Error(`Lark 鉴权失败：${body.msg||response.status}`);return body.tenant_access_token}
export async function testLarkConnection(id:string){const c=fullConnection(id);if(!c)throw new Error("连接不存在");const access=await token(c),url=`${apiHost(c)}/open-apis/bitable/v1/apps/${encodeURIComponent(c.base_token)}/tables/${encodeURIComponent(c.table_id)}/records?page_size=1`;const response=await fetch(url,{headers:{authorization:`Bearer ${access}`},cache:"no-store"});const body=await response.json() as {code:number;msg:string};if(!response.ok||body.code!==0)throw new Error(`无法读取多维表格：${body.msg||response.status}`);return true}
function text(value:unknown){if(value==null)return null;if(typeof value==="string"||typeof value==="number"||typeof value==="boolean")return String(value);if(Array.isArray(value))return value.map(x=>typeof x==="object"&&x&&"text" in x?String((x as {text:unknown}).text):String(x)).join(", ");if(typeof value==="object"&&"text" in value)return String((value as {text:unknown}).text);return JSON.stringify(value)}

export async function syncLarkCustomers(id:string){
  const db=localDb(),c=fullConnection(id);if(!c)throw new Error("连接不存在");
  db.prepare("update lark_sync_runs set status='失败',error_message='同步进程意外中断',completed_at=? where status='运行中' and completed_at is null and datetime(started_at) < datetime('now','-10 minutes')").run(new Date().toISOString());
  const running=db.prepare("select id from lark_sync_runs where connection_id=? and status='运行中' and completed_at is null limit 1").get(id);
  if(running)throw new Error("客户同步正在进行，请等待本次同步完成，勿重复点击");
  const runId=crypto.randomUUID();db.prepare("insert into lark_sync_runs(id,connection_id,status) values(?,?,'运行中')").run(runId,id);
  let total=0,created=0,updated=0,failed=0,skipped=0,unchanged=0;
  const failureDetails: Array<{recordId:string;companyName:string;reason:string}> = [];
  try{
    const access=await token(c),mapping=JSON.parse(c.field_mapping) as LarkMapping;let pageToken="",hasMore=true;
    while(hasMore){
      const u=new URL(`${apiHost(c)}/open-apis/bitable/v1/apps/${c.base_token}/tables/${c.table_id}/records`);u.searchParams.set("page_size","500");if(pageToken)u.searchParams.set("page_token",pageToken);
      const response=await fetch(u,{headers:{authorization:`Bearer ${access}`},cache:"no-store"});const body=await response.json() as {code:number;msg:string;data?:{items:LarkRecord[];has_more:boolean;page_token?:string}};if(!response.ok||body.code!==0||!body.data)throw new Error(body.msg||`HTTP ${response.status}`);
      for(const record of body.data.items){total++;
        const mappedName=text(record.fields[mapping.company_name]);
        if(!mappedName){
          skipped++;
          failureDetails.push({recordId:record.record_id,companyName:"（公司名称为空）",reason:"已跳过：公司名称为空"});
          continue;
        }
        try{
        const name=mappedName;
        const oldByRecord=db.prepare("select id from customers where lark_record_id=? limit 1").get(record.record_id) as {id:string}|undefined;
        const oldByCompany=db.prepare("select id from customers where lower(trim(company_name))=lower(trim(?)) and deleted_at is null limit 1").get(name) as {id:string}|undefined;
        // Append-only sync: existing CRM customers are authoritative. Never
        // overwrite, replace, restore or delete them from Lark data.
        if(oldByRecord||oldByCompany){unchanged++;continue;}
        const values:Record<string,string|null>={};for(const column of mappedColumns)values[column]=mapping[column]?text(record.fields[mapping[column]]):null;
        values.stage=values.stage||"待开发";values.grade=values.grade||"C";values.lark_updated_at=record.last_modified_time?new Date(Number(record.last_modified_time)).toISOString():new Date().toISOString();
        const insertColumns=["id","customer_code","company_name",...mappedColumns,"created_at","lark_record_id","lark_updated_at"];const placeholders=insertColumns.map(()=>"?").join(",");db.prepare(`insert into customers(${insertColumns.join(",")}) values(${placeholders})`).run(crypto.randomUUID(),localNextCustomerCode(values.country),name,...mappedColumns.map(x=>values[x]),new Date().toISOString(),record.record_id,values.lark_updated_at);created++
      }catch(error){
        failed++;
        failureDetails.push({
          recordId: record.record_id,
          companyName: text(record.fields[mapping.company_name]) || "（公司名称为空）",
          reason: error instanceof Error ? error.message : "未知错误",
        });
      }}
      hasMore=body.data.has_more;pageToken=body.data.page_token||"";
    }
    const now=new Date().toISOString();db.prepare("update lark_connections set last_synced_at=? where id=?").run(now,id);db.prepare("update lark_sync_runs set status='成功',total_records=?,created_records=?,updated_records=?,failed_records=?,skipped_records=?,unchanged_records=?,failure_details=?,completed_at=? where id=?").run(total,created,updated,failed,skipped,unchanged,JSON.stringify(failureDetails),now,runId);return{total,created,updated,failed,skipped,unchanged};
  }catch(error){db.prepare("update lark_sync_runs set status='失败',error_message=?,completed_at=? where id=?").run(error instanceof Error?error.message:"未知错误",new Date().toISOString(),runId);throw error}
}
export function larkSyncRuns(){return localDb().prepare("select * from lark_sync_runs order by started_at desc limit 20").all() as Record<string,unknown>[]}
