"use client";

import { Bell, BellOff, Check, ExternalLink, Save, Settings2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const POLL_MS = 60_000;
const SEEN_KEY = "okno-web-notifications-seen-v179";
const COMPANY_OPTIONS = ["SHACMAN", "GWM", "EVOLUTE", "VOYAH", "Моторинвест", "ЭВИА", "BYD", "Geely", "Chery", "Li Auto", "NIO", "XPeng"];
const SEGMENT_OPTIONS = [
  "Весь автопром",
  "Коммерческий транспорт",
  "Легковые автомобили",
  "Электромобили и NEV",
  "Компоненты и поставщики",
  "Производство и локализация",
  "Логистика и цепочки поставок",
  "Регулирование и геополитика",
  "Рынок и продажи",
  "Технологии и ADAS",
];

type SubscriptionState = {
  notificationsEnabled: boolean;
  brands: string[];
  segments: string[];
  markets: string[];
  topics: string[];
  cities: string[];
  events: string[];
  eventLeadDays: number;
};

type UserNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  readAt: string | null;
};

const EMPTY_SUBSCRIPTIONS: SubscriptionState = {
  notificationsEnabled: false,
  brands: [],
  segments: [],
  markets: [],
  topics: [],
  cities: [],
  events: [],
  eventLeadDays: 30,
};

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function loadSeen() {
  try {
    const value = JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]") as unknown;
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function storeSeen(ids: Iterable<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-250)));
  } catch {
    // Notification delivery must not depend on local-storage availability.
  }
}

async function showSystemNotification(note: UserNotification) {
  const options: NotificationOptions = {
    body: note.body,
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: `okno-news-${note.id}`,
    data: { url: note.url || "/news" },
  };

  if ("serviceWorker" in navigator && window.isSecureContext) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(note.title, options);
      return;
    } catch {
      // Fall back to the page Notification API below.
    }
  }

  new Notification(note.title, options);
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : value;
}

export function WebNotifications() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<SubscriptionState>(EMPTY_SUBSCRIPTIONS);
  const [draft, setDraft] = useState<SubscriptionState>(EMPTY_SUBSCRIPTIONS);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
  const selectedCount = draft.brands.length + draft.segments.length;
  const recentNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  async function fetchNotifications(deliver = false, enabled = preferences.notificationsEnabled) {
    const response = await fetch("/api/user/notifications", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json() as { notifications?: UserNotification[]; unread?: number };
    const incoming = Array.isArray(payload.notifications) ? payload.notifications : [];
    setNotifications(incoming);
    setUnread(Number(payload.unread || 0));

    if (!deliver || !enabled || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const seen = loadSeen();
    if (!seen.size) {
      storeSeen(incoming.map((item) => item.id));
      return;
    }
    const unseen = incoming.filter((item) => !item.readAt && !seen.has(item.id)).reverse();
    for (const note of unseen.slice(-5)) {
      await showSystemNotification(note).catch(() => undefined);
    }
    for (const note of incoming) seen.add(note.id);
    storeSeen(seen);
  }

  async function load() {
    const [preferencesResponse, notificationsResponse] = await Promise.all([
      fetch("/api/user/preferences", { cache: "no-store" }),
      fetch("/api/user/notifications", { cache: "no-store" }),
    ]);

    let next = EMPTY_SUBSCRIPTIONS;
    if (preferencesResponse.ok) {
      const payload = await preferencesResponse.json() as { subscriptions?: Partial<SubscriptionState> };
      next = { ...EMPTY_SUBSCRIPTIONS, ...(payload.subscriptions || {}) };
      setPreferences(next);
      setDraft(next);
    }

    if (notificationsResponse.ok) {
      const payload = await notificationsResponse.json() as { notifications?: UserNotification[]; unread?: number };
      const incoming = Array.isArray(payload.notifications) ? payload.notifications : [];
      setNotifications(incoming);
      setUnread(Number(payload.unread || 0));
      const seen = loadSeen();
      if (!seen.size) storeSeen(incoming.map((item) => item.id));
    }
    setLoaded(true);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setInterval(() => {
      void fetchNotifications(true, preferences.notificationsEnabled);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loaded, preferences.notificationsEnabled]);

  async function persist(next: SubscriptionState, message: string) {
    setSaving(true);
    const response = await fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    if (!response.ok) {
      setStatus("Не удалось сохранить настройки уведомлений.");
      return false;
    }
    const payload = await response.json() as { subscriptions?: SubscriptionState };
    const saved = payload.subscriptions ? { ...EMPTY_SUBSCRIPTIONS, ...payload.subscriptions } : next;
    setPreferences(saved);
    setDraft(saved);
    setStatus(message);
    return true;
  }

  async function toggleNotifications() {
    const enabling = !draft.notificationsEnabled;
    let next: SubscriptionState = { ...draft, notificationsEnabled: enabling };
    if (enabling && !next.brands.length && !next.segments.length && !next.markets.length && !next.topics.length) {
      next = { ...next, segments: ["Весь автопром"] };
    }

    if (enabling) {
      const seen = loadSeen();
      for (const note of notifications) seen.add(note.id);
      storeSeen(seen);
    }

    const saved = await persist(next, enabling ? "Уведомления включены." : "Уведомления выключены.");
    if (!saved || !enabling) return;

    if (typeof Notification === "undefined") {
      setStatus("Внутренние уведомления включены. Этот браузер не поддерживает системные уведомления.");
      return;
    }
    if (!window.isSecureContext) {
      setStatus("Внутренние уведомления включены. Системные уведомления доступны через HTTPS или localhost.");
      return;
    }
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result === "granted") setStatus("Уведомления включены и разрешены браузером.");
      else setStatus("Внутренние уведомления включены, но системные уведомления заблокированы браузером.");
    } else if (Notification.permission === "denied") {
      setStatus("Внутренние уведомления включены, но системные уведомления заблокированы в настройках браузера.");
    }
  }

  async function saveFilters() {
    await persist(draft, "Интересы для уведомлений сохранены.");
  }

  async function markAllRead() {
    const response = await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (response.ok) {
      setUnread(0);
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`fixed right-4 top-[14px] z-[80] grid size-10 place-items-center rounded-full border ring-4 ring-white/90 transition-all hover:-translate-y-0.5 lg:right-[248px] ${
          preferences.notificationsEnabled
            ? "border-[#9fc9ff] bg-[#edf6ff] text-[#147efb] shadow-[0_8px_22px_rgba(20,126,251,0.18)] hover:border-[#2587ff] hover:bg-white"
            : "border-[#d8e6f2] bg-white text-[#24446d] shadow-[0_6px_18px_rgba(15,57,100,0.10)] hover:border-[#2587ff] hover:text-[#147efb]"
        }`}
        aria-label="Уведомления и интересы"
        aria-pressed={open}
        title={preferences.notificationsEnabled ? "Уведомления включены" : "Уведомления"}
      >
        <Bell className="size-[19px]" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef4444] px-1 text-center text-[10px] font-black leading-none text-white shadow-sm ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : preferences.notificationsEnabled ? (
          <span className="absolute right-0 top-0 size-2.5 rounded-full bg-[#13b58b] ring-2 ring-white" aria-hidden="true" />
        ) : null}
      </button>

      {open && (
        <aside className="fixed right-3 top-[62px] z-[90] w-[calc(100vw-24px)] max-w-[440px] overflow-hidden rounded-2xl border border-[#d7e5f1] bg-white shadow-[0_22px_60px_rgba(16,45,82,0.2)] sm:right-4">
          <div className="flex items-start justify-between border-b border-[#e4edf5] px-4 py-4">
            <div>
              <p className="text-sm font-black text-[#11285e]">Уведомления о новостях</p>
              <p className="mt-1 text-xs leading-5 text-[#6f86a4]">Выберите компании и сегменты автопрома, которые вам важны.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-[#6f86a4] hover:bg-[#f1f6fb]" aria-label="Закрыть">
              <X className="size-4" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-90px)] overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#dce8f3] bg-[#f7fbff] p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${draft.notificationsEnabled ? "bg-[#e8f7f2] text-[#0a9d78]" : "bg-[#eef3f8] text-[#72869f]"}`}>
                  {draft.notificationsEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-[#173368]">Получать уведомления</p>
                  <p className="text-[11px] text-[#7a90aa]">{draft.notificationsEnabled ? "Включены" : "Выключены"}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void toggleNotifications()}
                className={`relative h-7 w-12 rounded-full transition ${draft.notificationsEnabled ? "bg-[#147efb]" : "bg-[#c9d6e2]"}`}
                aria-label={draft.notificationsEnabled ? "Выключить уведомления" : "Включить уведомления"}
              >
                <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${draft.notificationsEnabled ? "left-6" : "left-1"}`} />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-[#5f7897]"><Settings2 className="size-4" />Компании и бренды</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMPANY_OPTIONS.map((company) => (
                  <button key={company} type="button" onClick={() => setDraft((value) => ({ ...value, brands: toggle(value.brands, company) }))} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${draft.brands.includes(company) ? "border-[#2587ff] bg-[#eaf4ff] text-[#147efb]" : "border-[#dce7f0] text-[#587391] hover:border-[#a9c9e8]"}`}>
                    {company}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-black uppercase tracking-[0.08em] text-[#5f7897]">Сегменты автопрома</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SEGMENT_OPTIONS.map((segment) => (
                  <button key={segment} type="button" onClick={() => setDraft((value) => ({ ...value, segments: toggle(value.segments, segment) }))} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${draft.segments.includes(segment) ? "border-[#1ca98c] bg-[#e8f8f3] text-[#07846b]" : "border-[#dce7f0] text-[#587391] hover:border-[#a9c9e8]"}`}>
                    {segment}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" disabled={saving} onClick={() => void saveFilters()} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0d2b5c] text-xs font-black text-white transition hover:bg-[#17437f] disabled:opacity-50">
              <Save className="size-4" />
              Сохранить интересы {selectedCount ? `(${selectedCount})` : ""}
            </button>

            {status && <div className="mt-3 rounded-lg border border-[#dce8f3] bg-[#f7fbff] px-3 py-2 text-xs leading-5 text-[#4f6c8d]">{status}</div>}
            <p className="mt-2 text-[10px] leading-4 text-[#8397ae]">
              Внутренний колокольчик работает в web-версии. Системные уведомления требуют HTTPS/localhost и разрешения браузера. Текущий статус браузера: <b>{permission}</b>.
            </p>

            <div className="mt-5 border-t border-[#e5edf4] pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-[#173368]">Последние уведомления</p>
                {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-bold text-[#147efb]"><Check className="size-3.5" />Прочитано</button>}
              </div>
              <div className="mt-2 space-y-2">
                {recentNotifications.map((note) => (
                  <article key={note.id} className={`rounded-xl border p-3 ${note.readAt ? "border-[#e5edf4] bg-white" : "border-[#b9d8f4] bg-[#f4faff]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-black leading-5 text-[#173368]">{note.title}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#6f86a4]">{note.body}</p>
                        <p className="mt-1 text-[10px] text-[#93a3b5]">{formatTime(note.createdAt)}</p>
                      </div>
                      {note.url && <a href={note.url} target="_blank" rel="noreferrer" className="grid size-7 shrink-0 place-items-center rounded-lg text-[#147efb] hover:bg-[#eaf4ff]" aria-label="Открыть новость"><ExternalLink className="size-3.5" /></a>}
                    </div>
                  </article>
                ))}
                {!recentNotifications.length && <p className="py-5 text-center text-xs text-[#8a9db2]">Пока нет уведомлений. Включите их и выберите интересы.</p>}
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
