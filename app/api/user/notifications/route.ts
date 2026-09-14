import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { listNotifications, markNotificationsRead } from "@/lib/user-store";
import { resolveUserContext, withUserCookie } from "@/lib/user-context";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
export const dynamic="force-dynamic";
export async function GET(request:Request){const c=createRequestContext(request),u=resolveUserContext(request),limit=checkRateLimit({context:c,scope:"user-notifications-read",limit:Number(process.env.RATE_LIMIT_READ_PER_MINUTE||120)});if(!limit.allowed)return jsonWithContext(c,{error:"Слишком много запросов."},{status:429,headers:withUserCookie(u,{...rateLimitHeaders(limit),"cache-control":"no-store"})});const notifications=listNotifications(u.userKey);return jsonWithContext(c,{notifications,unread:notifications.filter(n=>!n.readAt).length},{headers:withUserCookie(u,{"cache-control":"no-store",...rateLimitHeaders(limit)})});}
export async function PATCH(request:Request){const c=createRequestContext(request),u=resolveUserContext(request),body=await request.json().catch(()=>({}));const ids=Array.isArray(body.ids)?body.ids.filter((x:unknown):x is string=>typeof x==="string"):undefined;return jsonWithContext(c,{changed:markNotificationsRead(u.userKey,ids)},{headers:withUserCookie(u,{"cache-control":"no-store"})});}
