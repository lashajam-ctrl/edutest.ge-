import {applyHeldReview,heldReviewForId} from './bank-quality-corrections-v29-held.mjs';
// Reviewed corrections, applied to stable question IDs (never delete history).
export function correctBankRow(input) {
  const reviewed=applyHeldReview(input);if(reviewed)return reviewed;
  const row = { ...input }, p = JSON.parse(row.public_payload_json), a = JSON.parse(row.answer_key_json), fixes = [];
  const set = (text, options, correct, explanation, reason) => {
    p.text = text; if (options) p.opts = options;
    if (correct !== undefined) a.correct = correct;
    row.explanation = explanation; fixes.push(reason);
  };
  if (row.subject === 'ქართული' && /დიდი ასო|დიდი.*ასოთი/u.test(p.text)) {
    if (row.question_type === 'true_false') {
      const name = ['ნინო','გიორგი','მტკვარი','თელავი'].find(n => p.text.includes(n));
      set(name ? `„${name}“ საკუთარი სახელია.` : 'წინადადების ბოლოს სასვენი ნიშანი იწერება.', ['ჭეშმარიტი','მცდარი'], 0,
        name ? `„${name}“ კონკრეტულ ადამიანს ან ადგილს ასახელებს. ქართულში საკუთარ სახელებს საწყისი ასოს ზომით არ განასხვავებენ.` : 'წინადადება სრულდება შესაბამისი სასვენი ნიშნით: წერტილით, კითხვის ან ძახილის ნიშნით.', 'georgian_capitalization');
    } else if (row.id.endsWith('GE3-E11EA8B57C3C')) {
      set('პირველი წინადადება: ღამით მთვარე კაშკაშებს.\nმეორე წინადადება: ჩემს დას მთვარე ჰქვია.\nრომელ წინადადებაშია „მთვარე“ ადამიანის სახელი?', ['მეორეში','პირველში','ორივეში','არცერთში'], 0, 'მეორე წინადადებაში „მთვარე“ დის სახელია; პირველში ცის სხეულს აღნიშნავს.', 'georgian_capitalization');
      row.topic=p.topic='ქართული · საკუთარი სახელი';
    } else if (row.id.endsWith('GE3-0335E04903B7')) {
      set('წინადადება: ჩვენ ზაფხულში ბათუმში და ბორჯომში ვიყავით.\nრომელი ორი სიტყვა ასახელებს ქალაქებს?', p.opts, 0, 'ბათუმი და ბორჯომი ქალაქების საკუთარი სახელებია. „ზაფხული“ წელიწადის დროა, „ჩვენ“ კი ნაცვალსახელია.', 'georgian_capitalization');
    }
  }
  if (row.question_type === 'order' && row.subject === 'ქართული' && ['ანა','საღამოს','კითხულობს','წიგნს'].every(x=>p.items?.includes(x)) && p.items.length===4) {
    set('დაალაგე სიტყვები კითხვების ამ რიგის მიხედვით: ვინ? → როდის? → რას აკეთებს? → რას?', null, ['ანა','საღამოს','კითხულობს','წიგნს'], 'ვინ? — ანა; როდის? — საღამოს; რას აკეთებს? — კითხულობს; რას? — წიგნს. ეს დავალება მოცემულ რიგს ითხოვს; ქართულში სხვა სიტყვათა რიგიც შეიძლება გამართული იყოს.', 'unique_order_condition');
  }
  if (row.id.endsWith('GE-G04-KA-S1-043')) {
    set('სოფელში დილით ნისლი იდგა. ცოტა ხანში მზე ამოვიდა და ნისლი გაიფანტა. ბავშვები ეზოში სათამაშოდ გავიდნენ.\nრა გააკეთეს ბავშვებმა ნისლის გაფანტვის შემდეგ?', ['ეზოში სათამაშოდ გავიდნენ','სახლში დასაძინებლად შევიდნენ','ტყეში სოკოს საკრეფად წავიდნენ','სკოლაში გაკვეთილზე დასხდნენ'], 0, 'ბოლო წინადადება პირდაპირ ამბობს, რომ ბავშვები ეზოში სათამაშოდ გავიდნენ. ტექსტი მათ ხასიათზე დასკვნის საფუძველს არ იძლევა.', 'reading_evidence');
  }
  if (p.opts?.includes('A ყოველთვის საუკეთესოა.') && p.text.includes('გრაფიკის დახრილობა')) {
    set('ტემპერატურის დროზე დამოკიდებულების გრაფიკზე ჰორიზონტალურ ღერძზე დროა, ვერტიკალურზე — ტემპერატურა. რას გვიჩვენებს გრაფიკის დახრილობა?', ['ტემპერატურის ცვლილებას დროის ერთეულში','მხოლოდ საწყის ტემპერატურას','მხოლოდ დაკვირვების ხანგრძლივობას','სხეულის მასას'], 0, 'დახრილობა არის ტემპერატურის ცვლილების შეფარდება დროის ცვლილებასთან: ΔT/Δt.', 'relevant_distractors');
  }
  const regions = {
    'GE-G05-SO-S1-001': ['კახეთი', ['აღმოსავლეთ საქართველოში','დასავლეთ საქართველოს ზღვის სანაპიროზე','დასავლეთ საქართველოს ალპურ ზონაში','სამხრეთ საქართველოს ვულკანურ ზეგანზე']],
    'GE-G05-SO-S1-011': ['აჭარა', ['სამხრეთ-დასავლეთ საქართველოში, შავი ზღვის სანაპიროსთან','აღმოსავლეთ საქართველოში, ალაზნის ველზე','ჩრდილო-აღმოსავლეთ საქართველოში, თუშეთში','სამხრეთ საქართველოს ჯავახეთის ზეგანზე']],
    'GE-G05-SO-S1-021': ['სვანეთი', ['დასავლეთ საქართველოს დიდი კავკასიონის მთიანეთში','აღმოსავლეთ საქართველოს ალაზნის ველზე','შავი ზღვის სანაპირო დაბლობზე','სამხრეთ საქართველოს ჯავახეთის ზეგანზე']],
    'GE-G05-SO-S1-041': ['სამცხე-ჯავახეთი', ['სამხრეთ საქართველოში','საქართველოს შავი ზღვის სანაპირო ზოლში','ჩრდილო-აღმოსავლეთ საქართველოს თუშეთში','დასავლეთ საქართველოს სვანეთის მთიანეთში']],
  };
  for (const [id,[region,options]] of Object.entries(regions)) if(row.id.endsWith(id)) set(`სად მდებარეობს ${region}?`, options, 0, `${region} მდებარეობს ${options[0].replace(/ში$/u,'ში')}.`, 'relevant_distractors');
  if (row.grade===3 && row.subject==='მათემატიკა' && p.text.includes('(3,-2)')) {
    set('ბადეზე ერთი უჯრით ზემოთ ასვლა ერთ ნაბიჯად ითვლება. წერტილი ხაზის ქვემოთ 2 უჯრითაა. რამდენი ნაბიჯი უნდა ავიდეთ, რომ ხაზამდე მივიდეთ?', ['2','3','1','5'], 0, 'ხაზამდე ორი უჯრაა, ამიტომ საჭიროა ორი ნაბიჯი ზემოთ.', 'age_appropriate_coordinates');
    row.topic=p.topic='მათემატიკა · სივრცეში ორიენტირება';
  }
  if (row.grade===4 && row.subject==='ინგლისური' && p.text.includes('Which sentence is passive?')) {
    set('Which sentence describes what the pupils do every day?', ['The pupils read every day.','The pupils reading every day.','The pupils reads every day.','The pupils is read every day.'],0,'For a daily habit, use the present simple. The plural subject “pupils” takes “read”, not “reads”.','age_appropriate_grammar');
    row.topic=p.topic='Grammar · Present simple';
  }
  if (row.subject==='ისტორია' && p.text.includes('ტრანსპორტის ახალი მარშრუტის')) {
    row.subject=p.subject='მოქალაქეობა';row.topic=p.topic='მოქალაქეობა · საზოგადოებრივი მომსახურების შეფასება';fixes.push('subject_correction');
  }
  if (row.question_type==='short_answer' && a.mode==='text' && a.accepted?.some(x=>/\s/u.test(String(x)))) {
    row.answer_key_json=JSON.stringify({mode:'ai',referenceAnswer:a.accepted.join(' / '),rubric:row.explanation});fixes.push('paraphrase_safe_grading');
  } else row.answer_key_json=JSON.stringify(a);
  row.public_payload_json=JSON.stringify(p);
  return {row,fixes};
}

// These examples admit more than one answer, an unsupported inference, or a
// grade-one reading load that still needs a separate age-level rewrite.
export const V29_ENGLISH_REVIEW_HOLD = new Set([
 'CBC5F45D0E78','49ADB08C5668','0F5B801B8108','2410A7285F67','329279D4F70D',
 '4BDA57D3D4AD','878C9312F411','A0A4D93B629D','6B829CDCDF63','C7E86B1A04A4',
 'F294E078C5C0','09BF2D12506E','BE3E84B7DD05','9A39FDCCDD11','E21547C164F8',
 '16E93A64908C','2A7D8B887C5C','BD0141E2D33A','1BC610DCE272','98A960B51F72',
 '6EC33B57F767','46C79288CCB9','36F8752DCFF9','70E97C92FA0E','AA0475904650',
 '0EDB68464262','4EEC71C955EA','AFC207C08AE8',
]);
export function v29AdditionDecision(q) {
  if(heldReviewForId(q.id))return 'reviewed_held';
  if(q.subject!=='ინგლისური')return 'pending_subject_content_review';
  if(q.grade===1)return 'pending_grade_one_reading_simplification';
  if(V29_ENGLISH_REVIEW_HOLD.has(q.id.split('-').at(-1)))return 'pending_prompt_disambiguation';
  return 'reviewed_english';
}
