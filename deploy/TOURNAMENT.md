# Тэмцээний систем — тусдаа сервер (`chess.daamal.org`)

Тэмцээн нь ачаалал өндөртэй: олон зуун хүн **нэг агшинд** хос сугалж, цаг
тоолж, үр дүн илгээнэ. Тиймээс үндсэн сургалтын аппаас **тусдаа** сервер,
тусдаа домэйн дээр ажиллана. Тэмцээн унасан ч хичээл үргэлжилнэ; эсрэгээрээ
ч мөн адил.

**Бүртгэл нь нэг.** Тэмцээний сайт өөрийн нууц үг, бүртгэлийн маягт
**эрхлэхгүй** — Firebase uid нь хоёр талд яг ижил.

## Урсгал

```
Сурагч → daamal.org цэс «Тэмцээн»
       → /tournament (гүүр хуудас)
       → POST /api/tournament/session          ← нэвтэрсэн байх ёстой
       ← { url: "https://chess.daamal.org/auth/handoff?ticket=…" }
       → хөтөч тэр хаяг руу шилжинэ
                    ↓
   Тэмцээний СЕРВЕР (хөтөч биш):
       POST https://daamal.org/api/tournament/exchange
       header: x-tournament-secret: <TOURNAMENT_SHARED_SECRET>
       body:   { "ticket": "…" }
       ← { token: "<firebase custom token>", user: { …профайл… } }
                    ↓
       клиент дээр signInWithCustomToken(token)
```

## Яагаад тасалбар нь шууд токен биш вэ

Тасалбар URL-д **ил** явдаг — хөтчийн түүх, `Referer`, прокси лог руу
нэвдэрч болно. Тиймээс тасалбар өөрөө нэвтрэлт **биш**, зөвхөн «энэ хүнийг
солих эрх». Жинхэнэ Firebase токеныг зөвхөн нууц түлхүүр мэдэх сервер,
server-to-server сувгаар авна.

- **Хугацаа: 90 секунд.** Зөвхөн шилжилтийн хэдэн секундыг давах ёстой.
- **Гарын үсэг: HMAC-SHA256**, stateless — PM2 cluster-ийн аль ч instance
  шалгана.
- **Нэг удаагийн хэрэглээ:** `REDIS_URL` тохируулсан үед `jti`-гээр
  таслагдана. ⚠ Redis-гүй бол 90 секундын дотор дахин ашиглах боломжтой —
  cluster дээр Redis-ийг **зөвлөнө**.

## Тохиргоо

`.env.local` (үндсэн апп дээр):

```
NEXT_PUBLIC_TOURNAMENT_URL=https://chess.daamal.org
TOURNAMENT_SHARED_SECRET=<openssl rand -base64 48>
```

Тэмцээний сервер дээр **яг ижил** `TOURNAMENT_SHARED_SECRET`, мөн ижил
Firebase төслийн клиент тохиргоо.

- `NEXT_PUBLIC_TOURNAMENT_URL` хоосон бол цэсэнд «Тэмцээн» **огт гарахгүй**
  — апп бүрэн ажиллана.
- ⚠ `NEXT_PUBLIC_` угтвартай тул build үед шигтгэгдэнэ: солисны дараа зөвхөн
  restart хангалтгүй, **дахин build** хийнэ.
- ⚠ `TOURNAMENT_SHARED_SECRET` **32 тэмдэгтээс богино** бол тасалбар олгох
  боломж унтарч, `/tournament` нь 503 өгнө (чимээгүй эвдрэхээс дээр).

## Алдааны кодууд

| Код | Утга |
| --- | --- |
| `tournament-disabled` | `NEXT_PUBLIC_TOURNAMENT_URL` тохируулаагүй |
| `tournament-unconfigured` | Нууц түлхүүр байхгүй/богино |
| `firebase-unconfigured` | Firebase Admin service account дутуу |
| `malformed` / `bad-signature` | Тасалбар гэмтсэн эсвэл хуурамч |
| `expired` | 90 секунд өнгөрсөн |
| `used` | Дахин ашиглах оролдлого (Redis-тэй үед) |
| `no-profile` / `account-*` | Postgres дээр бүртгэлгүй эсвэл идэвхгүй |
