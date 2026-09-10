"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

type Item = { id: string; title: string; body: string; updatedAt: string };
export function ManagedContentPanel({ section = "travel-guide" }: { section?: string }) {
  const [items,setItems]=useState<Item[]>([]);
  useEffect(()=>{fetch(`/api/content?section=${encodeURIComponent(section)}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>setItems(d?.items||[])).catch(()=>{});},[section]);
  if(!items.length) return null;
  return <section className="mt-8 rounded-2xl border border-[#d9e6f1] bg-white p-5 sm:p-6"><div className="flex items-center gap-2 font-semibold text-[#17345f]"><Megaphone className="size-5 text-[#147efb]"/> Корпоративные заметки</div><div className="mt-4 grid gap-3 md:grid-cols-2">{items.map(item=><article key={item.id} className="rounded-xl border border-[#e1ebf4] bg-[#f8fbff] p-4"><h3 className="font-semibold text-[#17345f]">{item.title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#405f82]">{item.body}</p><p className="mt-3 text-[11px] text-[#7186a2]">Обновлено {new Date(item.updatedAt).toLocaleString("ru-RU")}</p></article>)}</div></section>;
}
