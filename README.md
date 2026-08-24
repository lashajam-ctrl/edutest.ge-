# EduTest.ge

საქართველოს სკოლებისთვის შექმნილი ონლაინ ტესტირების პლატფორმა I–XII კლასებისთვის.

## მიმდინარე არქიტექტურა

- ვებ-აპი და API: vinext / Cloudflare Worker (`edutestge`)
- ანგარიშები და ავტორიზაცია: Cloudflare Worker/D1-ის ერთიანი Secure HttpOnly სესია ელფოსტისა და სოციალური OAuth-ისთვის; ძველი Supabase ანგარიშები პირველი წარმატებული ელფოსტით შესვლისას უსაფრთხოდ გადმოდის
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

Supabase Auth გამოიყენება მხოლოდ ძველი ანგარიშების გარდამავალი აღდგენის ხიდად. ახალი ელფოსტის ანგარიშები, პაროლის აღდგენა და სოციალური ავტორიზაცია ერთიან Cloudflare/D1 სესიაზე მუშაობს; პაროლის წერილებს Resend SMTP აგზავნის. ადმინისტრატორის როლი ხელით ენიჭება და ადმინისტრატორის თვითრეგისტრაცია აკრძალულია.

## სოციალური ავტორიზაცია

Google და Microsoft მუშაობს Cloudflare Worker-ის server-side OAuth ნაკადით; Provider Secret-ები ინახება მხოლოდ Cloudflare Secrets-ში. Facebook ღილაკი ავტომატურად რჩება გამორთული, სანამ Meta-ს საჯარო დამტკიცების შემდეგ `FACEBOOK_PUBLIC_ENABLED=true` არ ჩაირთვება. სოციალური ღილაკი თავად ადგენს, შესვლაა საჭირო თუ ახალი ანგარიშის შექმნა. თუ იგივე ელფოსტაზე პაროლიანი ანგარიში უკვე არსებობს, მომხმარებელი პაროლს მხოლოდ ერთხელ ადასტურებს და შემდეგ სოციალური ანგარიში უსაფრთხოდ ებმება. შედეგად იქმნება Secure, HttpOnly, SameSite=Lax სესიის cookie; OAuth access token ბრაუზერის მუდმივ საცავში არ ინახება.

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
