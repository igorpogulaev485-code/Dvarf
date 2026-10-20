# DNS для писем КриD20 (Yandex 360 → info@creed20.tech)

SMTP на проде уже логинится в `smtp.yandex.ru` как `info@creed20.tech` и принимает письма
(`AUTH_EMAIL_STUB=false`). Если письма **не доходят** до Gmail / Mail.ru / bk.ru, почти всегда
виновата **DNS-авторизация домена**, а не код регистрации.

На `creed20.tech` сейчас (проверено 2026-10-20) есть только:

- `A` → VPS
- `TXT` `yandex-verification:…`

Нет **MX**, **SPF**, **DKIM**, **DMARC**. Из‑за этого провайдеры часто кладут письма в спам
или отбрасывают их, хотя наш API отвечает «письмо отправлено».

## Что добавить в DNS (reg.ru → creed20.tech)

Значения — стандарт Яндекс 360 для домена. Точный DKIM-ключ копируй из  
[Яндекс 360 → Почта → Домены / DNS-записи](https://admin.yandex.ru/).

| Тип | Имя / хост | Значение |
|-----|------------|----------|
| MX | `@` | `mx.yandex.net.` приоритет **10** |
| TXT (SPF) | `@` | `v=spf1 redirect=_spf.yandex.net` |
| TXT (DKIM) | `mail._domainkey` (или как покажет Яндекс) | `v=DKIM1; k=rsa; t=s; p=…` из кабинета |
| TXT (DMARC, желательно) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@creed20.tech` |

После сохранения подожди распространения DNS (часто 15–60 минут, иногда до суток) и проверь:

```bash
dig +short MX creed20.tech
dig +short TXT creed20.tech
dig +short TXT mail._domainkey.creed20.tech
dig +short TXT _dmarc.creed20.tech
```

В Яндекс 360 статус домена должен стать «проверен / для почты готов».

## Быстрая проверка с VPS

```bash
cd /opt/dvarf
docker compose -f docker-compose.prod.yml exec -T api python -c "
from app.services.mail import send_email
send_email(to='ВАШ@gmail.com', subject='КриD20 SMTP check', text_body='ok')
print('sent')
"
```

Если SMTP `sent`, а письма всё равно нет — смотри спам и DNS выше, не код `/auth/register`.

## Поведение продукта при «письма нет»

- Неподтверждённый email при повторной регистрации: пароль/ник обновляются, ссылка
  подтверждения уходит снова (не «email занят»).
- Уже подтверждённый email: «Войдите или восстановите пароль».
- Админ на VPS может выпустить одноразовую ссылку `/verify-email?token=…` или
  `/reset-password?token=…` из контейнера `api`, если письмо критично нужно вручную.
