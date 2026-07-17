# EduTest.ge

საქართველოს სკოლებისთვის შექმნილი ტესტირების პლატფორმა I–XII კლასებისთვის. პროექტი მუშაობს vinext/Cloudflare-ზე, იყენებს D1-ს მომხმარებლების, მცდელობების, დავალებებისა და კითხვის ისტორიის შესანახად.

## გაშვება

მოთხოვნა: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
```

სასარგებლო ბრძანებები:

- `npm run build` — სრულად აწყობს საიტსა და API მარშრუტებს;
- `npm test` — აწყობა და პროდუქტის ავტომატური შემოწმებები;
- `npm run audit:questions` — ამოწმებს კითხვების ბანკს და აახლებს `reports/question-bank-audit.json`-ს;
- `npm run db:generate` — ქმნის Drizzle-ის მიგრაციებს.

## ავტორიზაციის კონფიგურაცია

ელფოსტით რეგისტრაცია დამატებითი გარე კონფიგურაციის გარეშე მუშაობს. Google/Microsoft/Facebook შესვლისთვის გარემოში უნდა დაემატოს:

```env
APP_ORIGIN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

OAuth პროვაიდერში callback URL უნდა ემთხვეოდეს საიტის რეალურ დომენსა და `/api/auth/oauth/{provider}/callback` მისამართს.

- Google: `https://edutest.ge/api/auth/oauth/google/callback`
- Microsoft: `https://edutest.ge/api/auth/oauth/microsoft/callback`
- Facebook: `https://edutest.ge/api/auth/oauth/facebook/callback`

## AI უკუკავშირი

AI ნაგულისხმევად გამორთულია, რადგან პლატფორმა არასრულწლოვანებს ემსახურება. ჩართვამდე აუცილებელია ბავშვის უსაფრთხოების/კონფიდენციალურობის შემოწმება, ასაკისთვის გასაგები AI გაფრთხილება, კონტენტის ფილტრი, მონიტორინგი და ესკალაციის პროცესი.

```env
OPENAI_API_KEY=
OPENAI_MODEL=
AI_FEEDBACK_ENABLED=false
AI_UNDER18_SAFEGUARDS_ACKNOWLEDGED=false
```

ჩართვისას AI იღებს მხოლოდ კითხვას, მოსწავლის პასუხს, პლატფორმის სწორ პასუხსა და რედაქტირებულ განმარტებას — არა მოსწავლის სახელს ან ელფოსტას. გენერირებული remedial კითხვა გამოიყენება მხოლოდ სავარჯიშოდ და შემაჯამებელ შეფასებაში არ ხვდება.

## კონტენტის ხარისხი

სიღრმისეული ანგარიში და 9.5/10-მდე მისასვლელი გეგმა იხილეთ `reports/curriculum-and-benchmark-audit.md`-ში. კითხვების მანქანური აუდიტია `reports/question-bank-audit.json`.

I–VI კლასის ძველი `hist-*` ბანკები მოსწავლისთვის დროებით დაბლოკილია, რადგან სამინისტროს მიმდინარე საგნობრივ თანმიმდევრობას არ ემთხვევა. ისინი მასწავლებლის რედაქტორში რჩება გადასაკეთებლად.

## გადახდები

გადახდის სისტემა ამ სატესტო ეტაპზე განზრახ გამორთულია.
