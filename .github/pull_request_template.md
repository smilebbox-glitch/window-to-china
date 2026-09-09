## Изменение

Кратко опишите, что меняется и зачем.

## Security / privacy

- [ ] В diff нет `.env`, токенов, паролей, приватных ключей, внутренних production URL или персональных/конфиденциальных данных.
- [ ] Изменения auth/roles/cookies/CORS/HTTPS/SSO/admin API проверены отдельно.
- [ ] Не добавлены новые опубликованные Docker-порты без явного обоснования и review.
- [ ] PWA/service worker не кэширует auth/API/private/user-specific данные.
- [ ] Security-critical изменения сохраняют fail-closed поведение.

## Verification

- [ ] Server and mobile security gate проходит.
- [ ] CodeQL не показывает новых проблем.
- [ ] Repository integrity проходит.
- [ ] Для runtime/deployment изменений выполнены соответствующие Docker/VM smoke tests.

## Risk / rollback

Опишите основной риск и способ отката, если изменение затрагивает runtime, deployment, security или данные.
