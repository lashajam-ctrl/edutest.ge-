(function expandEduTestQuestionBank(root){
  if(typeof Q_POOL==='undefined')return;

  const BANDS={12:[1,2],34:[3,4],56:[5,6],78:[7,8],910:[9,10],1112:[11,12]};
  const PUBLISHED_BASES=[
    'math-12','math-34','math-56','math-78','math-910','math-1112',
    'geo-12','geo-34','geo-56','geo-78','geo-910','geo-1112',
    'gg-78','gg-910','gg-1112',
    'eng-12','eng-34','eng-56','eng-78','eng-910','eng-1112',
    'eg-78','eg-910','eg-1112',
    'rus-56','rus-78','rus-910','rus-1112','rg-56','rg-78','rg-910','rg-1112',
    'nat-12','nat-34','nat-56','hist-78','hist-910','hist-1112',
    'geog-78','geog-910','geog-1112','bio-78','bio-910','bio-1112',
    'chem-78','chem-910','chem-1112','phys-78','phys-910','phys-1112'
  ];

  const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase('ka-GE')
    .replace(/[“”„"'`’]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const contentKey=q=>q.visual?`visual:${JSON.stringify(q.visual)}`:q.media?.src?`media:${q.media.src}`:`text:${normalize(q.text)}`;
  const optionKey=value=>normalize(value)||String(value||'').trim();
  const valid=q=>{
    if(!q||!q.id||!String(q.text||'').trim()||!q.type||!Number.isFinite(Number(q.pts))||Number(q.pts)<=0)return false;
    if(q.type==='multiple_choice'||q.type==='true_false'){
      if(!Array.isArray(q.opts)||q.opts.length<2||!Number.isInteger(Number(q.correct))||q.correct<0||q.correct>=q.opts.length)return false;
      const options=q.opts.map(optionKey);if(options.some(value=>!value)||new Set(options).size!==options.length)return false;
    }
    return true;
  };
  const pick=(items,index)=>items[((index%items.length)+items.length)%items.length];
  const n=(seed,min,span)=>min+((seed*37+seed*seed*11)%span+span)%span;
  const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const uniqueOptions=(correct,distractors)=>{
    const values=[correct,...distractors].map(value=>String(value));const out=[];
    values.forEach(value=>{if(value&&!out.some(existing=>optionKey(existing)===optionKey(value)))out.push(value);});
    while(out.length<4)out.push(`ვარიანტი ${out.length+1}`);
    return out.slice(0,4);
  };
  const mcq=(text,correct,distractors,explain,pts=2)=>({text,type:'multiple_choice',opts:uniqueOptions(correct,distractors),correct:0,pts,explain});
  const tf=(text,isTrue,explain,pts=1)=>({text,type:'true_false',opts:['ჭეშმარიტია','მცდარია'],correct:isTrue?0:1,pts,explain});
  const calcQ=(text,answer,explain,pts=2,tolerance=0)=>({text,type:'calc',correct:Number(answer),pts,tolerance,explain});
  const fillQ=(text,answers,explain,pts=2)=>({text,type:'fill',blanks:answers.map(String),pts,explain});
  const orderQ=(text,items,explain,pts=2)=>({text,type:'order',items:[...items],correct:[...items],pts,explain});
  const matchQ=(text,pairs,explain,pts=2)=>({text,type:'match',pairs:pairs.map(pair=>[...pair]),correct:pairs.map(pair=>pair[1]),pts,explain});
  const meta=(q,prefix,grade,index,skill)=>({
    ...q,
    id:`exp26-${prefix}-${grade}-${index}`,
    grade,gradeMin:grade,gradeMax:grade,semester:Math.floor(index/2)%2+1,
    skill:`${prefix}.${skill}`,
    outcome:`NCP-CANDIDATE.${prefix.toUpperCase()}.G${grade}.${String(skill).toUpperCase().replace(/[^A-Z0-9]+/g,'_')}`,
    curriculumSource:'https://mes.gov.ge/content.php?id=12552',
    reviewStatus:'generated_review_required',qualityStatus:'machine_validated',generated:true,
    difficulty:grade<=2?1:grade<=6?2:grade<=9?2:3
  });
  const visual=(kind,alt,data,caption)=>({kind,alt,caption:caption||alt,...data});

  function mathQuestion(grade,i){
    const seed=grade*1000+i;
    if(i%5===0){
      const values=[n(seed,2,8),n(seed+1,4,9),n(seed+2,3,10),n(seed+3,5,8)];
      const labels=grade<=4?['ორშ.','სამშ.','ოთხშ.','ხუთშ.']:['A','B','C','D'];
      const max=Math.max(...values),idx=values.indexOf(max);
      const q=mcq(`დიაგრამაზე მოცემულია ოთხი მნიშვნელობა. რომელ სვეტს აქვს უდიდესი მნიშვნელობა?`,labels[idx],labels.filter((_,j)=>j!==idx),`უდიდესი მნიშვნელობაა ${max}, ამიტომ პასუხია ${labels[idx]}.`,2);
      q.visual=visual('bars',`სვეტოვანი დიაგრამა: ${labels.map((label,j)=>`${label} ${values[j]}`).join(', ')}`,{labels,values},'წაიკითხე სვეტოვანი დიაგრამა');
      return meta(q,'math',grade,i,'data_reading');
    }
    if(grade<=2){
      const a=n(seed,2,18),b=n(seed+3,1,Math.max(2,20-a));
      switch(i%6){
        case 1:return meta(calcQ(`${a} + ${b} = ?`,a+b,`${a}-სა და ${b}-ის ჯამია ${a+b}.`),'math',grade,i,'addition');
        case 2:return meta(calcQ(`${a+b} − ${b} = ?`,a,`${a+b}-დან ${b}-ის გამოკლებით მივიღებთ ${a}.`),'math',grade,i,'subtraction');
        case 3:return meta(mcq(`ნინას ჰქონდა ${a} ფანქარი და კიდევ ${b} აჩუქეს. რამდენი ფანქარი აქვს ახლა?`,a+b,[a+b-1,a+b+1,a],`საჭიროა შეკრება: ${a}+${b}=${a+b}.`),'math',grade,i,'word_problem');
        case 4:return meta(orderQ('დაალაგე რიცხვები ზრდადობით.',[a,a+b,a+b+2].sort((x,y)=>x-y).map(String),'ზრდადობით დალაგებისას პატარა რიცხვი პირველია.'),'math',grade,i,'number_order');
        default:return meta(fillQ(`${a}, ${a+2}, ___, ${a+6}`,[a+4],`რიცხვები ყოველ ჯერზე 2-ით იზრდება.`),'math',grade,i,'patterns');
      }
    }
    if(grade<=6){
      const a=n(seed,12,70),b=n(seed+2,2,9),product=a*b;
      switch(i%8){
        case 1:return meta(calcQ(`${a} × ${b} = ?`,product,`${a}×${b}=${product}.`),'math',grade,i,'multiplication');
        case 2:return meta(calcQ(`${product} ÷ ${b} = ?`,a,`გაყოფა გამრავლების შებრუნებული მოქმედებაა: ${product}÷${b}=${a}.`),'math',grade,i,'division');
        case 3:{const length=n(seed,3,15),width=n(seed+4,2,10);return meta(calcQ(`მართკუთხედის სიგრძეა ${length} სმ, სიგანე — ${width} სმ. იპოვე პერიმეტრი.`,2*(length+width),`P=2×(${length}+${width})=${2*(length+width)} სმ.`),'math',grade,i,'geometry_perimeter');}
        case 4:{const price=n(seed,3,18),qty=n(seed+2,2,7);return meta(mcq(`${qty} რვეულის თითოეული ფასი ${price} ლარია. რამდენია საერთო ფასი?`,price*qty,[price+qty,price*qty-1,price*(qty+1)],`საერთო ფასი არის ${qty}×${price}=${price*qty} ლარი.`),'math',grade,i,'money_problem');}
        case 5:return meta(fillQ(`${a}, ${a+b}, ${a+2*b}, ___`,[a+3*b],`ყოველ მომდევნო წევრს ემატება ${b}.`),'math',grade,i,'patterns');
        case 6:return meta(matchQ('დააკავშირე მოქმედება მის შედეგს.',[[`${b}×2`,String(b*2)],[`${b}×3`,String(b*3)],[`${b}×4`,String(b*4)]],'თითოეული ნამრავლი გამოითვლება განმეორებითი შეკრებით.'),'math',grade,i,'operation_match');
        default:{const total=n(seed,40,100),part=n(seed+5,5,Math.floor(total/2));return meta(mcq(`კლასში შეაგროვეს ${total} წიგნი, აქედან ${part} ბიბლიოთეკას გადასცეს. რამდენი დარჩა?`,total-part,[total+part,total-part+1,part],`დარჩენილი რაოდენობაა ${total}−${part}=${total-part}.`),'math',grade,i,'multi_step_problem');}
      }
    }
    const x=n(seed,2,18),m=n(seed+1,2,9),c=n(seed+2,1,15);
    switch(i%10){
      case 1:return meta(calcQ(`ამოხსენი განტოლება: ${m}x + ${c} = ${m*x+c}`,x,`ორივე მხარეს გამოვაკლოთ ${c} და გავყოთ ${m}-ზე; x=${x}.`,3),'math',grade,i,'linear_equation');
      case 2:{const base=n(seed,40,160),pct=pick([10,20,25,50],i);return meta(calcQ(`იპოვე ${base}-ის ${pct}%.`,base*pct/100,`${pct}% = ${pct}/100, ამიტომ ${base}×${pct}/100=${base*pct/100}.`),'math',grade,i,'percent');}
      case 3:{const sides=[n(seed,3,12),n(seed+1,4,13),n(seed+2,5,14)];return meta(calcQ(`სამკუთხედის გვერდებია ${sides.join(', ')} სმ. იპოვე პერიმეტრი.`,sides.reduce((a,b)=>a+b,0),`პერიმეტრი გვერდების ჯამია: ${sides.join('+')}=${sides.reduce((a,b)=>a+b,0)}.`),'math',grade,i,'geometry');}
      case 4:{const values=[n(seed,5,20),n(seed+1,6,18),n(seed+2,7,16),n(seed+3,8,14)];const sum=values.reduce((a,b)=>a+b,0);return meta(calcQ(`მონაცემებია ${values.join(', ')}. იპოვე არითმეტიკული საშუალო.`,sum/4,`ჯამია ${sum}; ${sum}÷4=${sum/4}.`,3),'math',grade,i,'statistics');}
      case 5:return meta(fillQ(`თუ f(x)=${m}x+${c}, მაშინ f(${x})=___`,[m*x+c],`ჩავსვათ x=${x}: ${m}×${x}+${c}=${m*x+c}.`),'math',grade,i,'function');
      case 6:{const good=n(seed,2,8),all=good+n(seed+3,2,8);return meta(mcq(`ყუთში ${good} ლურჯი და ${all-good} წითელი ბურთია. ლურჯის ამოღების ალბათობაა:`,`${good}/${all}`,[`${all-good}/${all}`,`${good}/${all+1}`,`${all}/${good}`],`ხელსაყრელი შედეგია ${good}, ყველა შესაძლო — ${all}; ალბათობა ${good}/${all}.`),'math',grade,i,'probability');}
      case 7:return meta(orderQ('დაალაგე რიცხვები მნიშვნელობების ზრდადობით.',[String(x-1),String(x),String(x+1)],`მნიშვნელობებია ${x-1}, ${x}, ${x+1}.`),'math',grade,i,'comparison');
      case 8:{const distance=n(seed,60,180),time=pick([2,3,4,5,6],i);const adjusted=distance-distance%time;return meta(calcQ(`მანქანამ ${adjusted} კმ ${time} საათში გაიარა. იპოვე საშუალო სიჩქარე.`,adjusted/time,`v=s/t=${adjusted}/${time}=${adjusted/time} კმ/სთ.`),'math',grade,i,'rate');}
      default:return meta(tf(`რიცხვი ${m*x+c} აკმაყოფილებს ტოლობას ${m}x+${c}=${m*x+c}, როცა x=${x}.`,true,`ჩასმით მივიღებთ ${m}×${x}+${c}=${m*x+c}.`),'math',grade,i,'verification');
    }
  }

  const KA_WORDS=[['დედა',2],['სკოლა',2],['მეგობარი',4],['ბიბლიოთეკა',5],['მასწავლებელი',5],['საქართველო',4],['მზე',1],['გაზაფხული',3]];
  const KA_SYNONYMS=[['ლამაზი','მშვენიერი'],['სწრაფი','ჩქარი'],['მამაცი','გაბედული'],['პატარა','მცირე'],['სევდიანი','მოწყენილი'],['ჭკვიანი','გონიერი']];
  const KA_ANTONYMS=[['დიდი','პატარა'],['თბილი','ცივი'],['მაღალი','დაბალი'],['ადრე','გვიან'],['ნათელი','ბნელი'],['მძიმე','მსუბუქი']];
  function georgianPrimary(grade,i){
    const names=['ანა','ნინო','ლუკა','საბა','თეკლა','გიორგი'],objects=['წიგნს','ყვავილს','წერილს','ხეს','სურათს','რვეულს'];
    const actions=['კითხულობს','რწყავს','წერს','რგავს','ხატავს','ავსებს'];const j=i%names.length;
    if(i%5===0){
      const sentence=[names[j],actions[j],objects[j]];
      const q=mcq(`რომელი სიტყვა აღნიშნავს მოქმედებას?`,actions[j],[names[j],objects[j].replace(/ს$/,''),'ლამაზი'],`მოქმედებას აღნიშნავს ზმნა „${actions[j]}“.`);
      q.visual=visual('tokens',`სიტყვები: ${sentence.join(', ')}`,{items:sentence,highlight:1},'დააკვირდი წინადადების სიტყვებს');
      return meta(q,'geo',grade,i,'language_observation');
    }
    if(grade<=2){
      const [word,count]=pick(KA_WORDS,i);
      switch(i%6){
        case 1:return meta(mcq(`რამდენი მარცვალია სიტყვაში „${word}“?`,count,[Math.max(1,count-1),count+1,count+2],`სიტყვა „${word}“ იყოფა ${count} მარცვლად.`),'geo',grade,i,'syllables');
        case 2:return meta(orderQ('დაალაგე სიტყვები გამართულ წინადადებად.',[names[j],actions[j],objects[j]],`წინადადებაში ჯერ დასახელებულია მოქმედი პირი, შემდეგ მოქმედება და საგანი.`),'geo',grade,i,'sentence_order');
        case 3:return meta(fillQ(`${names[j]} ___ ${objects[j]}.`,[actions[j]],`წინადადებას აზრობრივად ასრულებს სიტყვა „${actions[j]}“.`),'geo',grade,i,'sentence_completion');
        case 4:return meta(mcq(`რომელი ნიშანი უნდა ეწეროს კითხვის ბოლოს: „სად არის ${objects[j].replace(/ს$/,'')}“?`,'?',['.','!',','],'კითხვითი წინადადება კითხვის ნიშნით სრულდება.'),'geo',grade,i,'punctuation');
        default:return meta(tf(`სიტყვა „${names[j]}“ დიდი ასოთი იწერება, რადგან სახელია.`,true,`ადამიანის სახელი საკუთარი სახელია და დიდი ასოთი იწერება.`),'geo',grade,i,'capitalization');
      }
    }
    const syn=pick(KA_SYNONYMS,i),ant=pick(KA_ANTONYMS,i+2);
    switch(i%8){
      case 1:return meta(mcq(`რომელია სიტყვის „${syn[0]}“ სინონიმი?`,syn[1],[ant[1],pick(KA_SYNONYMS,i+1)[1],'უჩვეულო'],`„${syn[0]}“ და „${syn[1]}“ მსგავსი მნიშვნელობის სიტყვებია.`),'geo',grade,i,'vocabulary_synonym');
      case 2:return meta(mcq(`რომელია სიტყვის „${ant[0]}“ ანტონიმი?`,ant[1],[syn[1],pick(KA_ANTONYMS,i+1)[1],'სწორი'],`„${ant[0]}“ და „${ant[1]}“ საპირისპირო მნიშვნელობისაა.`),'geo',grade,i,'vocabulary_antonym');
      case 3:return meta(mcq(`წინადადებაში „${names[j]} ${actions[j]} ${objects[j]}“ რომელია ზმნა?`,actions[j],[names[j],objects[j].replace(/ს$/,''),'რომელიც'],`ზმნა მოქმედებას აღნიშნავს: „${actions[j]}“.`),'geo',grade,i,'parts_of_speech');
      case 4:return meta(fillQ(`${names[j]} ყოველ დილით ___ ${objects[j]}.`,[actions[j]],`ზმნა უნდა ეთანხმებოდეს მოქმედ პირს.`),'geo',grade,i,'grammar_in_context');
      case 5:return meta(matchQ('დააკავშირე სიტყვა მის ჯგუფს.',[[names[j],'საკუთარი სახელი'],[actions[j],'ზმნა'],['ლამაზი','ზედსართავი სახელი']],'სიტყვები დაჯგუფებულია მათი ფუნქციის მიხედვით.'),'geo',grade,i,'parts_of_speech_match');
      case 6:return meta(orderQ('დაალაგე ამბის ნაწილები ლოგიკური თანმიმდევრობით.',['გმირმა პრობლემა შენიშნა','გმირმა გამოსავალი მოიფიქრა','პრობლემა გადაიჭრა'],'ამბავი ვითარდება პრობლემიდან გადაწყვეტამდე.'),'geo',grade,i,'text_sequence');
      default:{const text=`${names[j]} ბიბლიოთეკაში მივიდა. მან წიგნი ბუნებაზე აირჩია და სახლში ყურადღებით წაიკითხა.`;return meta(mcq(`${text} რა არის ტექსტის მთავარი აზრი?`,`${names[j]} ინტერესით კითხულობს`,[`${names[j]} წიგნს კარგავს`,'ბიბლიოთეკა დაკეტილია','ბუნება უინტერესოა'],`ორივე წინადადება ${names[j]}ის კითხვის ინტერესს აღწერს.`),'geo',grade,i,'reading_main_idea');}
    }
  }

  function georgianGrammar(grade,i){
    const words=[['მოსწავლე','არსებითი სახელი'],['კითხულობს','ზმნა'],['საინტერესო','ზედსართავი სახელი'],['სწრაფად','ზმნიზედა'],['მაგრამ','კავშირი'],['ის','ნაცვალსახელი']];
    const [word,part]=pick(words,i);const names=['მარიამი','დავითი','ელენე','ირაკლი'];
    if(i%5===0){
      const items=['მოსწავლე','ყურადღებით','კითხულობს','საინტერესო','ტექსტს'];
      const q=mcq(`რომელი სიტყვაა ზმნა?`,'კითხულობს',['მოსწავლე','ყურადღებით','საინტერესო'],'„კითხულობს“ მოქმედებას აღნიშნავს და ზმნაა.');
      q.visual=visual('tokens','წინადადების სიტყვები: მოსწავლე ყურადღებით კითხულობს საინტერესო ტექსტს',{items,highlight:2},'გაარჩიე წინადადების წევრები');
      return meta(q,'gg',grade,i,'morphology_visual');
    }
    switch(i%8){
      case 1:return meta(mcq(`სიტყვა „${word}“ მეტყველების რომელი ნაწილია?`,part,words.filter(row=>row[1]!==part).slice(0,3).map(row=>row[1]),`„${word}“ არის ${part}.`),'gg',grade,i,'morphology');
      case 2:return meta(mcq(`წინადადებაში „${pick(names,i)} წერილს წერს“ რომელია ქვემდებარე?`,pick(names,i),['წერილს','წერს','წერილს წერს'],`ქვემდებარე ასახელებს მოქმედ პირს: ${pick(names,i)}.`),'gg',grade,i,'syntax_subject');
      case 3:return meta(fillQ(`${pick(names,i)} მეგობარს წერილს ___.`,['წერს'],`შემასმენელი „წერს“ გამოხატავს მოქმედებას.`),'gg',grade,i,'syntax_predicate');
      case 4:return meta(matchQ('დააკავშირე მეტყველების ნაწილი მაგალითთან.',[['არსებითი სახელი','სკოლა'],['ზმნა','სწავლობს'],['ზედსართავი სახელი','გონიერი']],'თითოეული მაგალითი შესაბამის მეტყველების ნაწილს ეკუთვნის.'),'gg',grade,i,'morphology_match');
      case 5:return meta(orderQ('დაალაგე სიტყვები გამართულ წინადადებად.',[pick(names,i),'ყურადღებით','კითხულობს','წიგნს'],'ქართული წინადადების ბუნებრივი რიგია: მოქმედი პირი, გარემოება, მოქმედება, ობიექტი.'),'gg',grade,i,'syntax_order');
      case 6:return meta(mcq('რომელი წინადადებაა სწორად დასმული სასვენი ნიშნით?','როდის დაიწყება გაკვეთილი?',['როდის დაიწყება გაკვეთილი.','როდის, დაიწყება გაკვეთილი!','როდის დაიწყება, გაკვეთილი.'],'კითხვითი წინადადება კითხვის ნიშნით სრულდება.'),'gg',grade,i,'punctuation');
      default:return meta(tf('რთულ წინადადებაში შეიძლება ორი ან მეტი მარტივი წინადადება გაერთიანდეს.',true,'რთული წინადადება ორი ან მეტი პრედიკატული ნაწილისგან შედგება.'),'gg',grade,i,'syntax_complex');
    }
  }

  function georgianLiterature(grade,i){
    const names=['ლიკა','ანდრია','თამარი','ნიკო','სალომე','გაბრიელი'];
    const goals=['დაზიანებული ნერგის გადარჩენა','დაკარგული წიგნის დაბრუნება','მეგობრის დახმარება','ეზოს დასუფთავება','პატარა ფრინველის დაცვა','კლასის პროექტის დასრულება'];
    const actions=['ყოველდღე ზრუნავდა','მეზობლებს დახმარება სთხოვა','საკუთარი შეცდომა აღიარა','გეგმა ეტაპებად დაყო','ინფორმაცია გადაამოწმა','საქმე მოთმინებით გააგრძელა'];
    const traits=['მზრუნველობა','პასუხისმგებლობა','გულწრფელობა','ორგანიზებულობა','ცნობისმოყვარეობა','მოთმინება'];
    const j=i%names.length,passage=`${names[j]}ს სურდა ${goals[j]}. მან ${actions[j]}. ბოლოს მიზანს მიაღწია და გამოცდილება თანაკლასელებს გაუზიარა.`;
    if(i%5===0){
      const seq=['მიზნის დასახვა','მოქმედების დაწყება','შედეგის მიღება'];
      const q=orderQ(`ტექსტის მიხედვით დაალაგე ამბის ეტაპები. ${passage}`,seq,'ამბავი იწყება მიზნით, გრძელდება მოქმედებით და სრულდება შედეგით.');
      q.visual=visual('timeline',`ამბის სამი ეტაპი: ${seq.join(', ')}`,{items:seq.map((label,k)=>({label,year:k+1}))},'ამბის სიუჟეტური ხაზი');
      return meta(q,'geo',grade,i,'narrative_sequence');
    }
    switch(i%7){
      case 1:return meta(mcq(`${passage} რომელი თვისება გამოავლინა პერსონაჟმა?`,traits[j],traits.filter((_,k)=>k!==j).slice(0,3),`პერსონაჟის მოქმედება ყველაზე პირდაპირ ${traits[j]}ს გამოხატავს.`),'geo',grade,i,'character_analysis');
      case 2:return meta(mcq(`${passage} რა არის მთავარი აზრი?`,'მიზნის მიღწევას გააზრებული მოქმედება სჭირდება',['წარმატება შემთხვევით მოდის','დახმარების თხოვნა სისუსტეა','გამოცდილების გაზიარება ზედმეტია'],'პერსონაჟი მიზანს მოქმედებით აღწევს და გამოცდილებას აზიარებს.'),'geo',grade,i,'main_idea');
      case 3:return meta(mcq(`${passage} რომელი წინადადებაა ტექსტიდან გამომდინარე დასკვნა?`,`${names[j]} მიზანდასახულია`,[`${names[j]} ხშირად ნებდება`,`${names[j]} მარტო მოგზაურობს`,`${names[j]} დავალებას არ ასრულებს`],`მიზნის მიღწევამდე გაგრძელებული მოქმედება მიზანდასახულობას აჩვენებს.`),'geo',grade,i,'inference');
      case 4:return meta(fillQ(`${passage} ტექსტის დასაწყისში პერსონაჟს ჰქონდა ___ .`,['მიზანი'],'პირველ წინადადებაში პირდაპირ არის დასახელებული მიზანი.'),'geo',grade,i,'detail_recall');
      case 5:return meta(mcq(`${passage} რომელი სათაური შეეფერება ტექსტს?`,'გზა მიზნისკენ',['შემთხვევითი დღე','დაკარგული დრო','დაუსრულებელი საუბარი'],'სათაური ტექსტის მთავარ მოქმედებასა და შედეგს აერთიანებს.'),'geo',grade,i,'title_selection');
      default:return meta(tf(`${passage} ტექსტში პერსონაჟი მიზნის მიღწევის შემდეგ გამოცდილებას სხვებს უზიარებს.`,true,'ეს ინფორმაცია ბოლო წინადადებაში პირდაპირაა მოცემული.'),'geo',grade,i,'evidence');
    }
  }

  const EN_VOCAB=[['book','წიგნი','📘'],['bird','ფრინველი','🐦'],['tree','ხე','🌳'],['water','წყალი','💧'],['school','სკოლა','🏫'],['apple','ვაშლი','🍎'],['sun','მზე','☀️'],['dog','ძაღლი','🐕']];
  function englishPrimary(grade,i){
    const [word,ka,emoji]=pick(EN_VOCAB,i);const names=['Anna','Ben','Mia','Tom'];
    if(i%5===0){
      const q=mcq(`Which English word matches the picture?`,word,EN_VOCAB.filter(row=>row[0]!==word).slice(0,3).map(row=>row[0]),`${emoji} means “${word}” in English.`);
      q.visual=visual('scene',`${ka}: ${emoji}`,{items:[emoji],label:ka},'Look at the picture and choose the word');
      return meta(q,'eng',grade,i,'visual_vocabulary');
    }
    if(grade<=2){
      switch(i%6){
        case 1:return meta(mcq(`What is “${ka}” in English?`,word,EN_VOCAB.filter(row=>row[0]!==word).slice(0,3).map(row=>row[0]),`The English word for „${ka}“ is “${word}”.`),'eng',grade,i,'vocabulary');
        case 2:return meta(fillQ(`This is a ___. (${ka})`,[word],`The missing word is “${word}”.`),'eng',grade,i,'word_completion');
        case 3:return meta(orderQ('Put the words in the correct order.',['I','like',word+'.'],'English statements usually follow subject + verb + object.'),'eng',grade,i,'sentence_order');
        case 4:return meta(mcq('Choose the correct greeting for the morning.','Good morning',['Good night','Goodbye','Thank you'],'“Good morning” is used as a morning greeting.'),'eng',grade,i,'communication');
        default:return meta(tf(`The word “${word}” means “${ka}”.`,true,`“${word}” translates as „${ka}“.`),'eng',grade,i,'vocabulary_check');
      }
    }
    const name=pick(names,i),qty=n(i+grade,2,8);
    switch(i%8){
      case 1:return meta(mcq(`${name} ___ ${qty} books.`,'has',['have','having','is'],`With he/she or a singular name, use “has”.`),'eng',grade,i,'present_simple');
      case 2:return meta(fillQ(`${name} is ___ a book now.`,['reading'],'The present continuous uses is + verb-ing.'),'eng',grade,i,'present_continuous');
      case 3:return meta(mcq(`Choose the plural form of “${word}”.`,word.endsWith('s')?word+'es':word+'s',[word+'ed',word+'ing',word],`A regular plural is formed with -s (or -es where needed).`),'eng',grade,i,'plural');
      case 4:return meta(orderQ('Put the words in the correct order.',[name,'goes','to school','every day.'],'The sentence follows subject + verb + place/time.'),'eng',grade,i,'word_order');
      case 5:return meta(matchQ('Match the words with their Georgian meanings.',EN_VOCAB.slice(i%4,i%4+3).map(row=>[row[0],row[1]]),'Each English word is paired with its Georgian meaning.'),'eng',grade,i,'vocabulary_match');
      case 6:return meta(mcq(`Read: “${name} has ${qty} books and gives one away.” How many books remain?`,qty-1,[qty,qty+1,qty-2],`${qty}−1=${qty-1}.`),'eng',grade,i,'reading_detail');
      default:return meta(tf(`“${name} goes to school every day” describes a regular action.`,true,'The present simple is used for routines.'),'eng',grade,i,'tense_meaning');
    }
  }

  function englishGrammar(grade,i){
    const subjects=['She','He','My friend','The teacher'];const verbs=[['write','wrote','written'],['read','read','read'],['go','went','gone'],['see','saw','seen']];
    const s=pick(subjects,i),v=pick(verbs,i);
    if(i%5===0){
      const items=[s,'has',v[2],'the text.'];const q=orderQ('Arrange the sentence in the correct order.',items,'The present perfect uses subject + has/have + past participle.');
      q.visual=visual('tokens',items.join(' '),{items,highlight:2},'Build the sentence from word cards');return meta(q,'eg',grade,i,'tense_structure');
    }
    switch(i%8){
      case 1:return meta(mcq(`${s} ___ the task yesterday.`,v[1],[v[0],v[2],'will '+v[0]],'“Yesterday” requires the past simple form.'),'eg',grade,i,'past_simple');
      case 2:return meta(mcq(`${s} has ___ the task.`,v[2],[v[0],v[1],v[0]+'ing'],'Present perfect uses has/have + past participle.'),'eg',grade,i,'present_perfect');
      case 3:return meta(fillQ(`If it rains, we ___ at home.`,['will stay'],'The first conditional uses if + present, will + base verb.'),'eg',grade,i,'conditional');
      case 4:return meta(mcq('Choose the sentence in the passive voice.','The letter was written by Ana.',['Ana wrote the letter.','Ana is writing the letter.','Ana will write the letter.'],'The passive focuses on the receiver: was + past participle.'),'eg',grade,i,'passive_voice');
      case 5:return meta(matchQ('Match the tense with its example.',[['Past simple','I worked yesterday.'],['Present perfect','I have worked.'],['Future simple','I will work.']],'Each example contains the form typical of its tense.'),'eg',grade,i,'tense_match');
      case 6:return meta(mcq('Choose the correct relative pronoun: “The student ___ helped me is here.”','who',['which','where','when'],'“Who” refers to a person.'),'eg',grade,i,'relative_clause');
      default:return meta(tf('The modal verb “must” can express obligation.',true,'“Must” is commonly used for strong obligation.'),'eg',grade,i,'modal_verbs');
    }
  }

  function englishLiterature(grade,i){
    const names=['Lena','Mark','Sofia','Daniel','Nora','Alex'];const goals=['restore a community garden','return a lost notebook','help a new student','finish a science model','protect a young bird','organize a reading club'];
    const actions=['made a careful plan','asked others for advice','checked the evidence','worked patiently','admitted a mistake','shared the result'];const j=i%names.length;
    const passage=`${names[j]} wanted to ${goals[j]}. ${names[j]} ${actions[j]} and continued despite a small setback. In the end, the goal was achieved and the lesson was shared with friends.`;
    if(i%5===0){const seq=['sets a goal','takes action','shares the lesson'];const q=orderQ(`Read and order the events: ${passage}`,seq,'The text moves from goal to action and then reflection.');q.visual=visual('timeline',seq.join(', '),{items:seq.map((label,k)=>({label,year:k+1}))},'Story sequence');return meta(q,'eng',grade,i,'reading_sequence');}
    switch(i%7){
      case 1:return meta(mcq(`${passage} What is the main idea?`,'Thoughtful effort helps overcome setbacks.',['Success needs no effort.','Mistakes must be hidden.','Goals should never be shared.'],'The character plans, persists and reaches the goal.'),'eng',grade,i,'main_idea');
      case 2:return meta(mcq(`${passage} Which trait best describes ${names[j]}?`,'persistent',['careless','selfish','dishonest'],'Continuing after a setback shows persistence.'),'eng',grade,i,'character_inference');
      case 3:return meta(fillQ(`${passage} The character continued despite a small ___.`,['setback'],'The word appears directly in the passage.'),'eng',grade,i,'detail');
      case 4:return meta(mcq(`${passage} Which title fits best?`,'A Goal Worth Working For',['A Day Without Plans','The Hidden Mistake','Giving Up Early'],'The title reflects the goal, effort and result.'),'eng',grade,i,'title');
      case 5:return meta(matchQ('Match the story element with its role.',[['goal',goals[j]],['action',actions[j]],['result','the goal was achieved']],'Each element is stated in the passage.'),'eng',grade,i,'story_elements');
      default:return meta(tf(`${passage} The character gives up after the setback.`,false,'The passage states that the character continued.'),'eng',grade,i,'evidence');
    }
  }

  const RU_VOCAB=[['книга','წიგნი','📘'],['школа','სკოლა','🏫'],['дерево','ხე','🌳'],['вода','წყალი','💧'],['птица','ფრინველი','🐦'],['город','ქალაქი','🏙️'],['друг','მეგობარი','🤝'],['солнце','მზე','☀️']];
  function russianQuestion(grade,i,grammarOnly){
    const [word,ka,emoji]=pick(RU_VOCAB,i);const names=['Анна','Иван','Мария','Лука'];
    if(i%5===0){const q=mcq('Какое слово соответствует изображению?',word,RU_VOCAB.filter(row=>row[0]!==word).slice(0,3).map(row=>row[0]),`${emoji} — это «${word}».`);q.visual=visual('scene',`${ka}: ${emoji}`,{items:[emoji],label:ka},'Выберите слово по изображению');return meta(q,grammarOnly?'rg':'rus',grade,i,grammarOnly?'visual_grammar':'visual_vocabulary');}
    if(grammarOnly){
      const name=pick(names,i);
      switch(i%8){
        case 1:return meta(mcq(`${name} ___ книгу каждый день.`,'читает',['читать','читаю','читали'],'С существительным в единственном числе используется форма «читает».'),'rg',grade,i,'present_tense');
        case 2:return meta(mcq('Выберите существительное.','школа',['читать','красивый','быстро'],'«Школа» называет предмет и является существительным.'),'rg',grade,i,'parts_of_speech');
        case 3:return meta(fillQ('Мы ___ в школе.',['учимся'],'С местоимением «мы» используется форма «учимся».'),'rg',grade,i,'verb_agreement');
        case 4:return meta(orderQ('Составьте предложение.',[name,'внимательно','читает','книгу.'],'Порядок слов образует грамматически правильное предложение.'),'rg',grade,i,'word_order');
        case 5:return meta(matchQ('Соотнесите часть речи и пример.',[['существительное','книга'],['глагол','читает'],['прилагательное','интересная']],'Каждое слово соответствует своей части речи.'),'rg',grade,i,'morphology_match');
        case 6:return meta(mcq('Какое предложение стоит в прошедшем времени?','Мы читали вчера.',['Мы читаем сейчас.','Мы будем читать.','Читайте текст.'],'Форма «читали» и слово «вчера» указывают на прошлое.'),'rg',grade,i,'past_tense');
        default:return meta(tf('Прилагательное обозначает признак предмета.',true,'Это основное грамматическое значение прилагательного.'),'rg',grade,i,'grammar_rule');
      }
    }
    switch(i%8){
      case 1:return meta(mcq(`Что означает слово «${word}»?`,ka,RU_VOCAB.filter(row=>row[0]!==word).slice(0,3).map(row=>row[1]),`«${word}» означает «${ka}».`),'rus',grade,i,'vocabulary');
      case 2:return meta(fillQ(`Это ___. (${ka})`,[word],`Нужное слово — «${word}».`),'rus',grade,i,'word_completion');
      case 3:return meta(orderQ('Составьте предложение.',[pick(names,i),'читает','интересную','книгу.'],'Слова образуют связное предложение.'),'rus',grade,i,'sentence_order');
      case 4:return meta(matchQ('Соотнесите слова с переводом.',RU_VOCAB.slice(i%5,i%5+3).map(row=>[row[0],row[1]]),'Каждое русское слово соединено с грузинским значением.'),'rus',grade,i,'vocabulary_match');
      case 5:return meta(mcq(`Прочитайте: «${pick(names,i)} пришёл в библиотеку и выбрал ${word}». Куда пришёл герой?`,'в библиотеку',['в школу','в парк','домой'],'Место прямо указано в предложении.'),'rus',grade,i,'reading_detail');
      case 6:return meta(mcq('Какая фраза выражает вежливую просьбу?','Пожалуйста, помогите мне.',['Дай сейчас!','Я не слушаю.','Уходи отсюда.'],'Слово «пожалуйста» и форма просьбы выражают вежливость.'),'rus',grade,i,'communication');
      default:return meta(tf(`Слово «${word}» переводится как «${ka}».`,true,`Это корректный перевод слова «${word}».`),'rus',grade,i,'vocabulary_check');
    }
  }

  const NATURE_FACTS=[
    ['მცენარეს ფოტოსინთეზისთვის სინათლე სჭირდება','სინათლე'],['წყალი 0°C-ზე იყინება','0°C'],['ფრინველებს ბუმბული აქვთ','ბუმბული'],['ძუძუმწოვრები ნაშიერს რძით კვებავენ','რძით'],['ღრუბლიდან ნალექი მოდის','ნალექი'],['ფესვი მცენარეს ნიადაგში ამაგრებს','ფესვი'],['დედამიწა მზის გარშემო მოძრაობს','მზის გარშემო'],['სუფთა წყალი ჯანმრთელობისთვის მნიშვნელოვანია','სუფთა წყალი']
  ];
  function natureQuestion(grade,i){
    const animals=[['🐕','ძაღლი','ძუძუმწოვარი'],['🐦','ბეღურა','ფრინველი'],['🐟','თევზი','თევზი'],['🦋','პეპელა','მწერი'],['🐸','ბაყაყი','ამფიბია'],['🐢','კუ','ქვეწარმავალი']];const [emoji,name,group]=pick(animals,i);
    if(i%5===0){const q=mcq('რომელ ჯგუფს ეკუთვნის გამოსახული ორგანიზმი?',group,animals.filter(row=>row[2]!==group).slice(0,3).map(row=>row[2]),`${name} არის ${group}.`);q.visual=visual('scene',`${name} ${emoji}`,{items:[emoji],label:name},'დააკვირდი ორგანიზმს');return meta(q,'nat',grade,i,'classification_visual');}
    const [fact,answer]=pick(NATURE_FACTS,i);
    switch(i%8){
      case 1:return meta(mcq(`${fact}. რომელი საკვანძო პასუხი ასრულებს წინადადებას?`,answer,NATURE_FACTS.filter(row=>row[1]!==answer).slice(0,3).map(row=>row[1]),fact+'.'),'nat',grade,i,'core_concept');
      case 2:return meta(orderQ('დაალაგე წყლის წრებრუნვის ეტაპები.',['აორთქლება','კონდენსაცია','ნალექი','წყლის დაგროვება'],'მზე აორთქლებს წყალს, ორთქლი კონდენსირდება, მოდის ნალექი და წყალი გროვდება.'),'nat',grade,i,'water_cycle');
      case 3:return meta(matchQ('დააკავშირე ორგანიზმი ჯგუფთან.',animals.slice(i%3,i%3+3).map(row=>[row[1],row[2]]),'ორგანიზმები კლასიფიცირდება საერთო ნიშნებით.'),'nat',grade,i,'classification_match');
      case 4:return meta(mcq('რომელი ქმედება იცავს გარემოს?','ნარჩენების დახარისხება',['ნარჩენის მდინარეში ჩაყრა','წყლის უმიზნოდ ხარჯვა','ტყეში ცეცხლის დაუდევრად დატოვება'],'დახარისხება ამცირებს ნარჩენს და ხელს უწყობს გადამუშავებას.'),'nat',grade,i,'environment');
      case 5:return meta(fillQ('მცენარე წყალს ძირითადად ___ საშუალებით იღებს.',['ფესვის'],'ფესვი ნიადაგიდან წყალსა და მინერალებს იწოვს.'),'nat',grade,i,'plant_structure');
      case 6:return meta(mcq('დაკვირვებისას რომელი ჩანაწერია გაზომვადი მონაცემი?','წყლის ტემპერატურაა 18°C',['წყალი სასიამოვნოა','ცა ლამაზია','ყვავილი მომწონს'],'18°C რიცხვითი, გაზომვადი მონაცემია.'),'nat',grade,i,'inquiry_data');
      default:return meta(tf('ექსპერიმენტში ერთდროულად ბევრი პირობის შეცვლა ართულებს მიზეზის დადგენას.',true,'სამართლიანი ცდისთვის უმჯობესია ერთ ჯერზე ერთი ცვლადი შეიცვალოს.'),'nat',grade,i,'fair_test');
    }
  }

  const HISTORY_EVENTS=[
    ['პირველი ოლიმპიური თამაშები',-776],['მილანის ედიქტი',313],['დასავლეთ რომის იმპერიის დაცემა',476],['თბილისის გათავისუფლება დავით IV-ის მიერ',1122],['მაგნა კარტის მიღება',1215],['კონსტანტინოპოლის დაცემა',1453],['კოლუმბის მოგზაურობა ამერიკაში',1492],['საფრანგეთის რევოლუციის დაწყება',1789],['საქართველოს ანექსია რუსეთის იმპერიის მიერ',1801],['პირველი მსოფლიო ომის დაწყება',1914],['საქართველოს დამოუკიდებლობის გამოცხადება',1918],['საქართველოს საბჭოთა ოკუპაცია',1921],['მეორე მსოფლიო ომის დაწყება',1939],['გაეროს დაარსება',1945],['საქართველოს დამოუკიდებლობის აღდგენა',1991]
  ];
  const yearLabel=year=>year<0?`${Math.abs(year)} ძვ. წ.`:String(year);
  function historyQuestion(grade,i){
    const start=grade<=8?0:grade<=10?5:9;const events=HISTORY_EVENTS.slice(start,start+6);const a=pick(events,i),b=pick(events,i+2),sorted=[a,b].sort((x,y)=>x[1]-y[1]);
    if(i%5===0){const shown=[pick(events,i),pick(events,i+1),pick(events,i+3)].sort((x,y)=>x[1]-y[1]);const q=mcq('რომელი მოვლენა მოხდა ყველაზე გვიან?',shown[2][0],[shown[0][0],shown[1][0],'არცერთი'],`${shown[2][0]} თარიღდება ${yearLabel(shown[2][1])}-ით და ჩამოთვლილთაგან ყველაზე გვიანია.`);q.visual=visual('timeline',shown.map(row=>`${row[0]} — ${yearLabel(row[1])}`).join(', '),{items:shown.map(row=>({label:row[0],year:yearLabel(row[1])}))},'წაიკითხე ისტორიული დროის ხაზი');return meta(q,'hist',grade,i,'chronology_visual');}
    switch(i%8){
      case 1:return meta(mcq(`რომელი მოხდა უფრო ადრე: ${a[0]} (${yearLabel(a[1])}) თუ ${b[0]} (${yearLabel(b[1])})?`,sorted[0][0],[sorted[1][0],'ერთდროულად მოხდა','თარიღით ვერ განვსაზღვრავთ'],`უფრო ადრეული თარიღია ${yearLabel(sorted[0][1])}.`),'hist',grade,i,'chronology');
      case 2:return meta(orderQ('დაალაგე მოვლენები ქრონოლოგიურად.',events.slice(0,4).sort((x,y)=>x[1]-y[1]).map(row=>row[0]),'ქრონოლოგიური რიგი ადრეულიდან გვიანისკენ ეწყობა.'),'hist',grade,i,'chronology_order');
      case 3:{const event=pick(events,i);const century=event[1]<0?Math.ceil(Math.abs(event[1])/100):Math.ceil(event[1]/100);return meta(mcq(`${event[0]} — ${yearLabel(event[1])}. რომელ საუკუნეს მიეკუთვნება ეს წელი?`,`${roman[century-1]||century} საუკუნე`,[`${roman[Math.max(0,century-2)]||century-1} საუკუნე`,`${roman[century]||century+1} საუკუნე`,`${century+2} საუკუნე`],`წელი ${yearLabel(event[1])} მიეკუთვნება ${century}-ე საუკუნეს.`),'hist',grade,i,'century');}
      case 4:return meta(mcq('რომელია პირველადი ისტორიული წყაროს მაგალითი?','მოვლენის მონაწილე პირის დღიური',['თანამედროვე სახელმძღვანელოს შეჯამება','მხატვრული ფილმი მოვლენაზე','სოციალური ქსელის კომენტარი'],'მონაწილის დღიური უშუალოდ ეპოქაში შექმნილი პირველადი წყაროა.'),'hist',grade,i,'source_analysis');
      case 5:return meta(matchQ('დააკავშირე წყაროს ტიპი მაგალითთან.',[['წერილობითი','წერილი'],['ნივთიერი','მონეტა'],['ზეპირი','მოგონება']],'ისტორიული წყაროები განსხვავდება მათი ფორმით.'),'hist',grade,i,'source_types');
      case 6:return meta(mcq('რომელი წინადადებაა ფაქტი და არა შეფასება?','საქართველომ დამოუკიდებლობა 1918 წლის 26 მაისს გამოაცხადა.',['ეს იყო ყველაზე ბედნიერი დღე.','ყველა მოქალაქე ერთნაირად ფიქრობდა.','ეს მოვლენა ყველა სხვაზე მნიშვნელოვანია.'],'ფაქტი შემოწმებად თარიღსა და მოვლენას ასახელებს.'),'hist',grade,i,'fact_opinion');
      default:return meta(tf('ისტორიული წყაროს ავტორის მიზნის ცოდნა გვეხმარება წყაროს მიკერძოების შეფასებაში.',true,'ავტორის მიზანი გავლენას ახდენს შერჩეულ ინფორმაციასა და ხედვაზე.'),'hist',grade,i,'source_perspective');
    }
  }

  const GEO_FACTS=[['საქართველო','თბილისი','აზია'],['საფრანგეთი','პარიზი','ევროპა'],['იაპონია','ტოკიო','აზია'],['ეგვიპტე','კაირო','აფრიკა'],['ბრაზილია','ბრაზილია','სამხრეთი ამერიკა'],['კანადა','ოტავა','ჩრდილოეთი ამერიკა'],['ავსტრალია','კანბერა','ავსტრალია და ოკეანეთი'],['არგენტინა','ბუენოს-აირესი','სამხრეთი ამერიკა']];
  function geographyQuestion(grade,i){
    const [country,capital,continent]=pick(GEO_FACTS,i);
    if(i%5===0){const labels=['A','B','C','D'],values=[n(i,20,60),n(i+1,30,70),n(i+2,25,65),n(i+3,35,55)],max=Math.max(...values),idx=values.indexOf(max);const q=mcq('კლიმატურ დიაგრამაზე რომელ თვეშია ნალექი ყველაზე მეტი?',labels[idx],labels.filter((_,j)=>j!==idx),`ყველაზე მაღალი სვეტია ${labels[idx]} — ${max} მმ.`);q.visual=visual('bars',labels.map((label,j)=>`${label}: ${values[j]} მმ`).join(', '),{labels,values,unit:'მმ'},'ნალექების დიაგრამა');return meta(q,'geog',grade,i,'climate_graph');}
    switch(i%8){
      case 1:return meta(mcq(`რომელია ${country}ს დედაქალაქი?`,capital,GEO_FACTS.filter(row=>row[1]!==capital).slice(0,3).map(row=>row[1]),`${country}ს დედაქალაქია ${capital}.`),'geog',grade,i,'political_map');
      case 2:return meta(mcq(`${country} რომელ კონტინენტზე მდებარეობს?`,continent,GEO_FACTS.filter(row=>row[2]!==continent).slice(0,3).map(row=>row[2]),`${country} მდებარეობს კონტინენტზე: ${continent}.`),'geog',grade,i,'continents');
      case 3:return meta(mcq('რომელი კოორდინატი მდებარეობს ჩრდილოეთ და აღმოსავლეთ ნახევარსფეროებში?','42° ჩ.გ., 44° ა.გ.',['42° ს.გ., 44° ა.გ.','42° ჩ.გ., 44° დ.გ.','42° ს.გ., 44° დ.გ.'],'ჩრდილოეთი განედი და აღმოსავლეთი გრძედი შესაბამის ნახევარსფეროებს ნიშნავს.'),'geog',grade,i,'coordinates');
      case 4:return meta(matchQ('დააკავშირე გეოგრაფიული ობიექტი ტიპთან.',[['მტკვარი','მდინარე'],['კავკასიონი','მთათა სისტემა'],['შავი ზღვა','ზღვა']],'ობიექტები დაჯგუფებულია გეოგრაფიული ტიპის მიხედვით.'),'geog',grade,i,'physical_features');
      case 5:return meta(orderQ('დაალაგე მასშტაბები დეტალურიდან ნაკლებად დეტალურისკენ.',['1:10 000','1:100 000','1:1 000 000'],'მცირე მნიშვნელი უფრო დეტალურ რუკას ნიშნავს.'),'geog',grade,i,'map_scale');
      case 6:return meta(mcq('რომელი ქმედება შეესაბამება მდგრად განვითარებას?','განახლებადი ენერგიის გამოყენება',['ტყის უკონტროლო გაჩეხვა','წყლის დაბინძურება','ნარჩენის დაუხარისხებლად დაყრა'],'განახლებადი ენერგია ამცირებს არაგანახლებადი რესურსების მოხმარებას.'),'geog',grade,i,'sustainability');
      default:return meta(tf('რუკის ლეგენდა გვიხსნის სიმბოლოებისა და ფერების მნიშვნელობას.',true,'ლეგენდა რუკაზე გამოყენებული ნიშნების განმარტებაა.'),'geog',grade,i,'map_reading');
    }
  }

  const BIO_FACTS=[['მიტოქონდრია','უჯრედული სუნთქვა'],['რიბოსომა','ცილის სინთეზი'],['ბირთვი','გენეტიკური ინფორმაციის შენახვა'],['ქლოროპლასტი','ფოტოსინთეზი'],['ერითროციტი','ჟანგბადის გადატანა'],['ნეირონი','ნერვული იმპულსის გადაცემა'],['ფესვი','წყლისა და მინერალების შეწოვა'],['ფოთოლი','ფოტოსინთეზის ძირითადი ადგილი']];
  function biologyQuestion(grade,i){
    const [structure,fn]=pick(BIO_FACTS,i);
    if(i%5===0){const items=[structure,fn,'ორგანიზმი'];const q=mcq('რომელი კავშირია სწორად ნაჩვენები?',`${structure} → ${fn}`,[`${fn} → ${structure}`,`${structure} → მოძრაობა`,`ორგანიზმი → ${structure}ს ფუნქცია`],`${structure}ს ფუნქციაა ${fn}.`);q.visual=visual('cards',`${structure} უკავშირდება ფუნქციას: ${fn}`,{items},'სტრუქტურისა და ფუნქციის ბარათები');return meta(q,'bio',grade,i,'structure_function_visual');}
    switch(i%9){
      case 1:return meta(mcq(`რომელი ფუნქცია აქვს სტრუქტურას „${structure}“?`,fn,BIO_FACTS.filter(row=>row[1]!==fn).slice(0,3).map(row=>row[1]),`${structure}ს ძირითადი ფუნქციაა ${fn}.`),'bio',grade,i,'structure_function');
      case 2:return meta(matchQ('დააკავშირე სტრუქტურა ფუნქციასთან.',BIO_FACTS.slice(i%5,i%5+3),'სტრუქტურის აგებულება მის ფუნქციას შეესაბამება.'),'bio',grade,i,'structure_match');
      case 3:return meta(orderQ('დაალაგე ორგანიზაციის დონეები მარტივიდან რთულისკენ.',['უჯრედი','ქსოვილი','ორგანო','ორგანოთა სისტემა','ორგანიზმი'],'უჯრედები ქმნიან ქსოვილს, ქსოვილები — ორგანოს და შემდეგ სისტემას.'),'bio',grade,i,'organization_levels');
      case 4:return meta(mcq('კვებით ჯაჭვში ბალახი → კურდღელი → მელა, რომელია პროდუცენტი?','ბალახი',['კურდღელი','მელა','ყველა მათგანი'],'მცენარე ორგანულ ნივთიერებას ფოტოსინთეზით წარმოქმნის.'),'bio',grade,i,'ecosystem');
      case 5:return meta(fillQ('დნმ-ის მონაკვეთს, რომელიც მემკვიდრეობით ნიშანს განსაზღვრავს, ___ ეწოდება.',['გენი'],'გენი დნმ-ის ფუნქციური მონაკვეთია.'),'bio',grade,i,'genetics');
      case 6:return meta(mcq('ექსპერიმენტში საკონტროლო ჯგუფი რისთვის გამოიყენება?','შედარების საფუძვლისთვის',['შედეგის წინასწარ შესაცვლელად','ყველა ცვლადის ერთდროულად შესაცვლელად','მონაცემების დასამალად'],'საკონტროლო ჯგუფი აჩვენებს, რა ხდება დამოუკიდებელი ცვლადის ზემოქმედების გარეშე.'),'bio',grade,i,'inquiry');
      case 7:return meta(mcq('რომელი ცვლილება ზრდის პოპულაციაში გენეტიკურ მრავალფეროვნებას?','მუტაცია',['ერთნაირი კლონირება','ყველა ინდივიდის გაქრობა','გარემოს უცვლელობა'],'მუტაცია ქმნის გენეტიკური ინფორმაციის ახალ ვარიანტს.'),'bio',grade,i,'evolution');
      default:return meta(tf('ანტიბიოტიკები ვირუსულ ინფექციებზე პირდაპირ არ მოქმედებს.',true,'ანტიბიოტიკები ბაქტერიულ სტრუქტურებსა და პროცესებზე მოქმედებს, ვირუსებს კი ისინი არ გააჩნიათ.'),'bio',grade,i,'health');
    }
  }

  const ELEMENTS=[['H','წყალბადი',1],['C','ნახშირბადი',12],['N','აზოტი',14],['O','ჟანგბადი',16],['Na','ნატრიუმი',23],['Mg','მაგნიუმი',24],['Cl','ქლორი',35.5],['Ca','კალციუმი',40]];
  function chemistryQuestion(grade,i){
    const [symbol,name,mass]=pick(ELEMENTS,i);
    if(i%5===0){const items=[{label:symbol,value:mass},{label:pick(ELEMENTS,i+1)[0],value:pick(ELEMENTS,i+1)[2]},{label:pick(ELEMENTS,i+2)[0],value:pick(ELEMENTS,i+2)[2]}];const max=items.reduce((a,b)=>a.value>b.value?a:b);const q=mcq('ბარათებზე რომელი ელემენტის ფარდობითი ატომური მასაა უდიდესი?',max.label,items.filter(x=>x!==max).map(x=>x.label).concat(['Fe']),`უდიდესი მოცემული მასაა ${max.value}, ელემენტი ${max.label}.`);q.visual=visual('elementCards',items.map(x=>`${x.label}: ${x.value}`).join(', '),{items},'პერიოდული სისტემის ბარათები');return meta(q,'chem',grade,i,'periodic_table_visual');}
    switch(i%9){
      case 1:return meta(mcq(`რომელი ელემენტის სიმბოლოა ${symbol}?`,name,ELEMENTS.filter(row=>row[1]!==name).slice(0,3).map(row=>row[1]),`${symbol} არის ელემენტის „${name}“ სიმბოლო.`),'chem',grade,i,'element_symbols');
      case 2:return meta(matchQ('დააკავშირე ელემენტი სიმბოლოსთან.',ELEMENTS.slice(i%5,i%5+3).map(row=>[row[1],row[0]]),'ქიმიური სიმბოლო ელემენტის საერთაშორისო აღნიშვნაა.'),'chem',grade,i,'symbol_match');
      case 3:return meta(mcq('რომელია ნაერთი?','H₂O',['O₂','N₂','Fe'],'H₂O ორი განსხვავებული ელემენტის ატომებისგან შედგება.'),'chem',grade,i,'substance_classification');
      case 4:return meta(fillQ('რეაქციის განტოლებაში 2H₂ + O₂ → ___ .',['2H₂O'],'ატომთა რაოდენობის შენარჩუნებით მიიღება 2H₂O.'),'chem',grade,i,'equation_balance');
      case 5:{const qty=n(i,2,6);return meta(calcQ(`${qty} მოლი O₂-ის მოლური მასაა 32 გ/მოლი. იპოვე მასა გრამებში.`,qty*32,`m=n×M=${qty}×32=${qty*32} გ.`,3),'chem',grade,i,'mole_calculation');}
      case 6:return meta(mcq('რომელი მოქმედებაა ლაბორატორიაში უსაფრთხო?','დამცავი სათვალის გამოყენება',['ნივთიერების გასინჯვა','რეაგენტის პირდაპირ დაყნოსვა','ნარჩენის ნიჟარაში თვითნებურად ჩაღვრა'],'სათვალე თვალებს ქიმიური შხეფებისგან იცავს.'),'chem',grade,i,'lab_safety');
      case 7:return meta(mcq('pH=3 ხსნარი არის:','მჟავა',['ნეიტრალური','ტუტე','მხოლოდ მარილი'],'pH 7-ზე ნაკლები მჟავე გარემოს ნიშნავს.'),'chem',grade,i,'acids_bases');
      default:return meta(tf('დაბალანსებულ ქიმიურ განტოლებაში თითოეული ელემენტის ატომთა რაოდენობა ორივე მხარეს ტოლია.',true,'ეს მასის შენახვის კანონის გამოხატულებაა.'),'chem',grade,i,'conservation');
    }
  }

  function physicsQuestion(grade,i){
    const seed=grade*1000+i,d=n(seed,40,180),t=pick([2,3,4,5,6],i),distance=d-d%t,m=n(seed+1,2,18),a=n(seed+2,1,8);
    if(i%5===0){const labels=['A','B','C','D'],values=[n(seed,2,12),n(seed+1,3,13),n(seed+2,4,11),n(seed+3,5,10)],max=Math.max(...values),idx=values.indexOf(max);const q=mcq('სიჩქარის დიაგრამაზე რომელი სხეული მოძრაობს ყველაზე სწრაფად?',labels[idx],labels.filter((_,j)=>j!==idx),`ყველაზე დიდი სიჩქარეა ${values[idx]} მ/წმ — სხეული ${labels[idx]}.`);q.visual=visual('bars',labels.map((label,j)=>`${label}: ${values[j]} მ/წმ`).join(', '),{labels,values,unit:'მ/წმ'},'სხეულების სიჩქარის დიაგრამა');return meta(q,'phys',grade,i,'graph_reading');}
    switch(i%10){
      case 1:return meta(calcQ(`სხეულმა ${distance} მ ${t} წამში გაიარა. იპოვე სიჩქარე მ/წმ-ში.`,distance/t,`v=s/t=${distance}/${t}=${distance/t} მ/წმ.`),'phys',grade,i,'speed');
      case 2:return meta(calcQ(`${m} კგ მასის სხეული მოძრაობს ${a} მ/წმ² აჩქარებით. იპოვე ძალა.`,m*a,`F=ma=${m}×${a}=${m*a} ნ.`),'phys',grade,i,'newton_second_law');
      case 3:{const force=n(seed,5,30),path=n(seed+1,2,12);return meta(calcQ(`${force} ნ ძალამ სხეული ${path} მ-ით გადაადგილა ძალის მიმართულებით. იპოვე მუშაობა.`,force*path,`A=Fs=${force}×${path}=${force*path} ჯ.`),'phys',grade,i,'work');}
      case 4:{const u=pick([6,12,24],i),r=pick([2,3,4,6],i);const rr=r>u?r%u||2:r;return meta(calcQ(`წრედში ძაბვაა ${u} ვ, წინაღობა — ${rr} ომი. იპოვე დენი.`,u/rr,`I=U/R=${u}/${rr}=${u/rr} ა.`),'phys',grade,i,'ohms_law');}
      case 5:return meta(matchQ('დააკავშირე სიდიდე საზომ ერთეულთან.',[['ძალა','ნიუტონი'],['ენერგია','ჯოული'],['სიმძლავრე','ვატი']],'SI სისტემაში ამ სიდიდეებს შესაბამისი ერთეულები აქვს.'),'phys',grade,i,'units_match');
      case 6:return meta(orderQ('დაალაგე ენერგიის გარდაქმნა ჰიდროელექტროსადგურში.',['წყლის პოტენციური ენერგია','წყლის კინეტიკური ენერგია','ტურბინის მექანიკური ენერგია','ელექტრული ენერგია'],'ენერგია წყლის მდებარეობიდან მოძრაობაში, შემდეგ ტურბინასა და გენერატორში გადადის.'),'phys',grade,i,'energy_transformation');
      case 7:return meta(mcq('რომელი ტალღა შეიძლება ვაკუუმში გავრცელდეს?','სინათლე',['ბგერა','წყლის ზედაპირული ტალღა','ზამბარის ტალღა'],'ელექტრომაგნიტურ ტალღას ნივთიერი გარემო არ სჭირდება.'),'phys',grade,i,'waves');
      case 8:return meta(mcq('ექსპერიმენტში გაზომვა ხუთჯერ რატომ მეორდება?','შემთხვევითი ცდომილების შესამცირებლად',['ერთეულის შესაცვლელად','შედეგის წინასწარ შესარჩევად','ყველა მონაცემის გასაუქმებლად'],'განმეორებითი გაზომვის საშუალო შემთხვევით გადახრებს ამცირებს.'),'phys',grade,i,'measurement');
      default:return meta(tf('თანაბარი სიჩქარით სწორხაზოვანი მოძრაობისას აჩქარება ნულის ტოლია.',true,'სიჩქარის სიდიდე და მიმართულება არ იცვლება, ამიტომ აჩქარება ნულია.'),'phys',grade,i,'motion_concept');
    }
  }

  function fallbackQuestion(prefix,grade,i){
    const seed=grade*100000+i;
    if(prefix==='math'){
      const a=n(seed,15,180),b=n(Math.floor(seed/3),3,37),c=n(Math.floor(seed/7),2,19);
      if(i%5===0){const labels=['A','B','C','D'],values=[a,a+b,a+b+c,a+c],max=Math.max(a,a+b,a+b+c,a+c),idx=values.indexOf(max);const q=mcq('მონაცემთა ბარათებიდან რომელს აქვს უდიდესი მნიშვნელობა?',labels[idx],labels.filter((_,j)=>j!==idx),`უდიდესი მნიშვნელობაა ${max}, ბარათი ${labels[idx]}.`);q.visual=visual('bars',labels.map((label,j)=>`${label}: ${values[j]}`).join(', '),{labels,values},'შეადარე ოთხი რიცხვითი მონაცემი');return meta(q,'math',grade,i,'logical_data_comparison');}
      return meta(mcq(`საწყობში იყო ${a+b+c} ნივთი. პირველ დღეს გაიტანეს ${b}, მეორე დღეს — ${c}. რამდენი დარჩა?`,a,[a+b,a+c,a-1],`უნდა გამოვაკლოთ ორივე რაოდენობა: ${a+b+c}−${b}−${c}=${a}.`),'math',grade,i,'multi_step_reasoning');
    }
    if(prefix==='geo'||prefix==='gg'){
      const names=['ანა','ნიკა','თამარი','ლუკა','ელენე','საბა','მარი','გიორგი'];
      const objects=['ნერგს','წიგნს','რუკას','წერილს','პროექტს','სურათს','მაკეტს','დღიურს'];
      const actions=['უვლიდა','კითხულობდა','აკვირდებოდა','წერდა','ასრულებდა','ხატავდა','აწყობდა','ავსებდა'];
      const ni=i%names.length,oi=Math.floor(i/names.length)%objects.length,ai=Math.floor(i/(names.length*objects.length))%actions.length;
      const passage=`${names[ni]} ყოველ დილით ${objects[oi]} ${actions[ai]}. საღამოს შესრულებულ საქმეს ამოწმებდა და საჭირო ცვლილებას ნიშნავდა.`;
      if(i%5===0){const items=[names[ni],'ყოველ დილით',objects[oi],actions[ai]];const q=mcq('რომელი სიტყვა გამოხატავს მოქმედებას?',actions[ai],[names[ni],objects[oi].replace(/ს$/,''),'დილით'],`მოქმედებას გამოხატავს ზმნა „${actions[ai]}“.`);q.visual=visual('tokens',items.join(', '),{items,highlight:3},'იპოვე მოქმედების აღმნიშვნელი სიტყვა');return meta(q,prefix,grade,i,'visual_language_analysis');}
      if(i%5===1)return meta(fillQ(`${names[ni]} ყოველ დილით ${objects[oi]} ___. საღამოს შესრულებულ საქმეს ამოწმებდა. ჩასვი გამოტოვებული მოქმედების სიტყვა.`,[actions[ai]],`წინადადებას აზრობრივად და გრამატიკულად ასრულებს ზმნა „${actions[ai]}“.`),prefix,grade,i,'contextual_word_completion');
      if(prefix==='gg')return meta(mcq(`${passage} რომელია პირველი წინადადების შემასმენელი?`,actions[ai],[names[ni],objects[oi].replace(/ს$/,''),'დილით'],`შემასმენელი გამოხატავს მოქმედებას: „${actions[ai]}“.`),'gg',grade,i,'syntax_in_context');
      return meta(mcq(`${passage} რომელი დასკვნა გამომდინარეობს ტექსტიდან?`,`${names[ni]} საკუთარ მუშაობას აკონტროლებს`,[`${names[ni]} საქმეს ყოველთვის ტოვებს`,`${names[ni]} შემოწმებას არასდროს აკეთებს`,`${names[ni]} დახმარებაზე უარს ამბობს`],`საღამოს შემოწმება და ცვლილების მონიშვნა თვითკონტროლს აჩვენებს.`),'geo',grade,i,'reading_inference');
    }
    if(prefix==='eng'||prefix==='eg'){
      const names=['Ava','Leo','Maya','Noah','Emma','Liam','Nina','Owen'];
      const objects=['a garden log','a library map','a science model','a reading diary','a weather chart','a class poster','a bird guide','a project plan'];
      const actions=['checked','updated','completed','reviewed','compared','organized','shared','corrected'];
      const ni=i%names.length,oi=Math.floor(i/names.length)%objects.length,ai=Math.floor(i/(names.length*objects.length))%actions.length;
      const sentence=`${names[ni]} ${actions[ai]} ${objects[oi]} and checked the result before sharing it.`;
      if(i%5===0){const items=[names[ni],actions[ai],objects[oi],'before sharing'];const q=mcq('Which word shows the completed action?',actions[ai],[names[ni],'before','sharing'],`“${actions[ai]}” is the past-tense action.`);q.visual=visual('tokens',items.join(', '),{items,highlight:1},'Identify the action word');return meta(q,prefix,grade,i,'visual_language_analysis');}
      if(i%5===1)return meta(fillQ(`${names[ni]} ___ ${objects[oi]} and checked the result before sharing it. Complete the sentence with the correct past-tense action.`,[actions[ai]],`The completed action is “${actions[ai]}”.`),prefix,grade,i,'contextual_word_completion');
      if(prefix==='eg')return meta(mcq(`${sentence} Which tense is used in “${actions[ai]}”?`,'past simple',['present simple','future simple','present continuous'],'The regular past-tense form describes a completed action.'),'eg',grade,i,'tense_in_context');
      return meta(mcq(`${sentence} Why did ${names[ni]} check the result?`,'To verify the work before sharing it.',['To hide the work.','To avoid finishing it.','To change the subject.'],'The sentence explicitly links checking with sharing the result.'),'eng',grade,i,'reading_purpose');
    }
    if(prefix==='rus'||prefix==='rg'){
      const names=['Анна','Илья','Мария','Никита','Елена','Лука','София','Давид'];
      const objects=['дневник','карту','проект','рисунок','таблицу','письмо','макет','план'];
      const actions=['проверил','обновил','завершил','исправил','сравнил','подготовил','прочитал','обсудил'];
      const ni=i%names.length,oi=Math.floor(i/names.length)%objects.length,ai=Math.floor(i/(names.length*objects.length))%actions.length;
      const action=names[ni].endsWith('а')&&actions[ai].endsWith('л')?actions[ai]+'а':actions[ai];
      const sentence=`${names[ni]} ${action} ${objects[oi]} и ещё раз проверил результат.`;
      if(i%5===0){const items=[names[ni],action,objects[oi],'результат'];const q=mcq('Какое слово обозначает действие?',action,[names[ni],objects[oi],'результат'],`Слово «${action}» обозначает действие.`);q.visual=visual('tokens',items.join(', '),{items,highlight:1},'Найдите слово-действие');return meta(q,prefix,grade,i,'visual_language_analysis');}
      if(i%5===1)return meta(fillQ(`${names[ni]} ___ ${objects[oi]} и ещё раз проверил результат. Вставьте подходящее слово-действие.`,[action],`Предложение правильно дополняет слово «${action}».`),prefix,grade,i,'contextual_word_completion');
      if(prefix==='rg')return meta(mcq(`${sentence} Какой частью речи является слово «${action}»?`,'глагол',['существительное','прилагательное','предлог'],'Слово обозначает действие и является глаголом.'),'rg',grade,i,'morphology_in_context');
      return meta(mcq(`${sentence} Что герой сделал после основной работы?`,'проверил результат',['выбросил работу','ушёл, не закончив','сменил тему'],'Действие прямо названо во второй части предложения.'),'rus',grade,i,'reading_detail');
    }
    if(prefix==='hist'){
      const pool=grade<=8?HISTORY_EVENTS.slice(0,9):grade<=10?HISTORY_EVENTS.slice(5,12):HISTORY_EVENTS.slice(9);
      const first=pick(pool,i),second=pick(pool,Math.floor(i/pool.length)+2),third=pick(pool,Math.floor(i/(pool.length*2))+4);
      const unique=[first,second,third].filter((row,index,rows)=>rows.findIndex(other=>other[0]===row[0])===index).sort((a,b)=>a[1]-b[1]);
      for(let offset=1;unique.length<3&&offset<=pool.length*2;offset++){
        const candidate=pick(pool,i+offset+3);if(!unique.some(row=>row[0]===candidate[0]))unique.push(candidate);
      }
      unique.sort((a,b)=>a[1]-b[1]);
      const q=mcq('მოცემული მოვლენებიდან რომელი მოხდა ყველაზე ადრე?',unique[0][0],[unique[1][0],unique[2][0],'ყველა ერთ წელს მოხდა'],`ყველაზე ადრეული თარიღია ${yearLabel(unique[0][1])}.`);
      if(i%5===0)q.visual=visual('timeline',unique.map(row=>`${row[0]} — ${yearLabel(row[1])}`).join(', '),{items:unique.map(row=>({label:row[0],year:yearLabel(row[1])}))},'შეადარე მოვლენების თარიღები');
      return meta(q,'hist',grade,i,'chronological_reasoning');
    }
    if(prefix==='geog'){
      const labels=['რეგიონი A','რეგიონი B','რეგიონი C','რეგიონი D'];const values=[n(seed,300,900),n(seed+7,350,950),n(seed+19,280,870),n(seed+31,400,800)];const max=Math.max(...values),idx=values.indexOf(max);
      const q=mcq('მონაცემების მიხედვით რომელ რეგიონშია წლიური ნალექი ყველაზე მეტი?',labels[idx],labels.filter((_,j)=>j!==idx),`${labels[idx]}-ში დაფიქსირებულია უდიდესი მნიშვნელობა — ${max} მმ.`);
      if(i%5===0)q.visual=visual('bars',labels.map((label,j)=>`${label}: ${values[j]} მმ`).join(', '),{labels,values,unit:'მმ'},'შეადარე წლიური ნალექის მონაცემები');
      else q.text+=` მონაცემებია: ${labels.map((label,j)=>`${label} — ${values[j]} მმ`).join('; ')}.`;
      return meta(q,'geog',grade,i,'geographic_data');
    }
    if(prefix==='nat'||prefix==='bio'){
      const labels=['ნიმუში A','ნიმუში B','ნიმუში C','ნიმუში D'];const values=[n(seed,4,18),n(seed+5,5,20),n(seed+11,3,17),n(seed+23,6,16)];const max=Math.max(...values),idx=values.indexOf(max);
      const measure=prefix==='nat'?'ნერგის სიმაღლე':'უჯრედების რაოდენობის ზრდა';
      const q=mcq(`${measure} ოთხ ერთნაირ პირობებში გაზომეს. რომელ ნიმუშშია შედეგი უდიდესი?`,labels[idx],labels.filter((_,j)=>j!==idx),`${labels[idx]}-ის მნიშვნელობაა ${max} და ის უდიდესია.`);
      if(i%5===0)q.visual=visual('bars',labels.map((label,j)=>`${label}: ${values[j]}`).join(', '),{labels,values},`შეადარე მონაცემები: ${measure}`);
      else q.text+=` მონაცემებია: ${labels.map((label,j)=>`${label} — ${values[j]}`).join('; ')}.`;
      return meta(q,prefix,grade,i,'inquiry_data_reasoning');
    }
    if(prefix==='chem'){
      const serial=Math.floor(i/4)+grade*127;
      if(i%4===1){
        const solute=5+(serial%41),water=100-solute;
        return meta(calcQ(`ხსნარი შეიცავს ${solute} გ მარილს და ${water} გ წყალს. გამოთვალე მარილის მასური წილი პროცენტებში.`,solute,`ხსნარის სრული მასაა ${solute}+${water}=100 გ; ამიტომ მასური წილია ${solute}/100×100%=${solute}%.`,3),'chem',grade,i,'solution_concentration');
      }
      if(i%4===2){
        const molecules=3+(serial%58),compound=pick([['CO₂',3],['H₂O',3],['NH₃',4],['CH₄',5]],serial),total=molecules*compound[1];
        return meta(mcq(`${molecules} მოლეკულა ${compound[0]} სულ რამდენ ატომს შეიცავს?`,total,[total-compound[1],total+compound[1],molecules],`ერთ ${compound[0]} მოლეკულაში ${compound[1]} ატომია; ამიტომ ${molecules}×${compound[1]}=${total} ატომი.`),'chem',grade,i,'particle_counting');
      }
      if(i%4===3){
        const qty=2+(serial%24),molar=pick([18,32,44,58],serial),mass=qty*molar;
        return meta(calcQ(`ნივთიერების რაოდენობაა ${qty} მოლი, ხოლო მოლური მასა — ${molar} გ/მოლი. გამოთვალე ნიმუშის მასა გრამებში.`,mass,`m=n×M=${qty}×${molar}=${mass} გ.`,3),'chem',grade,i,'molar_mass_reasoning');
      }
      const labels=['ხსნარი A','ხსნარი B','ხსნარი C','ხსნარი D'];
      const first=1+(serial%4),values=[first,5+((serial*3)%3),8+((serial*5)%3),11+((serial*7)%3)],min=Math.min(...values),idx=values.indexOf(min);
      const q=mcq('რომელ ხსნარს აქვს ყველაზე მჟავე გარემო?',labels[idx],labels.filter((_,j)=>j!==idx),`ყველაზე მცირე pH არის ${min}; ამიტომ ყველაზე მჟავეა ${labels[idx]}.`);
      if(i%5===0)q.visual=visual('bars',labels.map((label,j)=>`${label}: pH ${values[j]}`).join(', '),{labels,values,unit:'pH'},'შეადარე ხსნარების pH');
      else q.text+=` pH მონაცემებია: ${labels.map((label,j)=>`${label} — ${values[j]}`).join('; ')}.`;
      return meta(q,'chem',grade,i,'chemical_data_reasoning');
    }
    const labels=['სხეული A','სხეული B','სხეული C','სხეული D'];const times=[2,3,4,5],speeds=[n(seed,2,16),n(seed+5,3,15),n(seed+11,4,14),n(seed+17,5,13)];const distances=speeds.map((speed,j)=>speed*times[j]);const max=Math.max(...speeds),idx=speeds.indexOf(max);
    const q=mcq('მოცემული მანძილისა და დროის მიხედვით რომელი სხეული მოძრაობს ყველაზე სწრაფად?',labels[idx],labels.filter((_,j)=>j!==idx),`${labels[idx]}-ის სიჩქარეა ${distances[idx]}/${times[idx]}=${max} მ/წმ და უდიდესია.`);
    if(i%5===0)q.visual=visual('bars',labels.map((label,j)=>`${label}: ${speeds[j]} მ/წმ`).join(', '),{labels,values:speeds,unit:'მ/წმ'},'შეადარე გამოთვლილი სიჩქარეები');
    else q.text+=` მონაცემებია: ${labels.map((label,j)=>`${label} — ${distances[j]} მ, ${times[j]} წმ`).join('; ')}.`;
    return meta(q,'phys',grade,i,'motion_data_reasoning');
  }

  function build(prefix,grade,i){
    if(prefix==='math')return mathQuestion(grade,i);
    if(prefix==='geo')return grade<=6?georgianPrimary(grade,i):georgianLiterature(grade,i);
    if(prefix==='gg')return georgianGrammar(grade,i);
    if(prefix==='eng')return grade<=6?englishPrimary(grade,i):englishLiterature(grade,i);
    if(prefix==='eg')return englishGrammar(grade,i);
    if(prefix==='rus')return russianQuestion(grade,i,false);
    if(prefix==='rg')return russianQuestion(grade,i,true);
    if(prefix==='nat')return natureQuestion(grade,i);
    if(prefix==='hist')return historyQuestion(grade,i);
    if(prefix==='geog')return geographyQuestion(grade,i);
    if(prefix==='bio')return biologyQuestion(grade,i);
    if(prefix==='chem')return chemistryQuestion(grade,i);
    return physicsQuestion(grade,i);
  }

  const stats={version:'2026.07-expanded-v1',generated:0,visual:0,byPool:{}};
  const globalGeneratedKeys=new Set();
  PUBLISHED_BASES.forEach(base=>{
    const bandCode=base.match(/-(12|34|56|78|910|1112)$/)?.[1];if(!bandCode)return;
    const grades=BANDS[bandCode],prefix=base.slice(0,base.lastIndexOf('-'));
    const existing=[];let version=1;
    while(Q_POOL[`${base}-${version}`]){existing.push(...Q_POOL[`${base}-${version}`]);version++;}
    const existingKeys=new Set(existing.filter(valid).map(contentKey));
    const target=existingKeys.size,rows=[];let attempt=0;
    while(rows.length<target&&attempt<target*6+240){
      const grade=grades[attempt%grades.length];let q=build(prefix,grade,attempt+1);
      let key=contentKey(q),gradedKey=`g${grade}:${key}`;
      if(!valid(q)||existingKeys.has(key)||globalGeneratedKeys.has(gradedKey)){
        q=fallbackQuestion(prefix,grade,attempt+1);key=contentKey(q);gradedKey=`g${grade}:${key}`;
      }
      attempt++;
      if(!valid(q)||existingKeys.has(key)||globalGeneratedKeys.has(gradedKey))continue;
      rows.push(q);globalGeneratedKeys.add(gradedKey);
    }
    Q_POOL[`${base}-${version}`]=rows;
    stats.generated+=rows.length;stats.visual+=rows.filter(q=>q.visual).length;
    stats.byPool[base]={baseline:target,generated:rows.length,version:`${base}-${version}`};
  });
  root.EDUTEST_EXPANSION_STATS=stats;
})(typeof window!=='undefined'?window:globalThis);
