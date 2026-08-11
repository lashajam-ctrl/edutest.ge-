# EduTest.ge

საქართველოს სკოლებისთვის შექმნილი ონლაინ ტესტირების პლატფორმა I–XII კლასებისთვის.

## მიმდინარე არქიტექტურა

- ვებ-აპი და API: vinext / Cloudflare Worker (`edutestge`)
- ანგარიშები და ავტორიზაცია: Supabase Auth, Frankfurt რეგიონი
- უსაფრთხო შეფასება: კითხვები მიიღება Supabase Edge Functions-იდან, სწორი პასუხები საჯარო ფაილებში არ ხვდება და შეფასება სრულდება სერვერზე
- კატალოგი: 12,600 კითხვა, 336 მზა ტესტი, 15 საგანი
- AI განმარტება: არასწორ პასუხზე, მხოლოდ ავტორიზებული მოსწავლისთვის; OpenAI-ის გასაღები ინახება მხოლოდ Cloudflare Secret-ში
- გადახდები: სატესტო ეტაპზე გამორთულია; ყველა ტესტი უფასოა

## გაშვება და შემოწმება

მოთხოვნა: Node.js `>=22.13.0`.

```bash
pnpm install
pnpm dev
pnpm test
node supabase/seed/validate-pack.mjs
```

`pnpm test` ამოწმებს ბრაუზერის სკრიპტებს, ავტორიზაციასა და როლებს, XSS-ისგან დაცვას, server-verified შეფასებას, კითხვების შერჩევას და production build-ს.

## Supabase

Production პროექტი: `rlvxujpwoooxprhzgysj` (Frankfurt).

მიგრაციები განთავსებულია `supabase/migrations/`-ში. კითხვების უსაფრთხო seed ფაილია `supabase/seed/edutest_secure_assessment_seed.json`, ხოლო სრული ვალიდატორი — `supabase/seed/validate-pack.mjs`.

```bash
supabase db push
node supabase/seed/seed-question-bank.mjs
```

Seed-ის გაშვებას სჭირდება მხოლოდ სერვერული `SUPABASE_SECRET_KEY` ან `SUPABASE_SERVICE_ROLE_KEY`; ასეთი მნიშვნელობა repository-ში არ ინახება.

ელფოსტით რეგისტრაცია და დადასტურება მუშაობს Supabase Auth + Resend SMTP-ით. ადმინისტრატორის როლი ხელით ენიჭება და პანელში შესასვლელად საჭიროა TOTP ორფაქტორიანი დადასტურება. ადმინისტრატორის თვითრეგისტრაცია აკრძალულია.

## სოციალური ავტორიზაცია

Google, Microsoft და Facebook ღილაკები ამჟამად გამორთულია და მონიშნულია როგორც „მალე“. მათი ჩართვა დასაშვებია მხოლოდ შესაბამის დეველოპერულ კონსოლებში აპების შექმნისა და Secret-ების Supabase-ში უსაფრთხოდ შეტანის შემდეგ.

Supabase callback მისამართი:

```text
https://rlvxujpwoooxprhzgysj.supabase.co/auth/v1/callback
```

Secret-ები ჩატში, კოდში ან Git-ში არ უნდა გამოქვეყნდეს.

## AI უკუკავშირი

Cloudflare-ის არასაიდუმლო პარამეტრები:

```env
AI_FEEDBACK_ENABLED=true
AI_UNDER18_SAFEGUARDS_ACKNOWLEDGED=true
OPENAI_MODEL=gpt-5.6-sol
```

`OPENAI_API_KEY` ინახება მხოლოდ Cloudflare Secret-ში. AI იღებს კითხვას, მოსწავლის პასუხს, სერვერის სწორ პასუხსა და კლასს — არა მოსწავლის სახელს ან ელფოსტას. პასუხი UI-ში ტექსტად რენდერდება და არა raw HTML-ად.

## კონტენტის ხარისხი

ავტომატური შემოწმება ადასტურებს უნიკალურ ID-ებს, ცარიელი/დუბლირებული ვარიანტების არქონას, სწორი პასუხის ერთადერთობას, განმარტებების არსებობას, სერვერული შეფასების სისწორეს და თითო ტესტისთვის საკმარის pool-ს.

ეს ტექნიკური ვალიდაცია არ ნიშნავს სამინისტროს ან საგნის ექსპერტის ოფიციალურ დამტკიცებას. კლასის, სემესტრისა და კონკრეტული სახელმძღვანელოს გამოცემასთან საბოლოო შესაბამისობა პერიოდულად უნდა დაადასტუროს შესაბამისმა საგნის ექსპერტმა.

## გამოქვეყნება

```bash
pnpm run deploy:cloudflare
```

`.openai/hosting.json`-ის გამო იგივე შემოწმებული commit დამატებით ქვეყნდება Sites-ის ვერსიად. Production დომენია [edutest.ge](https://edutest.ge/).
