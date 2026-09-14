import { createRequestContext, jsonWithContext } from "@/lib/request-context";
import { trackUsage } from "@/lib/user-store";
import { resolveUserContext, withUserCookie } from "@/lib/user-context";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
export const dynamic="force-dynamic";

const maxBodyBytes = 16_384;

async function readTrackingBody(request: Request): Promise<Record<string, unknown> | null | undefined> {
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch { return undefined; }
}

export async function POST(request:Request){
  const c=createRequestContext(request),u=resolveUserContext(request);
  const limit=checkRateLimit({context:c,scope:"user-track",limit:Number(process.env.RATE_LIMIT_READ_PER_MINUTE||120)});
  if(!limit.allowed)return jsonWithContext(c,{error:"Слишком много запросов."},{status:429,headers:withUserCookie(u,{"cache-control":"no-store",...rateLimitHeaders(limit)})});
  const body=await readTrackingBody(request);
  if(body===null)return jsonWithContext(c,{error:"Слишком большой запрос."},{status:413,headers:withUserCookie(u,{"cache-control":"no-store",...rateLimitHeaders(limit)})});
  if(body===undefined)return jsonWithContext(c,{error:"Некорректный JSON."},{status:400,headers:withUserCookie(u,{"cache-control":"no-store",...rateLimitHeaders(limit)})});
  const eventName=typeof body.eventName==="string"?body.eventName:"unknown",path=typeof body.path==="string"?body.path:new URL(request.url).pathname,metadata=body.metadata&&typeof body.metadata==="object"&&!Array.isArray(body.metadata)?body.metadata as Record<string, unknown>:{};
  trackUsage(u.userKey,eventName,path,metadata);
  return jsonWithContext(c,{ok:true},{headers:withUserCookie(u,{"cache-control":"no-store",...rateLimitHeaders(limit)})});
}
