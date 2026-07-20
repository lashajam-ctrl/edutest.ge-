(function applyEduTestQuestionQualityOverrides(){
  'use strict';
  if(typeof Q_POOL==='undefined')return;

  const overrides={
    geo12_4:{
      text:'რომელი სიტყვა გამოხატავს მისალმებას?',
      opts:['გამარჯობა','ნახვამდის','მადლობა','ბოდიში'],correct:0,pts:1,
      explain:'„გამარჯობა“ მისალმების სიტყვაა.',skill:'language.vocabulary',outcome:'ქართული.I-II.ლექსიკა'
    },
    m12v4_17:{
      text:'4 + 3 = 7',opts:['✅ სწორია','❌ მცდარია'],correct:0,pts:1,
      explain:'ოთხს რომ სამი დავუმატოთ, მივიღებთ შვიდს.',skill:'math.addition',outcome:'მათემატიკა.I-II.რიცხვები'
    },
    m12v6_15:{
      text:'18 ვაშლიდან 6 მეგობრებს დავურიგეთ. რამდენი ვაშლი დარჩა?',
      opts:['12','6','24','3'],correct:0,pts:2,
      explain:'დარჩენილი რაოდენობაა 18 − 6 = 12.',skill:'math.subtraction',outcome:'მათემატიკა.II.რიცხვები'
    },
    n12v2_10:{
      text:'როდესაც ამინდი თბება და მცენარეები ყვავიან, რომელი სეზონია?',
      opts:['ზამთარი','შემოდგომა','გაზაფხული','ზაფხული'],correct:2,pts:2,
      explain:'გაზაფხულზე ამინდი თბება და ბევრი მცენარე ყვავილობას იწყებს.',skill:'science.seasons',outcome:'ბუნება.I-II.სეზონები'
    },
    n12v2_17:{
      text:'როგორ ეწოდება ცხოველს, რომელიც მცენარეულ და ცხოველურ საკვებსაც ჭამს?',
      opts:['ბალახისმჭამელი','ხორცისმჭამელი','ყოვლისმჭამელი (ომნივორი)','პარაზიტი'],correct:2,pts:2,
      explain:'ყოვლისმჭამელი ცხოველი მცენარეულ და ცხოველურ საკვებსაც იკვებება.',skill:'science.animals',outcome:'ბუნება.III-IV.ცოცხალი-სამყარო'
    },
    n12v3_17:{
      text:'რომელი ციური სხეული გვაძლევს სინათლესა და სითბოს?',
      opts:['მზე','მთვარე','ღრუბელი','ქვა'],correct:0,pts:1,
      explain:'დედამიწისთვის სინათლისა და სითბოს მთავარი წყარო მზეა.',skill:'science.observation',outcome:'ბუნება.I-II.ციური-სხეულები'
    },
    n12v4_4:{
      text:'რომელი ორი ელემენტისგან შედგება ნახშირორჟანგი (CO₂)?',
      opts:['წყალბადისა და აზოტისგან','ნახშირბადისა და ჟანგბადისგან','ჰელიუმისა და ჟანგბადისგან','მხოლოდ ჟანგბადისგან'],correct:1,pts:2,
      explain:'CO₂ შედგება ერთი ნახშირბადის და ორი ჟანგბადის ატომისგან.',skill:'chemistry.compounds',outcome:'ბუნება.V-VI.ნივთიერებები'
    },
    h1112_9:{
      text:'საბჭოთა კავშირზე ნაცისტური გერმანიის თავდასხმა რომელ წელს დაიწყო?',
      opts:['1939 წელს','1941 წელს','1943 წელს','1944 წელს'],correct:1,pts:2,
      explain:'ნაცისტური გერმანია საბჭოთა კავშირს 1941 წლის 22 ივნისს დაესხა თავს.',skill:'history.chronology',outcome:'ისტორია.XI-XII.მეორე-მსოფლიო-ომი'
    }
  };

  Object.values(Q_POOL).forEach(rows=>{
    if(!Array.isArray(rows))return;
    rows.forEach(question=>{
      const replacement=overrides[question&&question.id];
      if(!replacement)return;
      Object.assign(question,replacement,{contentReviewed:true,reviewStatus:'content_reviewed'});
    });
  });
})();
