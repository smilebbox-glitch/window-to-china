import Link from "next/link";
import { AdminConsole } from "@/components/admin-console";

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6f91ff]">Pilot control plane</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Администрирование</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Состояние интеграций, RBAC, управляемые источники, audit trail и backup/restore runtime-конфигурации. Изменения сохраняются в отдельном volume и не требуют пересборки образа.
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Link href="/pilot" className="border border-[#285fff]/40 bg-[#285fff]/10 p-4 transition-colors hover:border-[#6f91ff]">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[#6f91ff]">v1.7.5 · Controlled Pilot</p>
          <p className="mt-2 text-lg font-black text-white">Pilot Control Room →</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Cohort 5–10 человек, KPI, S1–S4, feedback и итог GO / ADJUST / STOP.</p>
        </Link>
        <Link href="/pilot-feedback" className="border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/30">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-zinc-500">Форма участника</p>
          <p className="mt-2 text-lg font-black text-white">Обратная связь пилота →</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Проверка пользовательского пути и формы без хранения имени или email в pilot feedback.</p>
        </Link>
      </div>

      <AdminConsole />
    </main>
  );
}
