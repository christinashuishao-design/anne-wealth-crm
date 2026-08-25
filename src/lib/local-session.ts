import "server-only";
import { cookies } from "next/headers";
import { createHmac,timingSafeEqual } from "node:crypto";

const name="anne_local_session";
function secret(){return process.env.LOCAL_SESSION_SECRET||"";}
function sign(value:string){return createHmac("sha256",secret()).update(value).digest("hex");}
export async function createLocalSession(userId:string){const value=`${userId}.${sign(userId)}`;(await cookies()).set(name,value,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:60*60*12,path:"/"});}
export async function hasLocalSession(){const value=(await cookies()).get(name)?.value;if(!value||!secret())return false;const [id,sig]=value.split(".");if(!id||!sig)return false;const expected=sign(id);return sig.length===expected.length&&timingSafeEqual(Buffer.from(sig),Buffer.from(expected));}
export async function clearLocalSession(){(await cookies()).delete(name);}
