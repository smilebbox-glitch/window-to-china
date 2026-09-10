import type { Metadata } from "next";
import { CalendarCheck2, MapPin, Plane, TicketCheck } from "lucide-react";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { ExecutivePageLens } from "@/components/executive-page-lens";
import { PilotEventCalendar } from "@/components/pilot-event-calendar";
import styles from "../executive-pages.module.css";

export const metadata: Metadata = {
  title: "Выставки и события — Окно в Китай",
  description: "Автомобильные выставки, автосалоны и B2B-форумы Китая.",
};

export default function CalendarPage() {
  return (
    <CorporatePageFrame className={`corporate-page-calendar ${styles.calendarPage}`}>
      <CorporatePageHero
        variant="expo"
        kicker="China Event Intelligence"
        title={<>Выставки Китая как рабочий инструмент</>}
        subtitle="Ключевые автосалоны, компонентные выставки и B2B-мероприятия Китая — с приоритетом, официальной регистрацией и данными для подготовки деловой поездки."
        tagline={<>Событие → поездка →<br />деловой результат.</>}
      />
      <ExecutivePageLens
        label="Event intelligence"
        title="Не просто календарь — контекст для решения о поездке"
        description="Ниже сохраняются фильтры, регистрация, выгрузка .ics и travel-блоки. Для предстоящих выставок отели проверены относительно конкретной площадки."
        items={[
          { eyebrow: "География", title: "China only", description: "В пользовательском календаре остаются только релевантные отраслевые события Китая.", icon: <MapPin className="size-5" />, tone: "red" },
          { eyebrow: "Приоритет", title: "Worth the trip", description: "Карточка объясняет зачем ехать, формат доступа и стоимость билета на человека.", icon: <TicketCheck className="size-5" />, tone: "orange" },
          { eyebrow: "Подготовка", title: "Verified hotels", description: "Показываются прямые ссылки на отели, действительно расположенные рядом с площадкой выставки.", icon: <Plane className="size-5" />, tone: "blue" },
          { eyebrow: "Планирование", title: "Calendar export", description: "Выбранное событие можно сразу сохранить в корпоративный или личный календарь через .ics.", icon: <CalendarCheck2 className="size-5" />, tone: "green" },
        ]}
      />
      <PilotEventCalendar />
    </CorporatePageFrame>
  );
}
