# Окно в Китай — каталог источников v1.7

## Цель

Каталог построен не по принципу «чем больше сайтов, тем лучше», а по принципу независимых типов сигнала: официальный автопром, рынок/продажи, технологии, поставщики, внешняя торговля, макроэкономика и регулирование.

Одинаковые публикации не должны занимать несколько карточек. При конфликте сохраняется первичный/более авторитетный источник, затем более свежая публикация.

## Активные web-источники

| Источник | Тип | Фокус | Priority | URL |
|---|---|---|---:|---|
| Shaanxi Automobile | official | SHACMAN, производство, продукты | 100 | https://www.sxqc.com/ |
| CAAM | official | производство, продажи, экспорт, CV/NEV | 100 | https://www.caam.org.cn/ |
| MIIT China · Automotive Industry | official | стандарты, допуски, NEV, smart vehicles | 100 | https://www.miit.gov.cn/jgsj/zbys/qcgy/ |
| MOFCOM China | official | торговая политика, экспорт/импорт, инвестиции | 100 | https://english.mofcom.gov.cn/News/index.html |
| National Bureau of Statistics of China | official | промышленность, производство, инвестиции | 100 | https://www.stats.gov.cn/english/PressRelease/ |
| China Automobile Dealers Association | official | passenger cars, дилеры, запасы, рынок | 98 | https://www.cada.cn/ |
| 人民网汽车 | official | автомобильная отрасль и политика | 94 | https://auto.people.com.cn/ |
| 新华网汽车 | official | автомобильная отрасль и политика | 94 | https://www.xinhuanet.com/auto/ |
| 央视网汽车 | official | автомобильная отрасль | 92 | https://auto.cctv.com/ |
| Gasgoo | media / specialist | OEM, Tier-1/Tier-2, supply chain, batteries | 91 | https://autonews.gasgoo.com/ |
| CnEVPost | media / specialist | NEV/EV, продажи, экспорт, батареи | 90 | https://cnevpost.com/industry/ |
| Yicai Global | media / business | автопром, инвестиции, локализация, экспорт | 85 | https://www.yicaiglobal.com/auto |
| China Briefing | media / business | регуляторика, trade, foreign investment | 83 | https://www.china-briefing.com/news/ |
| 汽车之家 | media | автомобили / NEV | 80 | https://www.autohome.com.cn/ |
| 易车 | media | автомобили / NEV | 79 | https://www.yiche.com/ |
| 太平洋汽车 | media | автомобили / NEV | 78 | https://www.pcauto.com.cn/ |
| 36Kr Global | media / tech | AI, robotics, smart mobility, startups | 77 | https://eu.36kr.com/en/ |
| CarNewsChina | media | быстрые новости китайских автомобилей / EV | 74 | https://carnewschina.com/ |

## Резерв / data candidates

| Источник | Причина не включать по умолчанию |
|---|---|
| China Daily Motoring | часть сюжетов может повторять агентские/официальные публикации; priority ниже первичных |
| Caixin Global | ценный анализ, но возможны paywall и bot protection; нужен отдельный connector/parser contract |
| China Customs (GACC) | важная официальная статистика, но это data-source, а не нормальная оперативная новостная лента |

## Telegram и российские источники

Существующие Telegram-каналы и АВТОСТАТ сохранены. Они нужны для скорости и российского контекста, но при fuzzy-дубле уступают официальному или специализированному первоисточнику.

## Дедупликация v1.7

1. Канонизация URL и удаление tracking-параметров.
2. Exact duplicate по URL.
3. Нормализация заголовков в токены (RU/EN stop words удаляются).
4. Сравнение заголовков в окне 72 часа.
5. Fuzzy duplicate, если:
   - Jaccard >= 0.68, или
   - containment >= 0.82,
   - и совпало не менее 3 содержательных токенов.
6. Если две публикации признаны одной историей, выбирается публикация с большим source priority; при равенстве — live перед stale, затем более новая.

Это позволяет схлопывать, например, официальный релиз → пересказ медиа → Telegram-перепечатку в одну карточку.

## Отказоустойчивость

Каждый источник имеет отдельный snapshot в SQLite. Если конкретный сайт недоступен, остальные источники продолжают работу; для упавшего источника может использоваться его свежий stale snapshot. Общая лента больше не зависит от успешности одного портала.

## Ограничение нагрузки

- параллельность источников: `NEWS_SOURCE_CONCURRENCY=5`;
- timeout HTTP: 5 s;
- deadline источника: 7.5 s;
- общий request deadline: 14 s;
- максимальный возраст live-новостей: 45 дней;
- агрегат кэшируется и прогревается scheduler-ом.

Настройки можно менять через `.env`, но для пилота рекомендуются значения по умолчанию.

## Контроль качества

`/api/admin/reliability` теперь возвращает `newsSources` с количеством источников и валидностью каталога. История успешности/ошибок каждого job продолжает храниться в `source_history`.
