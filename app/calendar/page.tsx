import type { Metadata } from "next";
import { CorporatePageFrame, CorporatePageHero } from "@/components/corporate-page-hero";
import { EventCalendar } from "@/components/event-calendar";

export const metadata: Metadata = {
  title: "Выставки и события — Окно в Китай",
  description: "Автомобильные выставки, автосалоны и B2B-форумы Китая.",
};

export default function CalendarPage() {
  return (
    <CorporatePageFrame className="corporate-page-calendar">
      <CorporatePageHero
        variant="expo"
        kicker="Выставки и события"
        title={<>Календарь выставок Китая</>}
        subtitle="Ключевые отраслевые выставки, автосалоны и B2B-мероприятия в Китае — с понятной информацией для подготовки деловой поездки."
        tagline={<>События, которые<br />стоит знать заранее.</>}
      />
      <EventCalendar />
    </CorporatePageFrame>
  );
}
