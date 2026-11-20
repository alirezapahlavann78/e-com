# دفترچهٔ دستورات پروژه — آگاهی

همهٔ دستورهای لازم برای نصب، اجرا، دیتابیس، پرداخت، پیام‌ها و عیب‌یابی، با توضیح کوتاه هر کدام.
دستورها را از **ریشهٔ پروژه** (`e-commerc-aghaci`) اجرا کن. نسخهٔ PowerShell ویندوز و معادل macOS/Linux هر دو آمده‌اند.

> هر دستور با `pnpm` اجرا می‌شود و pnpm از طریق Corepack فعال می‌شود:
> ```powershell
> corepack enable
> pnpm -v
> ```

---

## ۱) نصب اولیه (یک‌بار)

```powershell
git clone https://github.com/alirezapahlavann78/e-com.git
cd e-com
corepack enable
pnpm install
```

| دستور | توضیح |
| --- | --- |
| `pnpm install` | نصب همهٔ وابستگی‌های monorepo (api، web، admin، db) |

### ساخت فایل `.env`

```powershell
Copy-Item .env.example .env      # ویندوز
cp .env.example .env             # مک/لینوکس
```

بعد داخل `.env` حداقل این‌ها را مقدار بده (بقیه پیش‌فرض خوب دارند):

```env
JWT_ACCESS_SECRET=یک-رشته-تصادفی-بلند
JWT_REFRESH_SECRET=یک-رشته-تصادفی-دیگر
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci
```

> `.env` در `.gitignore` است و هرگز کامیت نمی‌شود. بدون آن، API بالا می‌آید ولی **لاگین توکن خالی برمی‌گرداند** (خطای secret).

---

## ۲) دیتابیس محلی (بدون Docker)

پروژه یک PostgreSQL 18 جاسازی‌شده (`embedded-postgres`) دارد که روی پورت **55432** بالا می‌آید.

**ترمینال ۱ — دیتابیس (باز نگه دار):**

```powershell
pnpm db:local
```

خروجی موفق:

```
✔ PostgreSQL ready on postgresql://postgres:postgres@127.0.0.1:55432/ecom_aghaci (db encoding: UTF8)
```

**ترمینال ۲ — ساخت ساختار و دادهٔ نمونه:**

```powershell
pnpm db:generate                 # ساخت Prisma Client (بدون دانلود موتور از binaries.prisma.sh)
pnpm --filter @ecom/db build     # خروجی dist برای مصرف API
pnpm db:setup                    # ساخت/به‌روزرسانی جدول‌ها از schema.prisma (idempotent)
pnpm db:seed                     # دادهٔ نمونه: محصول، دسته، صفحه، نظر، سفارش، کاربر
```

| دستور | توضیح |
| --- | --- |
| `pnpm db:local` | روشن‌کردن Postgres جاسازی‌شده (داده در `packages/db/.pgdata`) |
| `pnpm db:local:fresh` | پاک‌کردن کلاستر و ساخت دوباره با UTF8 (دادهٔ لوکال پاک می‌شود) |
| `pnpm db:generate` | تولید Prisma Client |
| `pnpm db:setup` | اعمال DDL از schema + ترمیم ستون‌های جاافتاده |
| `pnpm db:reset` | پاک‌کردن schema عمومی و ساخت دوباره |
| `pnpm db:seed` | دادهٔ نمونه؛ چندبار اجرا بی‌خطر است |
| `pnpm setup` | زنجیرهٔ کامل: generate + build + setup + seed (دیتابیس باید روشن باشد) |

### بعد از هر تغییر در `schema.prisma`

```powershell
pnpm db:generate
pnpm --filter @ecom/db build
pnpm db:setup
```

> اگر API ارور `Property 'xxx' does not exist` داد یعنی کلاینت قدیمی است؛ همین سه دستور را بزن و API را ری‌استارت کن.

---

## ۳) اجرای پروژه

```powershell
pnpm dev
```

| سرویس | آدرس |
| --- | --- |
| فروشگاه | http://localhost:3000 |
| پنل مدیریت | http://localhost:3001 |
| API | http://localhost:4000/api |
| مستندات Swagger | http://localhost:4000/api/docs |
| فایل‌های آپلودی | `apps/api/uploads/` → `/uploads/...` |

اجرای تک‌تک اپ‌ها:

```powershell
pnpm --filter @ecom/api dev
pnpm --filter @ecom/web dev
pnpm --filter @ecom/admin dev
```

---

## ۴) حساب‌ها و دسترسی

| نقش | ایمیل | رمز |
| --- | --- | --- |
| مدیر | `admin@aghaci.local` | `Admin@12345` |
| مشتری نمونه | `sara@example.com` / `reza@example.com` | `Customer@123` |

```powershell
pnpm user:list                                   # فهرست کاربران
pnpm user:unlock                                 # باز کردن قفل همهٔ حساب‌ها
pnpm --filter @ecom/db exec node scripts/account.mjs unlock --email=admin@aghaci.local
pnpm --filter @ecom/db exec node scripts/account.mjs passwd --email=admin@aghaci.local --password=Admin@12345
```

> قفل بعد از ۵ رمز اشتباه (`AUTH_LOCKOUT_MAX_ATTEMPTS`) به مدت ۱۵ دقیقه فعال می‌شود.
> `pnpm user:unlock --email=...` در بعضی نسخه‌های pnpm آرگومان را می‌خورد؛ شکل `--filter ... exec node` مطمئن است.

---

## ۵) پرداخت (درگاه)

تنظیم درگاه دو جا انجام می‌شود و **تنظیم دیتابیس اولویت دارد**:

1. پنل مدیریت → تنظیمات → «درگاه پرداخت» (کلید `payment.gateway`)
2. متغیرهای `.env`:

```env
PAYMENT_PROVIDER=SANDBOX          # SANDBOX | ZARINPAL
PAYMENT_AMOUNT_UNIT=TOMAN         # قیمت‌ها تومان‌اند؛ برای زرین‌پال ×۱۰ ریال می‌شود
API_PUBLIC_URL=http://localhost:4000/api
ZARINPAL_MERCHANT_ID=             # کد پذیرنده
ZARINPAL_SANDBOX=true             # هاست sandbox.zarinpal.com
```

- **SANDBOX** (پیش‌فرض): صفحهٔ تأیید داخلی `/checkout/sandbox`؛ سفارش فقط بعد از تأیید همان صفحه PAID می‌شود. هیچ پول واقعی جابه‌جا نمی‌شود.
- **ZARINPAL**: درخواست واقعی به REST v4؛ آدرس بازگشت باید در پنل زرین‌پال ثبت شود:
  `http://<دامنه>/api/payments/callback/zarinpal`
- اگر زرین‌پال انتخاب شود و merchant id خالی باشد، سفارش ساخته می‌شود ولی پرداخت با خطای واضح (`503 PAYMENT_GATEWAY_ERROR`) برمی‌گردد؛ می‌توان بعداً از `/checkout/result` دکمهٔ «پرداخت مجدد» را زد.

مسیر تست دستی بدون پنل مدیریت:

```powershell
# 1) افزودن کالا به سبد مهمان
curl -X POST "http://127.0.0.1:4000/api/cart/items?guestToken=demo-1" `
  -H "Content-Type: application/json" -d '{\"productId\":\"<ID>\",\"quantity\":1}'

# 2) ثبت سفارش و گرفتن redirectUrl/authority
curl -X POST "http://127.0.0.1:4000/api/checkout" -H "Content-Type: application/json" `
  -d '{\"guestToken\":\"demo-1\",\"email\":\"qa@example.com\",\"shippingAddress\":{\"fullName\":\"تست\",\"phone\":\"09121234567\",\"province\":\"تهران\",\"city\":\"تهران\",\"address1\":\"خیابان ۱\",\"country\":\"ایران\"}}'

# 3) تأیید درگاه آزمایشی
curl -X POST "http://127.0.0.1:4000/api/payments/sandbox/complete" `
  -H "Content-Type: application/json" -d '{\"authority\":\"SBX-...\",\"outcome\":\"success\"}'

# 4) وضعیت سفارش
curl "http://127.0.0.1:4000/api/payments/status/AG-XXXX"
```

---

## ۶) ایمیل و پیامک تراکنشی

هر پیام در جدول `NotificationMessage` ثبت می‌شود و worker هر ۱۵ ثانیه صف را پردازش می‌کند.

```env
# ایمیل — اگر MAIL_HOST خالی باشد، پیام‌ها به‌صورت فایل .eml ذخیره می‌شوند
MAIL_HOST=
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM="آگاهی <no-reply@aghaci.local>"
MAIL_FILE_DIR=uploads/mail

# پیامک — اگر کلید خالی باشد، متن با پیشوند [sms:log] در لاگ ثبت می‌شود
KAVENEGAR_API_KEY=
KAVENEGAR_SENDER=

NOTIFICATIONS_INTERVAL_MS=15000   # 0 = worker خاموش (ارسال دستی از پنل)
NOTIFICATIONS_MAX_ATTEMPTS=5
```

- فایل‌های ایمیل آزمایشی: `apps/api/uploads/mail/*.eml` (با هر کلاینت ایمیلی باز می‌شوند).
- پنل مدیریت → «پیام‌ها»: فهرست صف، تعداد تلاش، خطای آخرین تلاش، «ارسال دوباره»، «لغو»، «ارسال آزمایشی».
- خاموش‌کردن کانال: تنظیمات → «پیام‌های تراکنشی».

---

## ۷) لاگ و مانیتورینگ

```env
LOG_LEVEL=info        # debug | info | warn | error
LOG_FORMAT=pretty     # برای خواندن محلی؛ در سرور خالی بگذار (JSON خط‌به‌خط)
SLOW_REQUEST_MS=1500  # درخواست کندتر از این مقدار به‌عنوان warn ثبت می‌شود
```

نمونهٔ خط لاگ:

```json
{"time":"2026-11-20T14:16:08.847Z","level":"info","service":"api","context":"http","message":"http.request","requestId":"6cac2f06-…","method":"POST","path":"/api/payments/sandbox/complete","status":201,"durationMs":41}
```

- هر پاسخ هدر `x-request-id` دارد و همان شناسه در بدنهٔ خطا هم برمی‌گردد.
- روی سرور: `LOG_FORMAT` را خالی بگذار و با `jq` فیلتر کن:

```bash
node dist/main.js | jq -c 'select(.status >= 400)'
```

---

## ۸) ساخت، بررسی тип و تست

```powershell
pnpm typecheck                                   # همهٔ اپ‌ها
pnpm --filter @ecom/api build                    # nest build
pnpm --filter @ecom/web build                    # next build (sitemap/robots/OG هم چک می‌شوند)
pnpm --filter @ecom/admin build
pnpm --filter @ecom/api test                     # jest (در حال حاضر بدون تست)
```

---

## ۹) عیب‌یابی سریع

| نشانه | علت | راه‌حل |
| --- | --- | --- |
| `Could not resolve host: github.com` | DNS/شبکهٔ سیستم، نه گیت | `nslookup github.com`، عوض‌کردن DNS (`1.1.1.1`)، VPN، `ipconfig /flushdns` |
| `ECONNREFUSED 127.0.0.1:55432` | دیتابیس روشن نیست | `pnpm db:local` در ترمینال جدا |
| `22P05 ... WIN1252` | کلاستر با انکودینگ ویندوز ساخته شده | `pnpm db:reset` یا `pnpm db:local:fresh` |
| `P2022` / `column ... does not exist` | دیتابیس از schema عقب است | `pnpm db:generate && pnpm --filter @ecom/db build && pnpm db:setup` |
| `relation "User" does not exist` | جدول‌ها ساخته نشده‌اند | `pnpm db:setup && pnpm db:seed` |
| لاگین توکن خالی برمی‌گرداند | `.env` نیست یا secretها خالی‌اند | ساخت `.env` و **ری‌استارت API** |
| `EADDRINUSE :4000` | نسخهٔ قبلی API زنده است | بستن پروسهٔ پورت (پایین) |
| `Cannot find module './app.module'` | بیلد incremental کهنه | حذف `apps/api/dist` و `tsconfig.tsbuildinfo` سپس build |
| `403 Account temporarily locked` | قفل بعد از رمز اشتباه | `pnpm user:unlock` |
| پیام‌ها در صف می‌مانند | worker خاموش یا فاصله زیاد | `NOTIFICATIONS_INTERVAL_MS` را چک کن یا از پنل «پردازش صف» |
| `429 RATE_LIMITED` | محدودیت نرخ همان مسیر | هدرهای `retry-after` را ببین؛ جدول `RateLimitCounter` |

آزادکردن پورت (ویندوز):

```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

مک/لینوکس:

```bash
ss -ltnp | grep :4000
kill -9 <PID>
```

---

## ۱۰) مستندات اسپرینت‌ها

`docs/sprint-0.md` تا `docs/sprint-18.md` — هر فایل شرح اسپرینت، تصمیم‌ها و نتیجهٔ تست‌های همان مرحله است.
خلاصهٔ معماری و راه‌اندازی کلی: `README.md`.
