# Окно в Китай — Pilot v1.7.1

## Intelligence Ranking + China/Russia Truck Radar

v1.7.1 строится поверх v1.7 source/dedup pipeline и добавляет бизнес-приоритизацию новостей и отдельный коммерческий транспортный контур.

### Intelligence Ranking

Новый `lib/intelligence-ranking.ts` детерминированно оценивает каждую новость по:

- свежести;
- приоритету источника;
- регулированию;
- локализации;
- поставкам;
- технологиям;
- рынку;
- инвестициям;
- качеству/рискам;
- экспорту и торговле.

Система возвращает score 0..100, уровень важности, confidence, `Почему важно`, `Что проверить` и релевантность для пяти аудиторий: Руководство, R&D, Закупки, Производство, Логистика.

На `/analysis` появился верхний Intelligence Brief. Existing evidence/RAG workbench сохранён и переведён на fresh-first corpus, чтобы статические demo seeds не смешивались с актуальной лентой.

### Truck Radar

Новый маршрут `/trucks` и пункт `Грузовики` в основной навигации.

Отслеживаются:

- HCV / MCV / LCV;
- седельные тягачи;
- самосвалы / construction;
- chassis / special vehicles;
- diesel, LNG/CNG, BEV, battery swap, hydrogen, hybrid;
- китайские и российские truck brands;
- cross-market China ↔ Russia relevance.

### Truck sources

Добавлены специализированные источники:

- 卡车网 / China Truck;
- 卡车之家 / 360che;
- Автозавод УРАЛ;
- Грузовой.RU;
- Грузовик Пресс;
- Рейс · Грузовики.

CAAM, MIIT, Shaanxi Automobile, Gasgoo, CnEVPost, AUTOSTAT и другие v1.7 sources также участвуют в truck-классификации.

Source catalog вырос до 27 web sources, 24 включены по умолчанию. Russian sources теперь имеют `language=ru` и не отправляются в translation API.

### News ingestion v2

- source catalog version: 2;
- truck keyword/topic filter;
- Russian market web sources;
- Russian pages work independently of `translate.google` toggle;
- SSRF allow-list расширен только явными truck hostnames;
- fuzzy dedup и per-source stale fallback сохранены;
- aggregate limit увеличен до 160 unique items.

### Integrity

Truck Brand Radar показывает **упоминания в отобранных сигналах**, а не market share. UI прямо это обозначает. Реальные доли/продажи должны приходить из статистических источников отдельно.

### Verification

Обновлены/добавлены:

- `scripts/news-intelligence-preflight.mjs`;
- `tests/news-intelligence-v17.test.mjs`;
- `tests/intelligence-ranking-v171.test.mjs`;
- `tests/runtime-smoke.mjs` (`/trucks`, `/analysis`, sourceCatalogVersion=2);
- `docs/TRUCK_RADAR_v1.7.1.md`.

### DB / migration

Новая migration не требуется. Persistent source snapshots/history v1.7 переиспользуются.
