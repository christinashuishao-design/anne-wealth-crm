"use server";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { z } from "zod";

const setupSchema=z.object({
  url:z.string().url().refine(value=>value.startsWith("https://"),"必须使用 HTTPS 地址"),
  anonKey:z.string().trim().refine(value=>value.startsWith("sb_publishable_")||value.startsWith("eyJ"),"请粘贴完整 Publishable/Anon Key，不要填写单词 Publishable"),
  serviceKey:z.string().trim().refine(value=>value.startsWith("sb_secret_")||value.startsWith("eyJ"),"请粘贴完整 Secret/Service Role Key，不要填写说明文字"),
  email:z.string().email(),
  password:z.string().min(10,"密码至少 10 位"),
});

function envValue(value:string){return JSON.stringify(value.replace(/[\r\n]/g,""));}

export async function saveSetup(formData:FormData){
  if(process.env.NODE_ENV==="production")redirect("/setup?error=生产环境请在部署平台配置环境变量");
  const parsed=setupSchema.safeParse({url:formData.get("url"),anonKey:formData.get("anonKey"),serviceKey:formData.get("serviceKey"),email:formData.get("email"),password:formData.get("password")});
  if(!parsed.success)redirect(`/setup?error=${encodeURIComponent(parsed.error.issues[0]?.message??"配置无效")}`);
  const v=parsed.data;
  const content=[
    `NEXT_PUBLIC_SUPABASE_URL=${envValue(v.url)}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${envValue(v.anonKey)}`,
    `SUPABASE_SERVICE_ROLE_KEY=${envValue(v.serviceKey)}`,
    `SEED_ADMIN_EMAIL=${envValue(v.email)}`,
    `SEED_ADMIN_PASSWORD=${envValue(v.password)}`,
    `CRON_SECRET=${envValue(crypto.randomUUID()+crypto.randomUUID())}`,
    `NEXT_PUBLIC_APP_URL=${envValue("http://localhost:3000")}`,
    "",
  ].join("\n");
  await writeFile(path.join(process.cwd(),".env.local"),content,{encoding:"utf8",flag:"wx"}).catch(async error=>{
    if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;
    await writeFile(path.join(process.cwd(),".env.local"),content,{encoding:"utf8"});
  });
  redirect("/setup?success=1");
}
