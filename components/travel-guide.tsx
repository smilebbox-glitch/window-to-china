import {
  ArrowUpRight,
  BatteryCharging,
  BriefcaseBusiness,
  Camera,
  CarFront,
  CircleAlert,
  CreditCard,
  Download,
  FileCheck2,
  Flame,
  Hotel,
  Languages,
  Luggage,
  MessageCircle,
  Navigation,
  ShieldAlert,
  Smartphone,
  Utensils,
  WifiOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { tripDocuments, unionPayOptions } from "@/lib/travel";
import { TripWorkspaceNav } from "@/components/trip-workspace-nav";
import { CurrencyExchange } from "@/components/currency-exchange";
import { ManagedContentPanel } from "@/components/managed-content-panel";

const officialLinks = {
  visa: "https://ru.china-embassy.gov.cn/rus/lsfw_143010/zytz_142816/202605/t20260520_11914284.htm",
  visaCenter: "https://bio.visaforchina.cn/MOW3_RU/qianzhengyewu",
  powerBank: "https://www.caac.gov.cn/XWZX/MHYW/202506/t20250626_227805.html",
  batteries: "https://www.caac.gov.cn/CXCK/HLZN/201512/t20151214_15866.html",
  prohibited: "https://www.caac.gov.cn/INDEX/HLFW/HKLXCS/202303/t20230316_217597.html",
  customs: "https://english.customs.gov.cn/",
  internet: "https://www.gov.uk/foreign-travel-advice/china/safety-and-security#internet-access",
};

const currentTripDocuments = [
  ...tripDocuments.slice(0, 3),
  "Для обычного загранпаспорта РФ действует безвизовый въезд в КНР до 31 декабря 2027 года включительно на срок до 30 дней для бизнеса, туризма, визитов и транзита; перед вылетом всё равно сверяйте условия по цели поездки.",
];

const chinaApps = [
  {
    name: "Alipay",
    chineseName: "支付宝",
    icon: CreditCard,
    purpose: "QR-оплата, транспорт, такси и городские мини-приложения.",
    tip: "Пройдите проверку по загранпаспорту, привяжите карту и настройте резервный способ оплаты до вылета.",
    iosUrl: "https://apps.apple.com/us/app/alipay-simplify-your-life/id333206289",
    androidUrl: "https://play.google.com/store/apps/details?id=com.eg.android.AlipayGphone",
  },
  {
    name: "WeChat",
    chineseName: "微信",
    icon: MessageCircle,
    purpose: "Переписка с партнёрами, QR-контакты, звонки и WeChat Pay.",
    tip: "Зарегистрируйтесь заранее и сохраните контакты принимающей стороны до поездки.",
    iosUrl: "https://apps.apple.com/us/app/wechat/id414478124",
    androidUrl: "https://play.google.com/store/apps/details?id=com.tencent.mm",
  },
  {
    name: "AMap Global",
    chineseName: "高德地图",
    icon: Navigation,
    purpose: "Навигация, общественный транспорт и поиск адресов на китайском.",
    tip: "Сохраните отель и выставочную площадку в избранное ещё до прилёта.",
    iosUrl: "https://apps.apple.com/us/app/amap-global/id461703208",
    androidUrl: "https://play.google.com/store/apps/details?id=com.autonavi.minimap",
  },
  {
    name: "DiDi Rider",
    chineseName: "滴滴出行",
    icon: CarFront,
    purpose: "Заказ такси с маршрутом и ориентиром стоимости заранее.",
    tip: "Храните адрес назначения по-китайски; DiDi также доступен внутри Alipay.",
    iosUrl: "https://apps.apple.com/us/app/didi-rider-affordable-rides/id1362398401",
    androidUrl: "https://play.google.com/store/apps/details?id=com.sdu.didi.psnger",
  },
  {
    name: "Trip.com",
    chineseName: "携程旅行",
    icon: Hotel,
    purpose: "Отели, авиабилеты, железнодорожные билеты и англоязычная поддержка.",
    tip: "Для поездов написание имени должно совпадать с загранпаспортом.",
    iosUrl: "https://apps.apple.com/us/app/trip-com-book-flights-hotels/id681752345",
    androidUrl: "https://play.google.com/store/apps/details?id=ctrip.english",
  },
  {
    name: "Meituan",
    chineseName: "美团",
    icon: Utensils,
    purpose: "Рестораны, доставка, отзывы и городские сервисы.",
    tip: "Интерфейс в основном китайский; части функций может понадобиться местный номер.",
    iosUrl: "https://apps.apple.com/cn/app/%E7%BE%8E%E5%9B%A2-%E9%97%AE%E7%BE%8E%E5%9B%A2-%E9%83%BD%E5%AE%89%E6%8E%92/id423084029",
    androidUrl: "https://play.google.com/store/apps/details?id=com.sankuai.meituan",
  },
  {
    name: "Pleco",
    chineseName: "汉语词典",
    icon: Languages,
    purpose: "Офлайн-словарь и быстрое распознавание китайских надписей.",
    tip: "Загрузите словари и нужные офлайн-модули до вылета.",
    iosUrl: "https://apps.apple.com/us/app/pleco-chinese-dictionary/id341922306",
    androidUrl: "https://play.google.com/store/apps/details?id=com.pleco.chinesesystem",
  },
];

const limitedServices = [
  { title: "Google и YouTube", items: "Google Search, Gmail, Google Maps, Google Drive, YouTube и Google Play" },
  { title: "Социальные сети", items: "Facebook, Instagram, Messenger, Threads и X" },
  { title: "Мессенджеры", items: "WhatsApp, Telegram и Signal" },
  { title: "Справочные сервисы", items: "Wikipedia и часть иностранных новостных сайтов" },
];

const etiquette = [
  { icon: Utensils, title: "Палочки и еда", text: "Не втыкайте палочки вертикально в рис, не указывайте ими на людей и не передавайте еду из палочек в палочки." },
  { icon: BriefcaseBusiness, title: "Деловое общение", text: "Будьте пунктуальны. Визитку и документы передавайте двумя руками; обращайтесь по фамилии и должности." },
  { icon: Camera, title: "Фото и заводы", text: "Спрашивайте разрешение перед съёмкой людей, производственных линий и прототипов. Не фотографируйте охраняемые объекты." },
  { icon: Smartphone, title: "Связь и оплата", text: "До вылета настройте Alipay или WeChat Pay, привяжите карту и сохраните адреса по-китайски. Держите резерв наличных." },
];

export function TravelGuide() {
  return (
    <main className="min-h-0">
      <div className="mx-auto max-w-[1480px] px-4 pb-10 pt-2 sm:px-6 lg:px-8">
        <div className="mb-5 flex justify-end"><TripWorkspaceNav active="rules" /></div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[22px] border border-[#dce7f0] bg-white p-5 shadow-[0_12px_36px_rgba(21,54,91,.06)] sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#147efb]"><FileCheck2 className="size-4" /> Travel readiness</div>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10285c]">Комплект документов</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f86a4]">Минимальный набор для рабочей поездки. Конкретные требования авиакомпании, выставки и принимающей стороны проверяются отдельно.</p>
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {currentTripDocuments.map((item, index) => (
                <li key={item} className="flex gap-3 rounded-2xl border border-[#e0e9f2] bg-[#f9fbfd] p-4 text-sm leading-6 text-[#516d8c]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#eaf4ff] text-xs font-black text-[#147efb]">{index + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-[22px] border border-[#f0d9ae] bg-[linear-gradient(145deg,#fff9ee_0%,#fff_72%)] p-5 shadow-[0_12px_36px_rgba(21,54,91,.05)] sm:p-6">
            <div className="flex items-center gap-2 text-sm font-black text-[#9a610d]"><ShieldAlert className="size-5" /> Безвизовый режим РФ → КНР</div>
            <p className="mt-3 text-sm leading-6 text-[#5f7897]">Китай продлил односторонний безвизовый режим для граждан РФ с обычными паспортами <strong className="text-[#173368]">до 31 декабря 2027 года включительно</strong>. Разрешённый срок пребывания — до 30 дней для бизнеса, туризма, посещения родственников и друзей, обменов и транзита.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <SourceLink href={officialLinks.visa}>Посольство КНР</SourceLink>
              <SourceLink href={officialLinks.visaCenter}>Визовый центр</SourceLink>
            </div>
            <p className="mt-4 text-[11px] font-semibold text-[#96794e]">Сверено 9 сентября 2026 года. Для нестандартной цели или более длительного пребывания нужна отдельная проверка визовых условий.</p>
          </aside>
        </section>

        <section className="mt-8">
          <SectionHeading eyebrow="Телефон до вылета" title="Приложения, которые нужны в Китае" text="Установите приложения заранее, войдите в аккаунты, проверьте карты и сохраните ключевые адреса. Это снижает зависимость от ограниченного доступа к зарубежным сервисам уже после прилёта." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {chinaApps.map(({ name, chineseName, icon: Icon, purpose, tip, iosUrl, androidUrl }) => (
              <article key={name} className="flex flex-col rounded-[22px] border border-[#dfe8f1] bg-white p-5 shadow-[0_10px_30px_rgba(21,54,91,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(21,54,91,.08)]">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf6ff] text-[#147efb]"><Icon className="size-5" /></span>
                  <span className="text-sm font-bold text-[#8a9bb0]">{chineseName}</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-[#173368]">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#506e8d]">{purpose}</p>
                <p className="mt-3 flex-1 text-xs leading-5 text-[#8193aa]">{tip}</p>
                <div className="mt-5 grid grid-cols-2 gap-2"><DownloadLink href={iosUrl}>iPhone</DownloadLink><DownloadLink href={androidUrl}>Android</DownloadLink></div>
              </article>
            ))}
          </div>

          <div className="mt-5 rounded-[22px] border border-[#ecd9bf] bg-[#fffaf4] p-5 sm:p-6">
            <div className="flex items-center gap-2 font-black text-[#8c5b16]"><WifiOff className="size-5" /> Что может быть недоступно в материковом Китае</div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {limitedServices.map((group) => (
                <div key={group.title} className="rounded-2xl border border-[#eadfce] bg-white p-4">
                  <h3 className="text-sm font-black text-[#173368]">{group.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-[#6f86a4]">{group.items}</p>
                </div>
              ))}
            </div>
            <div className="mt-4"><SourceLink href={officialLinks.internet}>Проверить ограничения связи</SourceLink></div>
          </div>
        </section>

        <div className="mt-8"><CurrencyExchange /></div>
        <div className="mt-6"><ManagedContentPanel /></div>

        <section className="mt-8">
          <SectionHeading eyebrow="Оплата в Китае" title="UnionPay как резервный платёжный контур" text="Варианты берутся из текущего справочника пилота. Перед выпуском карты обязательно перепроверьте тариф, валюту счёта и фактическую работоспособность в Китае." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {unionPayOptions.map((option) => (
              <article key={option.bank} className="rounded-[22px] border border-[#dfe8f1] bg-white p-5 shadow-[0_10px_30px_rgba(21,54,91,.05)]">
                <CreditCard className="size-5 text-[#147efb]" />
                <h3 className="mt-4 font-black text-[#173368]">{option.bank}</h3>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#6956c8]">{option.status}</p>
                <p className="mt-4 text-sm leading-6 text-[#607b99]">{option.howToOpen}</p>
                <p className="mt-3 text-xs leading-5 text-[#8496aa]">{option.cost}</p>
                <div className="mt-4"><SourceLink href={option.url}>Сайт банка</SourceLink></div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <SectionHeading eyebrow="Багаж и граница" title="Что проверить до аэропорта" text="Короткий список не заменяет правила авиакомпании и таможни, но закрывает наиболее частые ошибки перед поездкой." />
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <RuleCard icon={BatteryCharging} title="Power bank: CCC и ватт-часы" tone="blue">
              <p>На внутренних рейсах КНР с 28 июня 2025 года нельзя брать устройство без читаемой маркировки CCC/3C, а также отозванную модель. Power bank перевозится только в ручной клади и не используется в полёте.</p>
              <p className="mt-3">До 100 Wh — без согласования; свыше 100 до 160 Wh — с разрешения авиакомпании, не более двух; свыше 160 Wh — запрещено. «10 000 mAh» при 3,7 V — примерно 37 Wh: лимит измеряется в Wh.</p>
              <div className="mt-4 flex flex-wrap gap-2"><SourceLink href={officialLinks.powerBank}>Правило CCC</SourceLink><SourceLink href={officialLinks.batteries}>Лимиты батарей</SourceLink></div>
            </RuleCard>
            <RuleCard icon={Flame} title="Зажигалки и опасные предметы" tone="orange">
              <p>Не рассчитывайте провезти зажигалку или потенциально опасный предмет без отдельной проверки правил конкретного маршрута. Ограничения могут отличаться для ручной клади и багажа.</p>
              <p className="mt-3">Если предмет вызывает сомнение, сверяйте его по правилам авиакомпании и гражданской авиации КНР до поездки в аэропорт.</p>
              <div className="mt-4"><SourceLink href={officialLinks.prohibited}>Правила гражданской авиации</SourceLink></div>
            </RuleCard>
            <RuleCard icon={Luggage} title="Таможня и рабочие материалы" tone="green">
              <p>Для образцов, оборудования, дорогой электроники и иных рабочих материалов заранее уточняйте режим временного ввоза/вывоза и корпоративные документы.</p>
              <p className="mt-3">Не полагайтесь на туристические нормы, если предмет связан с коммерческой или производственной деятельностью.</p>
              <div className="mt-4"><SourceLink href={officialLinks.customs}>China Customs</SourceLink></div>
            </RuleCard>
            <RuleCard icon={CircleAlert} title="Перед выходом из дома" tone="red">
              <p>Паспорт, регистрация/приглашение, страховка, билеты, адрес отеля и площадки на китайском, доступ к оплате и резерв наличных должны быть доступны офлайн.</p>
              <p className="mt-3">Рабочие контакты храните не только в одном мессенджере.</p>
            </RuleCard>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeading eyebrow="Культурный код" title="Деловой этикет без лишней теории" text="Несколько правил, которые действительно полезны на заводе, переговорах, выставке и деловом ужине." />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {etiquette.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-[22px] border border-[#dfe8f1] bg-white p-5 shadow-[0_10px_30px_rgba(21,54,91,.05)]">
                <span className="grid size-10 place-items-center rounded-xl bg-[#edf6ff] text-[#147efb]"><Icon className="size-5" /></span>
                <h3 className="mt-4 font-black text-[#173368]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#607b99]">{text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="px-2">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#147efb]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#10285c] sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f86a4]">{text}</p>
    </div>
  );
}

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[#d9e6f1] bg-white px-3 py-2 text-xs font-black text-[#147efb] transition hover:-translate-y-0.5 hover:border-[#a9ccef] hover:bg-[#f5faff]">
      {children}<ArrowUpRight className="size-3.5" />
    </a>
  );
}

function DownloadLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-[#dce8f2] bg-[#f8fbfe] px-3 py-2.5 text-xs font-black text-[#426583] transition hover:border-[#aacbed] hover:bg-white hover:text-[#147efb]">
      <Download className="size-3.5" />{children}
    </a>
  );
}

function RuleCard({ icon: Icon, title, tone, children }: { icon: LucideIcon; title: string; tone: "blue" | "orange" | "green" | "red"; children: React.ReactNode }) {
  const tones = {
    blue: "bg-[#edf6ff] text-[#147efb]",
    orange: "bg-[#fff5e9] text-[#b86f0b]",
    green: "bg-[#eaf8f3] text-[#0b9b78]",
    red: "bg-[#fff0ef] text-[#d92d20]",
  };
  return (
    <article className="rounded-[22px] border border-[#dfe8f1] bg-white p-5 shadow-[0_10px_30px_rgba(21,54,91,.05)] sm:p-6">
      <div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span><h3 className="font-black text-[#173368]">{title}</h3></div>
      <div className="mt-4 text-sm leading-6 text-[#607b99]">{children}</div>
    </article>
  );
}
