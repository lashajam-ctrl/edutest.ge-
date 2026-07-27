# EduTest.ge — Cloudflare-ზე გაშვება

ეს პაკეტი არის სრული აპლიკაცია: ვებსაიტი, API, ავტორიზაცია და D1 მონაცემთა ბაზა. ამიტომ Cloudflare-ის **Drag and drop** რეჟიმში ZIP ფაილის პირდაპირ ჩაგდება არ შეიძლება — ის მხოლოდ სტატიკური საიტებისთვისაა.

## რეკომენდებული გზა — GitHub-იდან იმპორტი

1. შექმენი **Private** საცავი GitHub-ზე და ამ ZIP-ის შიგთავსი ატვირთე საცავის ძირეულ საქაღალდეში.
2. Cloudflare-ში გახსენი **Workers & Pages → Create → Import a repository**.
3. აირჩიე შექმნილი GitHub საცავი.
4. Build command მიუთითე: `npm run build:cloudflare`
5. Deploy command მიუთითე: `npx wrangler deploy`
6. Root directory დატოვე ცარიელი, ხოლო Production branch — `main`.
7. დააჭირე **Deploy**. პირველი გაშვებისას Cloudflare ავტომატურად შექმნის `edutest-db` D1 ბაზას და მიაბამს `DB` სახელით.

## დომენის მიბმა

Deploy-ის დასრულების შემდეგ გახსენი Worker-ის **Settings → Domains & Routes → Add → Custom domain** და ჩაწერე `edutest.ge`. შემდეგ ცალკე დაამატე `www.edutest.ge` და გადაამისამართე მთავარ დომენზე.

## უსაფრთხო პარამეტრები

Google/Microsoft/Facebook შესვლა ჩაირთვება მხოლოდ OAuth მონაცემების მიღების შემდეგ. Worker-ის **Settings → Variables and Secrets** განყოფილებაში Secret ტიპით უნდა დაემატოს:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

პროვაიდერებში დასარეგისტრირებელი callback მისამართებია:

- `https://edutest.ge/api/auth/oauth/google/callback`
- `https://edutest.ge/api/auth/oauth/microsoft/callback`
- `https://edutest.ge/api/auth/oauth/facebook/callback`

AI ახსნა ამ პაკეტში გამორთულია, სანამ უსაფრთხოების პარამეტრები და API გასაღები მზად არ იქნება. გადახდის სისტემა ასევე გამორთული რჩება ტესტირების ეტაპზე.

`AZURE_SPEECH_KEY` და `AZURE_SPEECH_REGION` საჭიროა ქართული ხმისთვის იმ ბრაუზერებში, რომლებშიც `ka-GE` ხმა მოწყობილობაზე არ არის დაყენებული. გასაღები აუცილებლად **Secret** ტიპით დაამატეთ.

## მნიშვნელოვანი

ახალ D1 ბაზაში ძველი სატესტო ანგარიშები ავტომატურად არ გადადის. პირველი ადმინისტრატორის ანგარიშს უსაფრთხოდ შევქმნით Deploy-ის დასრულების შემდეგ; პაროლი ან საიდუმლო გასაღები ამ ZIP-ში არ ინახება.
