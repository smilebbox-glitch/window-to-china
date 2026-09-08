# Окно в Китай — Pilot v1.7.5

## Controlled Corporate Pilot

v1.7.5 переводит систему из технического Pilot Candidate в управляемую корпоративную волну с измеримыми KPI и формальным итогом `GO / ADJUST / STOP`.

Персонального Watchlist нет.

### Cohort

Добавлена Wave 1 на 5–10 участников с:

- кодом участника;
- подразделением;
- pilot role;
- status;
- HMAC user key.

Raw SSO subject / login / e-mail не сохраняются в `pilot_members`.

### Controlled access

Новый `PILOT_ENFORCE_COHORT=YES` ограничивает viewer-доступ активной/приглашённой cohort. Editor/Admin сохраняют staff bypass для сопровождения.

Pilot role не заменяет и не расширяет application RBAC.

### Feedback

Новый `/pilot`:

- participant видит форму feedback;
- editor/admin видит Pilot Control Room;
- admin может добавлять SSO subject в cohort;
- raw subject сразу псевдонимизируется;
- feedback фиксирует rating, severity, useful business signal и оценку сэкономленного времени.

### KPI

Controlled Pilot считает:

- cohort size;
- active users/rate;
- returning users/rate;
- usage events;
- feedback coverage;
- average rating;
- useful business signals;
- saved minutes;
- major/blocker feedback;
- activity по подразделениям.

Returning user определяется по активности минимум в два разных календарных дня.

### Outcome

- `GO` — operational gate и KPI выполнены;
- `ADJUST` — blocker нет, но KPI/major feedback требуют corrective action;
- `STOP` — operational `NO_GO` или blocker feedback.

Weekly и Final review сохраняются в SQLite как immutable review snapshots.

### API

Добавлены:

- `GET /api/pilot/me`;
- `GET/POST /api/pilot/cohort`;
- `GET/POST /api/pilot/feedback`;
- `GET /api/pilot/report`;
- `GET/POST /api/pilot/reviews`.

### Privacy

SSO subject преобразуется через `HMAC-SHA256` с `USER_DATA_HMAC_KEY`. В Pilot Control Room показывается только participant code, department и короткий hash fingerprint.

### DB

Добавлена migration 4:

- `pilot_members`;
- `pilot_feedback`;
- `pilot_reviews`.

### Verification

Добавлены:

- `tests/controlled-pilot-v175.test.mjs`;
- `scripts/controlled-pilot-v175-preflight.mjs`;
- `pilot:controlled` в общий `pilot:preflight`;
- runtime smoke для `/pilot`, `/api/pilot/me` и RBAC pilot-report/cohort;
- `scripts/generate-pilot-outcome.mjs`;
- `npm run pilot:outcome`;
- `docs/CONTROLLED_CORPORATE_PILOT_v1.7.5.md`.

### Rollout

- Day 0 — IT/SSO/roster/preflight;
- Day 1 — 3 пользователя;
- Day 2–3 — Wave 1 до 5–10;
- Day 5 — Weekly Review;
- Day 10 — Final Review + outcome evidence.
