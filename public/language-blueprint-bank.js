(function registerLanguageBlueprintBank(root) {
  'use strict';

  if (typeof Q_POOL === 'undefined') return;

  const CURRICULUM_SOURCE = 'https://www.mes.gov.ge/content.php?id=9422';
  const TEXTBOOK_CATALOG = 'https://www.mes.gov.ge/content.php?id=8480&lang=geo';
  const VERSION_COUNT = 4;
  const QUESTIONS_PER_SEMESTER_VERSION = 24;
  const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  // These are editable product blueprints, not Ministry-mandated hour shares.
  // Every grade is intentionally explicit so a school can later replace the
  // defaults with its own approved curriculum distribution in one place.
  const BLUEPRINTS = Object.freeze({
    ka: Object.freeze({
      7: {'language.grammar':10,'language.orthography':5,'language.punctuation':5,'language.syntax':5,'language.vocabulary':5,'language.editing':5,'language.reading':5,'literature.comprehension':20,'literature.genre':8,'literature.devices':10,'literature.character':8,'literature.theme':8,'literature.author_era':6},
      8: {'language.grammar':9,'language.orthography':5,'language.punctuation':5,'language.syntax':6,'language.vocabulary':5,'language.editing':5,'language.reading':5,'literature.comprehension':19,'literature.genre':8,'literature.devices':10,'literature.character':8,'literature.theme':8,'literature.author_era':7},
      9: {'language.grammar':8,'language.orthography':5,'language.punctuation':6,'language.syntax':7,'language.vocabulary':4,'language.editing':5,'language.reading':5,'literature.comprehension':18,'literature.genre':8,'literature.devices':10,'literature.character':8,'literature.theme':8,'literature.author_era':8},
      10:{'language.grammar':7,'language.orthography':5,'language.punctuation':6,'language.syntax':8,'language.vocabulary':4,'language.editing':5,'language.reading':5,'literature.comprehension':17,'literature.genre':8,'literature.devices':10,'literature.character':8,'literature.theme':8,'literature.author_era':9},
      11:{'language.grammar':6,'language.orthography':5,'language.punctuation':6,'language.syntax':9,'language.vocabulary':4,'language.editing':5,'language.reading':5,'literature.comprehension':16,'literature.genre':8,'literature.devices':10,'literature.character':8,'literature.theme':8,'literature.author_era':10},
      12:{'language.grammar':5,'language.orthography':5,'language.punctuation':6,'language.syntax':10,'language.vocabulary':4,'language.editing':5,'language.reading':5,'literature.comprehension':15,'literature.genre':8,'literature.devices':10,'literature.character':8,'literature.theme':8,'literature.author_era':11},
    }),
    en: Object.freeze({
      1:{grammar:10,vocabulary:45,reading:25,use_of_language:20},
      2:{grammar:15,vocabulary:40,reading:25,use_of_language:20},
      3:{grammar:20,vocabulary:35,reading:25,use_of_language:20},
      4:{grammar:25,vocabulary:30,reading:25,use_of_language:20},
      5:{grammar:30,vocabulary:25,reading:25,use_of_language:20},
      6:{grammar:33,vocabulary:22,reading:25,use_of_language:20},
      7:{grammar:35,vocabulary:20,reading:25,use_of_language:20},
      8:{grammar:37,vocabulary:18,reading:25,use_of_language:20},
      9:{grammar:39,vocabulary:16,reading:25,use_of_language:20},
      10:{grammar:40,vocabulary:15,reading:25,use_of_language:20},
      11:{grammar:40,vocabulary:14,reading:26,use_of_language:20},
      12:{grammar:40,vocabulary:12,reading:28,use_of_language:20},
    }),
    ru: Object.freeze({
      5:{grammar:20,vocabulary:35,reading:25,use_of_language:20},
      6:{grammar:25,vocabulary:30,reading:25,use_of_language:20},
      7:{grammar:30,vocabulary:25,reading:25,use_of_language:20},
      8:{grammar:33,vocabulary:22,reading:25,use_of_language:20},
      9:{grammar:35,vocabulary:20,reading:25,use_of_language:20},
      10:{grammar:36,vocabulary:18,reading:26,use_of_language:20},
      11:{grammar:37,vocabulary:16,reading:27,use_of_language:20},
      12:{grammar:37,vocabulary:15,reading:28,use_of_language:20},
    }),
  });

  const LANGUAGE_CONFIG = Object.freeze({
    ka: {subject:'ქართული ენა და ლიტერატურა', prefix:'kab', grades:[7,8,9,10,11,12], listeningSupported:false},
    en: {subject:'ინგლისური', prefix:'enb', grades:[1,2,3,4,5,6,7,8,9,10,11,12], listeningSupported:false},
    ru: {subject:'რუსული', prefix:'rub', grades:[5,6,7,8,9,10,11,12], listeningSupported:false},
  });

  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ka-GE')
    .replace(/[“”„"'`’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const pick = (items, index) => items[((index % items.length) + items.length) % items.length];
  const uniqueOptions = (correct, distractors) => {
    const values = [correct, ...distractors].map(String);
    const rows = [];
    values.forEach(value => {
      if (value && !rows.some(existing => String(existing).normalize('NFKC').toLocaleLowerCase('ka-GE').trim() === String(value).normalize('NFKC').toLocaleLowerCase('ka-GE').trim())) rows.push(value);
    });
    return rows.slice(0, 4);
  };
  const mcq = (text, correct, distractors, explain, topicCode, introducedGrade = 1, pts = 2) => ({
    text, type:'multiple_choice', opts:uniqueOptions(correct, distractors), correct:0,
    pts, explain, topicCode, topicIntroducedGrade:introducedGrade,
  });

  function allocateWeights(weights, total, rotation = 0) {
    const entries = Object.entries(weights);
    const weightTotal = entries.reduce((sum, [, weight]) => sum + Number(weight || 0), 0);
    if (!entries.length || weightTotal <= 0) return {};
    const rows = entries.map(([key, weight], index) => {
      const exact = total * Number(weight) / weightTotal;
      return {key, index, count:Math.floor(exact), remainder:exact - Math.floor(exact)};
    });
    let left = total - rows.reduce((sum, row) => sum + row.count, 0);
    rows.sort((a, b) => b.remainder - a.remainder
      || (((a.index - rotation) % entries.length + entries.length) % entries.length) - (((b.index - rotation) % entries.length + entries.length) % entries.length));
    for (let index = 0; index < left; index += 1) rows[index % rows.length].count += 1;
    return Object.fromEntries(rows.sort((a, b) => a.index - b.index).map(row => [row.key, row.count]));
  }

  function allocateBlueprint(weights, total, rotation = 0) {
    const keys = Object.keys(weights || {});
    const grouped = keys.some(key => key.startsWith('language.')) && keys.some(key => key.startsWith('literature.'));
    if (!grouped) return allocateWeights(weights, total, rotation);
    const languageWeights = Object.fromEntries(Object.entries(weights).filter(([key]) => key.startsWith('language.')));
    const literatureWeights = Object.fromEntries(Object.entries(weights).filter(([key]) => key.startsWith('literature.')));
    const groupCounts = allocateWeights({
      language:Object.values(languageWeights).reduce((sum, value) => sum + Number(value), 0),
      literature:Object.values(literatureWeights).reduce((sum, value) => sum + Number(value), 0),
    }, total, rotation);
    return {
      ...allocateWeights(languageWeights, groupCounts.language, rotation),
      ...allocateWeights(literatureWeights, groupCounts.literature, rotation + 1),
    };
  }
  function bucketSequence(weights, total, rotation) {
    const counts = allocateBlueprint(weights, total, rotation);
    const rows = Object.entries(counts).flatMap(([bucket, count], bucketIndex) =>
      Array.from({length:count}, (_, ordinal) => ({bucket, score:(bucketIndex * 17 + ordinal * 11 + rotation * 7) % 101})));
    return rows.sort((a, b) => a.score - b.score || a.bucket.localeCompare(b.bucket)).map(row => row.bucket);
  }

  const KA_ORTHOGRAPHY = [
    ['უეცრად',['უცებრად','უეცრადად','უეცრათ']],
    ['საერთოდ',['საერთოთ','საეთოდ','საერთოთაც']],
    ['დღესდღეობით',['დღეს დღეობით','დღეს-დღეობით','დღესდღეობითაცა']],
    ['ერთმანეთი',['ერთმანერთი','ერთმანნეთი','ერთმანეთიი']],
    ['შესაძლებლობა',['შესაძლებლობაა','შესაძლებობა','შესაძლებლობბა']],
    ['განსაკუთრებული',['განსაკუტრებული','განსაკუთრებბული','განსაკუთრებულიი']],
    ['რასაკვირველია',['რა საკვირველია','რასაკირველია','რასაკვირველეა']],
    ['ნამდვილად',['ნამდივლად','ნამდვილათ','ნამდვილლად']],
  ];
  const KA_AUTHORS = [
    ['შოთა რუსთაველი','XII საუკუნე / ქართული შუა საუკუნეები',['XVIII საუკუნე','XX საუკუნე','ანტიკური საბერძნეთი']],
    ['სულხან-საბა ორბელიანი','XVII–XVIII საუკუნეები',['XII საუკუნე','XX საუკუნის მეორე ნახევარი','ანტიკური ხანა']],
    ['დავით გურამიშვილი','XVIII საუკუნე',['X საუკუნე','XXI საუკუნე','ანტიკური ხანა']],
    ['ნიკოლოზ ბარათაშვილი','XIX საუკუნის რომანტიზმი',['შუა საუკუნეების ეპოსი','XX საუკუნის ფუტურიზმი','ანტიკური ტრაგედია']],
    ['ილია ჭავჭავაძე','XIX საუკუნე / თერგდალეულთა ეპოქა',['XII საუკუნე','ანტიკური ხანა','XXI საუკუნე']],
    ['აკაკი წერეთელი','XIX საუკუნე',['ანტიკური ხანა','XII საუკუნე','XXI საუკუნე']],
    ['ვაჟა-ფშაველა','XIX–XX საუკუნეების მიჯნა',['XII საუკუნე','ანტიკური ხანა','XV საუკუნე']],
    ['გალაკტიონ ტაბიძე','XX საუკუნე',['XII საუკუნე','ანტიკური ხანა','XVII საუკუნე']],
  ];
  const KA_MICROTEXTS = [
    ['დილით ნინომ ეზოში დაშავებული ჩიტი იპოვა. მან ჩიტს წყალი დაალევინა და უსაფრთხო ადგილას გადაიყვანა.','ნინო მზრუნველად მოიქცა',['ნინომ ჩიტი შეაშინა','ეზო დაკეტილი იყო','ჩიტმა ქალაქი დატოვა']],
    ['მთელი სოფელი წყაროს დასუფთავებლად შეიკრიბა. სამუშაოს დასრულების შემდეგ წყალი კვლავ სუფთად მიედინებოდა.','თანამშრომლობა საერთო გარემოს აუმჯობესებს',['შრომა ყოველთვის უშედეგოა','წყარო აღარ არსებობდა','სოფელი დაიცალა']],
    ['ლუკა შეჯიბრში დამარცხდა, თუმცა შეცდომები ჩაინიშნა და ვარჯიში განაგრძო. ერთი თვის შემდეგ შედეგი გააუმჯობესა.','დაჟინებული შრომა პროგრესს იწვევს',['დამარცხების შემდეგ ვარჯიში არ ღირს','შეცდომების განხილვა ზედმეტია','წარმატება მხოლოდ შემთხვევითია']],
    ['ბიბლიოთეკაში ანა ძველ რუკას გადააწყდა. მან ნიშნები შეისწავლა და ქალაქის ისტორიის შესახებ ახალი ცნობები აღმოაჩინა.','კვლევა ცოდნას აფართოებს',['რუკა უსარგებლო იყო','ისტორია ვერ შეიცვლება','ბიბლიოთეკაში წიგნები არ იყო']],
    ['წვიმა მოულოდნელად დაიწყო. მგზავრებმა პატარა ქოლგის ქვეშ ადგილი ერთმანეთს დაუთმეს.','ურთიერთდახმარება სირთულეს ამსუბუქებს',['ყველა მარტო უნდა დარჩეს','წვიმა ყოველთვის სახიფათოა','ქოლგა დაიკარგა']],
    ['მებაღემ პატარა ნერგი ყოველდღე მორწყა. გაზაფხულზე ნერგმა პირველი ყვავილი გამოიღო.','ზრუნვას შედეგი მოაქვს',['ყვავილი ზამთარში გაიყინა','ნერგს წყალი არ სჭირდებოდა','მებაღემ ბაღი მიატოვა']],
  ];

  function georgianQuestion(bucket, grade, seed) {
    const topic = bucket.split('.')[1];
    if (bucket === 'language.grammar') {
      const rows = grade <= 8
        ? [['რომელ წინადადებაშია ზმნა წარსულ დროში?','გუშინ ბავშვებმა ივარჯიშეს.',['ბავშვები ახლა ვარჯიშობენ.','ბავშვები ხვალ ივარჯიშებენ.','ბავშვები ხშირად ვარჯიშობენ.'],'ზმნის დრო'],
           ['რომელი სიტყვაა ნაცვალსახელი?','ის',['სახლი','ლამაზი','სწრაფად'],'სიტყვის ნაწილები']]
        : [['რომელ წინადადებაშია გამოყენებული კავშირებითი კილო?','ნეტავ დროულად მოვიდეს.',['ის დროულად მოვიდა.','ის დროულად მოდის.','ის დროულად მოვა.'],'ზმნის კილო'],
           ['რომელ ფორმაშია დაცული რიცხვში შეთანხმება?','მოსწავლეები ყურადღებით უსმენდნენ.',['მოსწავლეები ყურადღებით უსმენდა.','მოსწავლე ყურადღებით უსმენდნენ.','მოსწავლეები ყურადღებით უსმენია.'],'შეთანხმება']];
      const row = pick(rows, seed);
      return mcq(row[0], row[1], row[2], `სწორი პასუხი ამოიცნობა ნიშნით: ${row[3]}.`, `ka.${topic}.${normalize(row[3])}`, grade <= 8 ? 7 : 9);
    }
    if (bucket === 'language.orthography') {
      const [correct, wrong] = pick(KA_ORTHOGRAPHY, seed);
      return mcq('რომელი სიტყვაა მართლწერის ნორმის შესაბამისად დაწერილი?', correct, wrong,
        `ნორმატიული ფორმაა „${correct}“.`, `ka.${topic}.norm`, 7);
    }
    if (bucket === 'language.punctuation') {
      const rows = grade <= 8
        ? [['რომელ წინადადებაშია მიმართვა სწორად გამოყოფილი?','მარიამ, წიგნი მომაწოდე.',['მარიამ წიგნი, მომაწოდე.','მარიამ წიგნი მომაწოდე,','მარიამ; წიგნი მომაწოდე.'],'მიმართვა მძიმით გამოიყოფა.']]
        : [['რომელ წინადადებაშია ჩართული სიტყვა სწორად გამოყოფილი?','ეს გადაწყვეტილება, ჩემი აზრით, სამართლიანია.',['ეს გადაწყვეტილება ჩემი აზრით სამართლიანია.','ეს გადაწყვეტილება; ჩემი აზრით სამართლიანია.','ეს გადაწყვეტილება ჩემი აზრით, სამართლიანია.'],'ჩართული კონსტრუქცია ორივე მხრიდან მძიმით გამოიყოფა.']];
      const row = pick(rows, seed);
      return mcq(row[0], row[1], row[2], row[3], `ka.${topic}.comma`, grade <= 8 ? 7 : 9);
    }
    if (bucket === 'language.syntax') {
      const rows = grade <= 8
        ? [['წინადადებაში „მოსწავლემ წერილი დაწერა“ რომელი სიტყვაა ქვემდებარე?','მოსწავლემ',['წერილი','დაწერა','რომელი'],'ქვემდებარე მოქმედ პირს ასახელებს.','subject',7]]
        : grade <= 10
          ? [['რომელი წინადადებაა რთული თანწყობილი?','მზე ჩავიდა და ქუჩები დაცარიელდა.',['როცა მზე ჩავიდა, ქუჩები დაცარიელდა.','მზის ჩასვლისას ქუჩები დაცარიელდა.','დაცარიელებული ქუჩები ჩუმი იყო.'],'ორი თანასწორი ნაწილი კავშირით „და“ არის შეერთებული.','compound',9]]
          : [['რომელ წინადადებაშია მიზეზის გარემოებითი დამოკიდებული წინადადება?','რადგან გზა ჩაიკეტა, შეხვედრა გადაიდო.',['როცა გზა გაიხსნა, შეხვედრა დაიწყო.','შეხვედრა, რომელიც დაგეგმილი იყო, გადაიდო.','თუ გზა გაიხსნება, შეხვედრა ჩატარდება.'],'კავშირი „რადგან“ მიზეზობრივ მიმართებას გამოხატავს.','causal_clause',11]];
      const row = pick(rows, seed);
      return mcq(row[0], row[1], row[2], row[3], `ka.${topic}.${row[4]}`, row[5]);
    }
    if (bucket === 'language.vocabulary') {
      const rows = [
        ['რომელი სიტყვაა „გულმოდგინეს“ სინონიმი?','ბეჯითი',['ზარმაცი','ხმაურიანი','გაბრაზებული'],'სინონიმი მსგავსი მნიშვნელობის სიტყვაა.','synonym'],
        ['რომელი სიტყვაა „უხვის“ ანტონიმი?','მწირი',['ბარაქიანი','მრავალი','სავსე'],'ანტონიმი საპირისპირო მნიშვნელობას გამოხატავს.','antonym'],
        ['რომელი სიტყვა შეეფერება ოფიციალურ ტექსტს?','გთხოვთ, წარმოადგინოთ განცხადება.',['აბა, ქენი ეს საქმე.','ჰე, მომიტანე ქაღალდი.','მაგარი ამბავია.'],'ოფიციალურ სტილს ნეიტრალური და ზუსტი ლექსიკა შეეფერება.','register'],
      ];
      const eligible = rows.filter(row => (row[4] === 'register' ? 9 : 7) <= grade);
      const row = pick(eligible, seed);
      return mcq(row[0], row[1], row[2], row[3], `ka.${topic}.${row[4]}`, row[4] === 'register' ? 9 : 7);
    }
    if (bucket === 'language.editing') {
      const rows = grade <= 8
        ? [['რომელი წინადადებაა გამართული?','ბავშვები ეზოში თამაშობენ.',['ბავშვები ეზოში თამაშობს.','ბავშვი ეზოში თამაშობენ.','ბავშვები ეზოში თამაშობდნენ ახლა.'],'ქვემდებარე და შემასმენელი რიცხვში თანხმდება.','agreement',7]]
        : [['რომელი რედაქციაა ყველაზე მკაფიო და ზედმეტი გამეორების გარეშე?','ნინო მოხსენებას ყურადღებით მოამზადებდა, ამიტომ აზრი ნათლად ჩამოაყალიბა.',['ნინო მოხსენებას მოამზადებდა მომზადებით და აზრს ნათლად ამბობდა.','ნინო მოხსენებას, რომელიც მოხსენება იყო, ამზადებდა.','ნინო ყურადღებით, ამიტომ აზრი, მოხსენება მოამზადა.'],'რედაქტირებული წინადადება ზუსტია, ლოგიკურია და გამეორებას არ შეიცავს.','cohesion',9]];
      const row = pick(rows, seed);
      return mcq(row[0], row[1], row[2], row[3], `ka.${topic}.${row[4]}`, row[5]);
    }
    if (bucket === 'language.reading') {
      const [passage, answer, wrong] = pick(KA_MICROTEXTS, seed);
      return mcq(`წაიკითხე EduTest-ის მოკლე ტექსტი: „${passage}“ რომელი დასკვნა გამომდინარეობს ტექსტიდან?`, answer, wrong,
        `დასკვნა ეყრდნობა გმირის ქმედებასა და მის შედეგს: ${answer}.`, `ka.${topic}.inference`, 7);
    }
    if (bucket === 'literature.author_era') {
      const [author, era, wrong] = pick(KA_AUTHORS, seed);
      return mcq(`რომელ ეპოქას უკავშირდება ${author}?`, era, wrong,
        `${author} ქართული ლიტერატურის ისტორიაში უკავშირდება პერიოდს: ${era}.`, `ka.${topic}.context`, 7);
    }
    if (bucket === 'literature.genre') {
      const rows = [
        ['რომელი ჟანრი გადმოსცემს მოვლენებს მოქმედი პირებისა და სიუჟეტის საშუალებით?','მოთხრობა',['ლექსიკონი','ინსტრუქცია','ცხრილი'],'მოთხრობას ჰყავს მოქმედი პირები და აქვს სიუჟეტური განვითარება.','narrative',7],
        ['რომელ ჟანრში მოქმედება ძირითადად დიალოგებითა და სცენური მითითებებით ვითარდება?','დრამა',['ესე','ლექსიკონი','ანგარიში'],'დრამატული ტექსტი სცენისთვის არის აგებული.','drama',8],
        ['რომელი ნიშანია ლირიკული ტექსტისთვის ყველაზე დამახასიათებელი?','განცდისა და შინაგანი მდგომარეობის გამოხატვა',['მხოლოდ ფაქტების ჩამოთვლა','სცენური მითითებების სიჭარბე','ტექნიკური ინსტრუქცია'],'ლირიკა ადამიანის განცდასა და ემოციურ ხედვას გამოხატავს.','lyric',7],
      ];
      const row = pick(rows.filter(row => row[5] <= grade), seed);
      return mcq(row[0], row[1], row[2], row[3], `ka.${topic}.${row[4]}`, row[5]);
    }
    if (bucket === 'literature.devices') {
      const rows = grade <= 8
        ? [['ფრაზაში „ქარი ხეებს ეჩურჩულებოდა“ რომელი ხერხია?','გაპიროვნება',['შედარება','ჰიპერბოლა','ირონია'],'არაცოცხალ მოვლენას ადამიანის მოქმედება მიეწერება.','personification',7],
           ['ფრაზაში „თოვლივით თეთრი“ რომელი ხერხია?','შედარება',['მეტაფორა','ირონია','ალიტერაცია'],'სიტყვა „-ვით“ შედარებაზე მიგვანიშნებს.','simile',7]]
        : [['ფრაზაში „დრო მდინარეა“ რომელი ხერხია?','მეტაფორა',['პირდაპირი მნიშვნელობა','ირონია','ჩამონათვალი'],'ერთი მოვლენა მეორის სახელით არის წარმოჩენილი შედარების კავშირის გარეშე.','metaphor',9],
           ['როცა ტექსტის ნათქვამი კონტექსტში საპირისპირო მნიშვნელობას იძენს, ეს არის:','ირონია',['ეპითეტი','პორტრეტი','პეიზაჟი'],'ირონია პირდაპირ ნათქვამსა და ნაგულისხმევს შორის განსხვავებას ქმნის.','irony',10]];
      const row = pick(rows.filter(row => row[5] <= grade), seed);
      return mcq(row[0], row[1], row[2], row[3], `ka.${topic}.${row[4]}`, row[5]);
    }
    const [passage, central, wrong] = pick(KA_MICROTEXTS, seed);
    if (bucket === 'literature.character') {
      return mcq(`EduTest-ის ორიგინალურ მიკროტექსტში: „${passage}“ რომელი თვისება ჩანს გმირის ქმედებაში?`, central, wrong,
        'პერსონაჟის თვისება დასაბუთებულია მისი მოქმედებით და არა მხოლოდ აღწერით.', `ka.${topic}.evidence`, 7);
    }
    if (bucket === 'literature.theme') {
      return mcq(`EduTest-ის ორიგინალურ მიკროტექსტში: „${passage}“ რომელი თემაა წამყვანი?`, central, wrong,
        `მოვლენების ერთობლიობა უკავშირდება თემას: ${central}.`, `ka.${topic}.idea`, 7);
    }
    return mcq(`EduTest-ის ორიგინალური მიკროტექსტი: „${passage}“ რა არის ტექსტის მთავარი სათქმელი?`, central, wrong,
      `მთავარი სათქმელი აერთიანებს მოქმედებასა და შედეგს: ${central}.`, `ka.${topic}.main_idea`, 7);
  }

  const EN_GRAMMAR = [
    [1,'be_am','Complete: I ___ a pupil.','am',['is','are','be'],'“I” takes “am” in the present form of “be”.'],
    [1,'be_is','Complete: This ___ my book.','is',['am','are','be'],'A singular “this” takes “is”.'],
    [1,'be_are','Complete: You ___ my friend.','are',['am','is','be'],'“You” takes “are” in the present form of “be”.'],
    [1,'have','Complete: I ___ a red pencil.','have',['has','am','is'],'“I” takes “have”.'],
    [2,'article','Choose the correct phrase.','an apple',['a apple','the an apple','apple an'],'Use “an” before a vowel sound.'],
    [2,'plural','Choose the plural form of “book”.','books',['bookes','bookses','book'],'Most nouns add -s in the plural.'],
    [2,'has','Complete: Tom ___ a blue bag.','has',['have','is have','having'],'Third-person singular takes “has”.'],
    [2,'demonstrative','Complete: ___ are my shoes.','These',['This','That','It'],'Use “these” for more than one nearby object.'],
    [3,'present_simple','Complete: Maya ___ to school every day.','walks',['walk','walking','walked'],'In the present simple, third-person singular usually takes -s.'],
    [3,'present_continuous','Complete: They ___ football now.','are playing',['play','played','is playing'],'“Now” signals present continuous: are + verb-ing.'],
    [3,'do_question','Complete: ___ you like apples?','Do',['Does','Are','Is'],'A present-simple question with “you” starts with “Do”.'],
    [3,'present_negative','Complete: He ___ like cold milk.','does not',['do not','is not like','not does'],'Third-person singular negative uses “does not” + base verb.'],
    [4,'can','Complete: A bird ___ fly.','can',['cans','is can','can to'],'A modal verb is followed by the base form.'],
    [4,'comparison','Complete: A train is ___ than a bicycle.','faster',['fastest','more fast','fast'],'A short adjective usually takes -er in a comparison.'],
    [5,'past_simple','Complete: We ___ the museum yesterday.','visited',['visit','are visiting','have visit'],'“Yesterday” calls for the past simple.'],
    [5,'countability','Choose the correct phrase.','much water',['many water','a water','waters many'],'“Water” is uncountable, so “much” is appropriate.'],
    [6,'present_perfect','Complete: She ___ her homework already.','has finished',['finished now','have finish','is finishing yesterday'],'Present perfect uses has/have + past participle.'],
    [6,'future','Complete: I think it ___ rain tomorrow.','will',['did','has','is yesterday'],'A prediction about tomorrow can use “will”.'],
    [7,'relative_clause','Choose the correct word: The girl ___ won is my friend.','who',['which','where','when'],'“Who” refers to a person.'],
    [7,'first_conditional','Complete: If it rains, we ___ at home.','will stay',['stayed','would stayed','stay yesterday'],'The first conditional uses present + will for a real future possibility.'],
    [8,'passive_basic','Choose the passive sentence.','The bridge was built in 2010.',['They built the bridge in 2010.','The bridge built workers.','Workers are bridge.'],'Passive voice uses be + past participle.'],
    [8,'gerund_infinitive','Complete: She enjoys ___ novels.','reading',['to readed','read to','reads yesterday'],'“Enjoy” is followed by a gerund.'],
    [9,'second_conditional','Complete: If I had more time, I ___ another language.','would learn',['will learn','learned yesterday','would learned'],'The second conditional uses past simple + would + base verb.'],
    [9,'reported_speech','Direct: “I am tired.” Reported: He said that he ___.','was tired',['is tired tomorrow','tired is','has tiring'],'Backshift commonly changes “am” to “was”.'],
    [10,'third_conditional','Complete: If they had left earlier, they ___ the train.','would have caught',['will catch','would caught','had catch'],'The third conditional uses had + participle and would have + participle.'],
    [10,'participle_clause','Choose the best reduction: Because she was surprised, she paused.','Surprised, she paused.',['Surprising she, paused.','She surprise, pausing.','Paused because surprise.'],'A participle clause can condense a shared-subject reason clause.'],
    [11,'inversion','Choose the formal inversion.','Rarely have we seen such care.',['Rarely we have seen such care.','We rarely has seen such care.','Have rarely we such care seen.'],'A negative-fronted adverb triggers auxiliary–subject inversion.'],
    [11,'mixed_conditional','Complete: If I had taken the course, I ___ more confident now.','would be',['will be','would have been yesterday only','am being then'],'The past condition has a present result: had taken + would be.'],
    [12,'hedging','Choose the appropriately hedged academic claim.','The evidence suggests that the policy may help.',['The policy definitely solves everything.','Maybe stuff gets better.','The policy is obviously perfect.'],'Academic style qualifies claims according to the strength of evidence.'],
    [12,'advanced_cohesion','Choose the connector showing concession.','Nevertheless',['Therefore','For example','Similarly'],'“Nevertheless” introduces a contrast despite the previous point.'],
  ];
  const EN_WORDS = {
    1:[['happy','ბედნიერი'],['book','წიგნი'],['red','წითელი'],['family','ოჯახი'],['school','სკოლა'],['friend','მეგობარი'],['cat','კატა'],['sun','მზე']],
    2:[['pencil','ფანქარი'],['teacher','მასწავლებელი'],['green','მწვანე'],['window','ფანჯარა'],['water','წყალი'],['small','პატარა'],['play','თამაში'],['day','დღე']],
    3:[['quiet','წყნარი'],['journey','მოგზაურობა'],['helpful','დამხმარე'],['weather','ამინდი'],['garden','ბაღი'],['morning','დილა'],['clean','სუფთა'],['carry','ტარება']],
    5:[['careful','ფრთხილი'],['discover','აღმოჩენა'],['environment','გარემო'],['healthy','ჯანსაღი']],
    7:[['reliable','სანდო'],['challenge','გამოწვევა'],['improve','გაუმჯობესება'],['evidence','მტკიცებულება']],
    9:[['sustainable','მდგრადი'],['significant','მნიშვნელოვანი'],['interpret','განმარტება'],['consequence','შედეგი']],
    11:[['ambiguous','ორაზროვანი'],['coherent','თანმიმდევრული'],['plausible','დამაჯერებლად შესაძლებელი'],['counterargument','საპირისპირო არგუმენტი']],
  };
  const EN_READING = [
    [1,'Mia has a red bag. She takes it to school.','What colour is Mia’s bag?','red',['blue','green','black']],
    [1,'Ben has one cat. The cat is small.','What animal does Ben have?','a cat',['a bird','a dog','a fish']],
    [1,'The sun is yellow. It is in the sky.','What colour is the sun?','yellow',['black','blue','pink']],
    [1,'Ana opens her book. She reads at school.','What does Ana open?','her book',['a window','a bag','a door']],
    [2,'Luka has two pencils. One is green and one is blue.','How many pencils does Luka have?','two',['one','three','four']],
    [2,'Nina drinks water after she plays.','What does Nina drink?','water',['milk','tea','juice']],
    [2,'The classroom has three windows. They are open today.','What is open?','the windows',['the books','the bags','the pencils']],
    [2,'Gio puts his bag under the chair.','Where is Gio’s bag?','under the chair',['on the desk','near the door','in the garden']],
    [3,'Leo waters the class plant every Monday. The leaves stay green.','Why do the leaves stay green?','Leo waters the plant.',['The class closes.','The plant is plastic.','Monday is a colour.']],
    [3,'Maya walks to school with her sister. They arrive at eight.','Who walks with Maya?','her sister',['her teacher','her friend Leo','her brother']],
    [3,'Tom is wearing a coat because the morning is cold.','Why is Tom wearing a coat?','The morning is cold.',['It is very hot.','He is swimming.','The coat is a book.']],
    [3,'The children clean the table before lunch.','What do the children clean?','the table',['the garden','the bus','the window']],
    [5,'Nora missed the bus, so she walked to school and arrived before the bell.','What did Nora do after missing the bus?','She walked to school.',['She went home.','She called the bell.','She missed school.']],
    [7,'The science club tested two kinds of soil. Seeds grew faster in the soil that held more water.','What conclusion is supported?','Water retention affected growth.',['All seeds are identical.','Soil never matters.','The club used no water.']],
    [9,'The town added a protected cycle lane. Six months later, more students cycled and traffic near the school decreased.','Which claim is best supported?','The lane was associated with more cycling and less nearby traffic.',['The lane ended all traffic.','Every student bought a bicycle.','Weather no longer affected travel.']],
    [11,'A report found a correlation between library visits and grades, but it did not control for study time.','Why should the finding be interpreted cautiously?','A possible confounding factor was not controlled.',['Correlation always proves causation.','Libraries have no books.','Grades cannot be measured.']],
  ];

  function englishQuestion(bucket, grade, seed) {
    if (bucket === 'grammar') {
      const eligible = EN_GRAMMAR.filter(row => row[0] <= grade);
      const advanced = eligible.slice(Math.max(0, eligible.length - 7));
      const [min, topic, text, answer, wrong, explain] = pick(advanced, seed);
      return mcq(text, answer, wrong, explain, `en.grammar.${topic}`, min);
    }
    if (bucket === 'vocabulary') {
      const keys = Object.keys(EN_WORDS).map(Number).filter(level => level <= grade);
      const level = Math.max(...keys);
      const [word, meaning] = pick(EN_WORDS[level], seed);
      return mcq(`What is the best Georgian meaning of “${word}”?`, meaning,
        ['საპირისპირო მნიშვნელობა','დაუკავშირებელი მოქმედება','გრამატიკული ნიშანი'],
        `In this grade vocabulary set, “${word}” means “${meaning}”.`, `en.vocabulary.g${level}`, level);
    }
    if (bucket === 'reading') {
      const eligible = EN_READING.filter(row => row[0] <= grade);
      const [min, passage, prompt, answer, wrong] = pick(eligible.slice(Math.max(0, eligible.length - 3)), seed);
      return mcq(`Read this original EduTest text: “${passage}” ${prompt}`, answer, wrong,
        'The answer is stated or supported by the short original text.', `en.reading.g${min}`, min);
    }
    const rows = grade <= 3
      ? [[1,'Choose the polite greeting.','Hello!',['Close!','Table!','Never!'],'A greeting is used when meeting someone.','greeting'],
         [1,'Choose the polite goodbye.','Goodbye!',['Book!','Open!','Yellow!'],'“Goodbye” is used when leaving.','goodbye'],
         [1,'Choose the answer to “What is your name?”','My name is Nino.',['I am seven books.','It is red name.','Good morning pencil.'],'The answer gives the speaker’s name.','introduction'],
         [1,'Choose the answer to “How old are you?”','I am seven.',['I am a pencil.','Seven is blue.','My old book.'],'The answer gives the child’s age with “I am”.','age'],
         [2,'Choose the natural classroom request.','Can I have a pencil, please?',['Pencil is run.','I pencil yesterday.','Please blue quickly.'],'“Can I …, please?” is a polite request.','request'],
         [2,'Choose the answer to “How are you?”','I am fine, thank you.',['I am a window.','It is Monday pencil.','Fine is running.'],'This is a natural polite response.','wellbeing'],
         [2,'Choose the classroom instruction.','Open your book, please.',['Your book is blue quickly.','Please book opens I.','Yesterday open red.'],'The imperative “Open …” gives a clear instruction.','instruction'],
         [3,'Choose the natural answer to “Where is the ball?”','It is under the chair.',['It is happy Monday.','The chair is read.','Under is a balling.'],'A location question needs a place phrase.','location'],
         [3,'Choose the natural invitation.','Let’s play after school.',['School plays a let.','After is played blue.','Let play yesterday school.'],'“Let’s” is used to make a simple suggestion.','invitation']]
      : grade <= 6
        ? [[4,'Choose the natural response to “How often do you read?”','I read every day.',['At the library table.','Yesterday tomorrow.','Very book.'],'A frequency question needs a frequency expression.','frequency'],
           [5,'Choose the best connector: I was tired, ___ I finished the task.','but',['because of','or else because','at'],'“But” contrasts tiredness with completing the task.','connector']]
        : grade <= 9
          ? [[7,'Choose the most natural collocation.','make a decision',['do a decision','create decisioning','take deciding'],'English normally uses “make a decision”.','collocation'],
             [8,'Choose the sentence appropriate for an email to a teacher.','Could you please clarify the deadline?',['Tell me the deadline now.','Hey, what’s up with the date?','Deadline?!'],'The sentence is polite and appropriately formal.','register']]
          : [[10,'Choose the clearest revision.','Although the sample was small, the result is useful.',['The sample, small, result useful although.','Although small because result is useful sample.','The result useful and sample although.'],'The revision expresses concession clearly and concisely.','editing'],
             [11,'Choose the best academic connector: The sample was small; ___, the finding needs replication.','therefore',['for example','meanwhile','similarly'],'“Therefore” marks a consequence.','cohesion']];
    const [min, text, answer, wrong, explain, topic] = pick(rows.filter(row => row[0] <= grade), seed);
    return mcq(text, answer, wrong, explain, `en.use.${topic}`, min);
  }

  const RU_GRAMMAR = [
    [5,'gender','Какого рода слово «книга»?','женского',['мужского','среднего','общего'],'Существительное «книга» оканчивается на -а и относится к женскому роду.'],
    [5,'present','Выберите верную форму: Я ___ книгу.','читаю',['читает','читаешь','читать'],'С местоимением «я» употребляется форма «читаю».'],
    [5,'plural','Выберите множественное число слова «стол».','столы',['стола́ми','столом','столе'],'Именительный падеж множественного числа: столы.'],
    [6,'adjective_agreement','Выберите верное сочетание.','интересная книга',['интересный книга','интересное книга','интересные книга'],'Прилагательное согласуется с существительным женского рода.'],
    [6,'past','Вчера мы ___ в музее.','были',['есть','будем','бывает'],'«Вчера» требует формы прошедшего времени: были.'],
    [6,'accusative','Я вижу ___.','новую школу',['новая школа','новой школе','новою школой'],'После «вижу» нужен винительный падеж.'],
    [7,'genitive','У меня нет ___.','времени',['время','временем','о времени'],'После «нет» употребляется родительный падеж.'],
    [7,'motion','Каждый день я ___ в школу пешком.','хожу',['иду сейчас всегда','ехал завтра','летал пешком один раз'],'Повторяющееся движение пешком выражается глаголом «хожу».'],
    [7,'aspect_intro','Я уже ___ письмо.','написал',['писал сейчас ещё','пишу вчера','буду писал'],'Завершённый результат выражен совершенным видом «написал».'],
    [8,'dative','Я помог ___.','другу',['друг','друга','другом'],'Глагол «помог» требует дательного падежа.'],
    [8,'relative','Это книга, ___ я прочитал.','которую',['который','которое','которыми'],'Местоимение согласуется с «книга» и стоит в винительном падеже.'],
    [8,'complex_sentence','Выберите сложноподчинённое предложение.','Я остался дома, потому что шёл дождь.',['Шёл дождь и дул ветер.','Дождливый день был прохладным.','Дом стоял у дороги.'],'Союз «потому что» вводит придаточную часть причины.'],
    [9,'participle','Выберите верное сочетание.','книга, прочитанная учеником',['книга, прочитанный учеником','книга, прочитавшая учеником','книга, прочитать учеником'],'Причастие согласуется со словом «книга».'],
    [9,'gerund','Выберите нормативное предложение.','Читая текст, ученик делал заметки.',['Читая текст, у ученика появились заметки.','Читал текст, заметки учеником.','Читая, текст сделал заметки.'],'Действия деепричастия и сказуемого относятся к одному лицу.'],
    [10,'aspect','Когда я ___ статью, я отправлю её редактору.','допишу',['писал вчера','пишу всегда','написывал бы сейчас'],'Для завершённого будущего результата нужен совершенный вид.'],
    [10,'punctuation','Где правильно расставлены знаки?','Если будет тепло, мы пойдём пешком.',['Если будет тепло мы, пойдём пешком.','Если, будет тепло мы пойдём пешком.','Если будет тепло; мы, пойдём пешком.'],'Придаточная часть условия отделяется запятой.'],
    [11,'style','Выберите нейтральную официальную формулировку.','Просим предоставить документ до пятницы.',['Эй, пришлите бумагу!','Давайте-ка документ сюда.','Бумажку бы до пятницы.'],'Официальный стиль требует нейтральной и точной лексики.'],
    [11,'syntax','Выберите предложение с придаточным уступки.','Хотя было поздно, работа продолжалась.',['Потому что было поздно, работа остановилась.','Когда стемнело, зажглись фонари.','Если будет поздно, мы уйдём.'],'Союз «хотя» выражает уступку.'],
    [12,'editing','Выберите наиболее ясную редакцию.','Исследование было небольшим, поэтому вывод требует проверки.',['Исследование небольшое, вывод, поэтому проверка.','Исследование было и вывод требуя проверялся.','Небольшим исследованием поэтому вывод.'],'Предложение логично связывает причину и следствие.'],
    [12,'advanced_punctuation','Выберите правильное оформление вводного слова.','Результат, вероятно, изменится.',['Результат вероятно изменится.','Результат; вероятно, изменится.','Результат, вероятно изменится.'],'Вводное слово «вероятно» обособляется с двух сторон.'],
  ];
  const RU_WORDS = {
    5:[['школа','სკოლა'],['друг','მეგობარი'],['книга','წიგნი'],['семья','ოჯახი']],
    7:[['путешествие','მოგზაურობა'],['полезный','სასარგებლო'],['окружающая среда','გარემო'],['достижение','მიღწევა']],
    9:[['доказательство','მტკიცებულება'],['последствие','შედეგი'],['надёжный','სანდო'],['исследование','კვლევა']],
    11:[['неоднозначный','ორაზროვანი'],['последовательный','თანმიმდევრული'],['обоснованный','დასაბუთებული'],['возражение','შეპასუხება']],
  };
  const RU_READING = [
    [5,'У Ани есть синяя тетрадь. Она пишет в ней новые слова.','Какого цвета тетрадь?','синяя',['красная','зелёная','белая']],
    [6,'Каждое утро Илья поливает цветок. Поэтому цветок хорошо растёт.','Почему цветок хорошо растёт?','Илья его поливает.',['Цветок сделан из бумаги.','Утро очень короткое.','Илья закрывает окно.']],
    [7,'Оля опоздала на автобус и пошла в школу пешком. Она пришла до начала урока.','Что сделала Оля?','Пошла пешком.',['Вернулась домой.','Пропустила школу.','Поехала на поезде.']],
    [9,'Школьники сравнили две почвы. В почве, которая дольше сохраняла воду, семена росли быстрее.','Какой вывод подтверждает текст?','Сохранение воды повлияло на рост.',['Почва не влияет на растения.','Семена не получали воду.','Все почвы одинаковы.']],
    [11,'В отчёте обнаружена связь между чтением и оценками, но авторы не учли время самостоятельной подготовки.','Почему вывод требует осторожности?','Не учтён возможный дополнительный фактор.',['Связь всегда доказывает причину.','Оценки невозможно измерить.','В отчёте нет данных.']],
  ];

  function russianQuestion(bucket, grade, seed) {
    if (bucket === 'grammar') {
      const eligible = RU_GRAMMAR.filter(row => row[0] <= grade);
      const advanced = eligible.slice(Math.max(0, eligible.length - 7));
      const [min, topic, text, answer, wrong, explain] = pick(advanced, seed);
      return mcq(text, answer, wrong, explain, `ru.grammar.${topic}`, min);
    }
    if (bucket === 'vocabulary') {
      const keys = Object.keys(RU_WORDS).map(Number).filter(level => level <= grade);
      const level = Math.max(...keys);
      const [word, meaning] = pick(RU_WORDS[level], seed);
      return mcq(`Каково грузинское значение слова «${word}»?`, meaning,
        ['საპირისპირო მნიშვნელობა','გრამატიკული ნიშანი','დაუკავშირებელი მოქმედება'],
        `В словаре этого уровня «${word}» означает «${meaning}».`, `ru.vocabulary.g${level}`, level);
    }
    if (bucket === 'reading') {
      const eligible = RU_READING.filter(row => row[0] <= grade);
      const [min, passage, prompt, answer, wrong] = pick(eligible.slice(Math.max(0, eligible.length - 3)), seed);
      return mcq(`Прочитайте оригинальный текст EduTest: «${passage}» ${prompt}`, answer, wrong,
        'Ответ прямо указан или подтверждается коротким оригинальным текстом.', `ru.reading.g${min}`, min);
    }
    const rows = grade <= 6
      ? [[5,'Выберите вежливое приветствие.','Здравствуйте!',['Закройте!','Стол!','Никогда!'],'Так приветствуют собеседника в нейтральной ситуации.','greeting'],
         [5,'Выберите естественную просьбу.','Дайте, пожалуйста, карандаш.',['Карандаш бежит.','Я карандаш вчера.','Синий быстро.'],'Слово «пожалуйста» делает просьбу вежливой.','request']]
      : grade <= 9
        ? [[7,'Выберите естественное сочетание.','принять решение',['сделать решать','решение делатья','брать решённый'],'Нормативное сочетание — «принять решение».','collocation'],
           [8,'Какая фраза уместна в письме учителю?','Не могли бы Вы уточнить срок?',['Эй, когда сдавать?','Скажи дату сейчас.','Ну что там со сроком?'],'Фраза вежлива и соответствует официальной ситуации.','register']]
        : [[10,'Выберите лучший вариант связи: Данных мало; ___, вывод предварительный.','поэтому',['например','одновременно','подобно'],'«Поэтому» выражает следствие.','cohesion'],
           [11,'Выберите наиболее точную формулировку.','Данные позволяют предположить, что мера может быть полезной.',['Мера точно решает всё.','Наверное, всё как-то улучшится.','Мера совершенно идеальна.'],'Формулировка соотносит силу утверждения с данными.','hedging']];
    const [min, text, answer, wrong, explain, topic] = pick(rows.filter(row => row[0] <= grade), seed);
    return mcq(text, answer, wrong, explain, `ru.use.${topic}`, min);
  }

  function decorate(question, language, grade, semester, version, unit, slot, bucket) {
    const config = LANGUAGE_CONFIG[language];
    const instructions = language === 'ka'
      ? ['ყურადღებით წაიკითხე და აირჩიე პასუხი:','დაეყრდენი ტექსტურ ან ენობრივ ნიშანს:','იმსჯელე და მონიშნე დასაბუთებული პასუხი:','შეამოწმე ყველა ვარიანტი და უპასუხე:']
      : language === 'en'
        ? ['Read carefully and choose the best answer:','Use the language clue and answer:','Think step by step and select the answer:','Check every option and answer:']
        : ['Прочитайте внимательно и выберите ответ:','Используйте языковую подсказку:','Рассуждайте по шагам и ответьте:','Проверьте варианты и ответьте:'];
    const itemLabel = language === 'ka' ? `${roman[grade]} კლასი, ${semester === 1 ? 'I' : 'II'} სემესტრი, თემა ${unit + 1}, სავარჯიშო ${slot + 1}.`
      : language === 'en' ? `Grade ${grade}, semester ${semester}, unit ${unit + 1}, exercise ${slot + 1}.`
        : `Класс ${grade}, семестр ${semester}, раздел ${unit + 1}, задание ${slot + 1}.`;
    const component = language === 'ka' ? bucket.split('.')[0] : bucket;
    const topic = language === 'ka' ? bucket.split('.')[1] : question.topicCode.split('.').slice(-1)[0];
    const result = {
      ...question,
      id:`lb26-${config.prefix}-g${grade}-s${semester}-v${version}-u${unit}-q${slot + 1}`,
      text:`${itemLabel} ${instructions[version - 1]} ${question.text}`,
      subject:config.subject,
      languageCode:language,
      grade,
      gradeMin:grade,
      gradeMax:grade,
      semester,
      topicGroup:`s${semester}-unit-${unit === 0 ? 'a' : 'b'}`,
      component,
      topic,
      blueprintBucket:bucket,
      skill:question.topicCode,
      templateShape:`lb.${language}.g${grade}.s${semester}.u${unit}.${bucket}.${slot}`,
      templateFamily:`lb.${language}.g${grade}.s${semester}.u${unit}.${bucket}.${slot}.v${version}`,
      outcome:`NCP-CANDIDATE.${language.toUpperCase()}.G${grade}.${question.topicCode.toUpperCase().replaceAll('.','_')}`,
      curriculumSource:CURRICULUM_SOURCE,
      textbookCatalog:TEXTBOOK_CATALOG,
      copyrightStatus:'original_or_public_domain',
      sourceAttribution:'EduTest original educational item; author/era facts use public-domain bibliographic knowledge',
      reviewStatus:'generated_review_required',
      qualityStatus:'machine_validated',
      generated:true,
      difficulty:grade <= 4 ? 1 : grade <= 8 ? 2 : 3,
    };
    if (language === 'en' && grade <= 2) {
      result.bilingual = true;
      result.text += ' ქართული მინიშნება: წაიკითხე მოკლე ინგლისური წინადადება და აირჩიე ან ჩაწერე სწორი პასუხი.';
    }
    if (slot % 4 === 0) {
      const answer = result.opts?.[result.correct];
      if (answer) {
        result.type = 'fill';
        const writePrompt = language === 'en' ? 'Write the answer:' : language === 'ru' ? 'Запишите ответ:' : 'ჩაწერე პასუხი:';
        result.text = `${result.text} ${writePrompt}${result.text.includes('___') ? '' : ' ___'}`;
        result.blanks = [String(answer)];
        delete result.opts;
        delete result.correct;
      }
    }
    if ((slot + version + unit) % 5 === 0 || (slot === 11 && version === 4)) {
      result.visual = {
        kind:'cards',
        alt:`${config.subject}, ${roman[grade]} კლასი — ${topic}`,
        caption:language === 'ka' ? 'საკვანძო ნიშნები დააკავშირე დავალების პირობასთან.'
          : language === 'en' ? 'Connect the key clues to the task.'
            : 'Свяжите ключевые признаки с заданием.',
        items:[component, topic, `grade ${grade}`],
        variantKey:`${config.prefix}-g${grade}-s${semester}-v${version}-u${unit}-q${slot + 1}`,
      };
    }
    return result;
  }

  const tests = [];
  const stats = {
    version:'2026.07-language-blueprints-v1',
    versions:VERSION_COUNT,
    questionsPerGrade:VERSION_COUNT * QUESTIONS_PER_SEMESTER_VERSION * 2,
    testsPerGrade:6,
    questions:0,
    tests:0,
    languages:{},
    prematureTopicViolations:0,
    validation:{checked:0,blocked:0,directAnswerAgreement:0,curatedRuleTable:0},
  };

  Object.entries(LANGUAGE_CONFIG).forEach(([language, config]) => {
    stats.languages[language] = {subject:config.subject, grades:{}, questions:0, tests:0, listeningSupported:false};
    config.grades.forEach(grade => {
      const weights = BLUEPRINTS[language][grade];
      stats.languages[language].grades[grade] = {blueprint:weights, questions:0, tests:0};
      for (let version = 1; version <= VERSION_COUNT; version += 1) {
        const rows = [];
        for (let semester = 1; semester <= 2; semester += 1) {
          for (let unit = 0; unit < 2; unit += 1) {
            // Allocate each thematic unit independently. This guarantees that
            // both unit tests have blueprint coverage instead of inheriting a
            // skewed half of one semester-wide sequence.
            const buckets = bucketSequence(weights, QUESTIONS_PER_SEMESTER_VERSION / 2,
              grade + semester + version + unit * 3);
            // Across the four deterministic versions, every positive-weight
            // blueprint bucket is guaranteed to appear in each unit. Low-weight
            // skills (for example orthography or vocabulary) therefore remain
            // available when a 10/20-question paper rounds them up to one item.
            Object.keys(weights).filter(key => Number(weights[key]) > 0).forEach((key, index) => {
              if (index % VERSION_COUNT !== version - 1 || buckets.includes(key)) return;
              buckets[(index + semester + unit) % buckets.length] = key;
            });
            buckets.forEach((bucket, slot) => {
              const seed = grade * 100000 + semester * 10000 + version * 1000 + unit * 100 + slot;
              const question = language === 'ka' ? georgianQuestion(bucket, grade, seed)
                : language === 'en' ? englishQuestion(bucket, grade, seed)
                  : russianQuestion(bucket, grade, seed);
              if (grade < Number(question.topicIntroducedGrade || 1)) stats.prematureTopicViolations += 1;
              rows.push(decorate(question, language, grade, semester, version, unit, slot, bucket));
            });
          }
        }
        rows.forEach(row => {
          const result = root.EDUTEST_GENERATED_VALIDATOR
            ? root.EDUTEST_GENERATED_VALIDATOR.validateAndMark(row, { expectedGrade: grade })
            : { valid:true, evidence:'validator_unavailable' };
          stats.validation.checked += 1;
          if (!result.valid) stats.validation.blocked += 1;
          if (result.evidence === 'direct_answer_agreement') stats.validation.directAnswerAgreement += 1;
          if (result.evidence === 'curated_rule_table') stats.validation.curatedRuleTable += 1;
        });
        Q_POOL[`${config.prefix}-g${grade}-${version}`] = rows;
        stats.languages[language].grades[grade].questions += rows.length;
        stats.languages[language].questions += rows.length;
        stats.questions += rows.length;
      }

      const paid = grade >= 9;
      const baseMinutes = grade <= 4 ? 15 : grade <= 8 ? 20 : grade <= 10 ? 25 : 30;
      const definitions = [
        ['s1-u1','I სემ. · თემატური 1',1,'s1-unit-a',10,'unit'],
        ['s1-u2','I სემ. · თემატური 2',1,'s1-unit-b',10,'unit'],
        ['s1-sum','I სემ. · შემაჯამებელი',1,null,20,'sum'],
        ['s2-u1','II სემ. · თემატური 1',2,'s2-unit-a',10,'unit'],
        ['s2-u2','II სემ. · თემატური 2',2,'s2-unit-b',10,'unit'],
        ['s2-sum','II სემ. · შემაჯამებელი',2,null,20,'sum'],
      ];
      definitions.forEach(([suffix, label, semester, topicGroup, count, testType]) => {
        const allocation = allocateBlueprint(weights, count, grade + semester + (topicGroup ? topicGroup.length : 0));
        const languageCount = language === 'ka'
          ? Object.entries(allocation).filter(([key]) => key.startsWith('language.')).reduce((sum, [, value]) => sum + value, 0)
          : null;
        tests.push({
          id:`${config.prefix}-g${grade}-${suffix}`,
          title:`${config.subject} — ${roman[grade]} კლასი — ${label}`,
          subject:config.subject,
          grade,
          pool:`${config.prefix}-g${grade}`,
          count,
          time:testType === 'sum' ? baseMinutes + 10 : baseMinutes,
          attempts:grade <= 4 ? 3 : 2,
          paid,
          semester,
          topicGroup,
          testType,
          sumTest:testType === 'sum',
          contentBlueprint:weights,
          componentCounts:language === 'ka'
            ? {language:languageCount, literature:count - languageCount}
            : allocation,
          blueprintAllocation:allocation,
          blueprintVersion:'2026.07-v1',
          listeningSupported:false,
          catalogVersion:'2026.07',
        });
      });
      stats.languages[language].grades[grade].tests += definitions.length;
      stats.languages[language].tests += definitions.length;
      stats.tests += definitions.length;
    });
  });

  root.EDUTEST_LANGUAGE_BLUEPRINTS = BLUEPRINTS;
  root.EDUTEST_LANGUAGE_CONFIG = LANGUAGE_CONFIG;
  root.EDUTEST_ALLOCATE_BLUEPRINT = allocateBlueprint;
  root.EDUTEST_LANGUAGE_TESTS = Object.freeze(tests);
  root.EDUTEST_LANGUAGE_STATS = Object.freeze(stats);
})(typeof window !== 'undefined' ? window : globalThis);
