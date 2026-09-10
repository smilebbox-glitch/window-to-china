import type { Metadata } from "next";
import { Hotel, MapPin, Plane, TicketCheck } from "lucide-react";
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
        description="Ниже сохраняются фильтры, официальная регистрация и travel-блоки. Для предстоящих выставок отели привязаны к конкретной площадке и открываются напрямую на Trip.com."
        items={[
          { eyebrow: "География", title: "China only", description: "В пользовательском календаре остаются только релевантные отраслевые события Китая.", icon: <MapPin className="size-5" />, tone: "red" },
          { eyebrow: "Приоритет", title: "Worth the trip", description: "Карточка объясняет зачем ехать, формат доступа и стоимость билета на человека.", icon: <TicketCheck className="size-5" />, tone: "orange" },
          { eyebrow: "Подготовка", title: "Trip.com hotels", description: "Показываются отели рядом с площадкой с рейтингом, отзывами, адресом и прямой ссылкой на Trip.com.", icon: <Hotel className="size-5" />, tone: "blue" },
          { eyebrow: "Логистика", title: "Flight context", description: "Travel-блок сохраняет ориентир по перелёту и маршруту от Шереметьево до площадки выставки.", icon: <Plane className="size-5" />, tone: "green" },
        ]}
      />
      <PilotEventCalendar />
    </CorporatePageFrame>
  );
}
