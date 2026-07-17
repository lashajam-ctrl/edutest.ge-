(function attachCurriculumAlignment(root){
  const VERSION='ncp-domain-alignment-2026.07';
  const OUTCOMES={
    math:{
      numbers_operations:'რიცხვებისა და მოქმედებების გამოყენება ამოცანის გადასაჭრელად',
      patterns_algebra:'კანონზომიერების, გამოსახულებისა და ალგებრული დამოკიდებულების გააზრება',
      geometry_space:'გეომეტრიული ფიგურებისა და სივრცითი მიმართებების ამოცნობა და გამოყენება',
      data_probability:'მონაცემების წაკითხვა, წარმოდგენა და ალბათური მსჯელობა',
      measurement:'სიდიდეების გაზომვა, შედარება და პრაქტიკულ ამოცანაში გამოყენება'
    },
    georgian:{
      reading:'ტექსტის გაგება, მთავარი აზრის, დეტალისა და მტკიცებულების ამოცნობა',
      language_system:'ენობრივი ფორმებისა და ლექსიკის გააზრებული გამოყენება',
      literature_culture:'ლიტერატურული ტექსტის, ავტორის, პერსონაჟისა და კულტურული კონტექსტის გააზრება',
      visual_comprehension:'ვიზუალური ინფორმაციის აღწერა, დასკვნის გამოტანა და დასაბუთება'
    },
    foreign_language:{
      reading:'უცხოურენოვანი ტექსტის ძირითადი აზრისა და ინფორმაციის გაგება',
      language_system:'ლექსიკური და გრამატიკული საშუალებების კონტექსტში გამოყენება',
      culture:'უცხო ენის კულტურული და ლიტერატურული კონტექსტის ამოცნობა'
    },
    nature:{
      inquiry:'დაკვირვება, შეკითხვის დასმა, მონაცემის გამოყენება და მტკიცებულებაზე დაფუძნებული დასკვნა',
      living_world:'ცოცხალი ორგანიზმების ნიშნების, აგებულების, სასიცოცხლო პროცესებისა და მრავალფეროვნების გააზრება',
      matter_phenomena:'ნივთიერებების, ენერგიისა და ფიზიკური მოვლენების აღწერა და შედარება',
      earth_environment:'დედამიწის, გარემოსა და ბუნებრივი ციკლების გააზრება'
    },
    history:{
      time_space:'ისტორიული დროის, ქრონოლოგიისა და სივრცის გააზრება',
      sources_interpretation:'ისტორიული წყაროს გამოყენება, განსხვავებული ინტერპრეტაციის შედარება და დასაბუთება',
      society_state:'საზოგადოების, სახელმწიფოს, პოლიტიკისა და ეკონომიკური ურთიერთობების გააზრება',
      culture_religion:'კულტურის, რელიგიისა და იდენტობის ისტორიული მნიშვნელობის გააზრება'
    },
    geography:{
      map_space:'რუკის, ადგილისა და სივრცითი მონაცემის გამოყენება',
      natural_processes:'ბუნებრივი გეოგრაფიული პროცესებისა და სისტემების ახსნა',
      population_economy:'მოსახლეობის, მეურნეობისა და სივრცითი ურთიერთკავშირების გააზრება',
      sustainability:'გარემოსდაცვითი პრობლემისა და მდგრადი განვითარების გზების შეფასება'
    },
    biology:{
      organization_processes:'ორგანიზმის აგებულებისა და სასიცოცხლო პროცესების გააზრება',
      heredity_evolution:'მემკვიდრეობის, ცვალებადობისა და ევოლუციის კანონზომიერებების გააზრება',
      ecology_biodiversity:'ბიომრავალფეროვნებისა და ეკოსისტემური ურთიერთკავშირების გააზრება',
      inquiry:'ბიოლოგიური კვლევის მონაცემის გაანალიზება და დასკვნის დასაბუთება'
    },
    chemistry:{
      substances_structure:'ნივთიერებების თვისებების, აგებულებისა და ქიმიური ბმის გააზრება',
      reactions_quantities:'ქიმიური გარდაქმნების, რაოდენობრივი მიმართებებისა და ენერგეტიკული ცვლილებების გააზრება',
      inquiry_safety:'ქიმიური კვლევის დაგეგმვა, მონაცემის გაანალიზება და უსაფრთხოების წესების გამოყენება'
    },
    physics:{
      motion_forces:'მოძრაობისა და ძალების კანონზომიერებების გამოყენება',
      energy:'ენერგიის გარდაქმნისა და შენახვის გააზრება',
      waves_fields:'ტალღების, ელექტრული და მაგნიტური მოვლენების გააზრება',
      inquiry_data:'ფიზიკური მოდელის, გაზომვისა და მონაცემის გამოყენებით დასკვნის გამოტანა'
    }
  };

  const KNOWN_REVIEW={};

  function basePool(pool){
    const value=String(pool||'');
    const versioned=value.match(/^(.*-(?:12|34|56|78|910|1112))-\d+$/);
    return versioned?versioned[1]:value;
  }
  function gradeBand(pool,grades){
    const clean=basePool(pool);const match=clean.match(/-(12|34|56|78|910|1112)$/);
    if(match){const bands={12:[1,2],34:[3,4],56:[5,6],78:[7,8],910:[9,10],1112:[11,12]};return bands[match[1]];}
    const values=(grades||[]).map(Number).filter(Number.isFinite);return values.length?[Math.min(...values),Math.max(...values)]:[1,12];
  }
  function areaFor(pool){
    const p=basePool(pool);
    if(p.startsWith('math-'))return'math';
    if(p.startsWith('geo-')||p.startsWith('gg-'))return'georgian';
    if(p.startsWith('eng-')||p.startsWith('eg-')||p.startsWith('rus-')||p.startsWith('rg-'))return'foreign_language';
    if(p.startsWith('nat-'))return'nature';
    if(p.startsWith('hist-'))return'history';
    if(p.startsWith('geog-'))return'geography';
    if(p.startsWith('bio-'))return'biology';
    if(p.startsWith('chem-'))return'chemistry';
    if(p.startsWith('phys-'))return'physics';
    return'nature';
  }
  function pick(test,values,fallback){for(const row of values)if(row[0].test(test))return[row[1],.9];return[fallback,.74];}
  function domainFor(question,pool,area){
    const p=basePool(pool),text=String(question.text||'').toLocaleLowerCase('ka-GE');
    if(area==='math')return pick(text,[
      [/(განტოლ|ფუნქცი|ალგებრ|პროგრესი|ლოგარით|ხარისხ|გამოსახულ|კანონზომ)/,'patterns_algebra'],
      [/(სამკუთხედ|კვადრატ|მართკუთხედ|წრე|კუთხ|ფიგურ|პერიმეტრ|ფართობ|მოცულობ|კოორდინატ|ვექტორ|გეომეტრ)/,'geometry_space'],
      [/(ცხრილ|დიაგრამ|მონაცემ|საშუალო|მედიან|ალბათ|სტატისტ)/,'data_probability'],
      [/(სანტიმეტრ|მეტრ|კილოგრამ|ლიტრ|საათ|წუთ|სიჩქარ|გაზომ)/,'measurement']
    ],'numbers_operations');
    if(area==='georgian'){
      if(question.media)return['visual_comprehension',.96];
      if(p.startsWith('gg-')||/(ზმნ|არსებით|ზედსართავ|ბრუნვ|წინადადებ|მართლწერ|სინონიმ|ანტონიმ|ლექსიკ)/.test(text))return['language_system',.94];
      if(/(ავტორ|პერსონაჟ|ლექს|მოთხრობ|რომან|პოემ|ლიტერატ)/.test(text))return['literature_culture',.9];
      return['reading',.78];
    }
    if(area==='foreign_language'){
      if(p.startsWith('eg-')||p.startsWith('rg-')||/(grammar|tense|article|preposition|verb|noun|adjective|глагол|падеж|предлог)/i.test(text))return['language_system',.94];
      if(/(author|character|story|poem|novel|автор|герой|рассказ|стих)/i.test(text))return['culture',.88];
      return['reading',.78];
    }
    if(area==='nature')return pick(text,[
      [/(ცხოველ|ფრინველ|მწერ|მცენარ|ორგანიზმ|სხეულ|ორგან|უჯრედ|ბიო)/,'living_world'],
      [/(წყალ|ნივთიერ|ენერგ|ძალ|სინათლ|ბგერ|ტემპერატურ|მაგნიტ)/,'matter_phenomena'],
      [/(დედამიწ|მზე|მთვარ|პლანეტ|ამინდ|კლიმატ|გარემო|ნიადაგ)/,'earth_environment'],
      [/(დაკვირვ|ექსპერიმენტ|მტკიცებულ|დასკვნ|გაზომ)/,'inquiry']
    ],'inquiry');
    if(area==='history')return pick(text,[
      [/(წელი|საუკუნ|ქრონოლოგ|თარიღ|ეპოქ|როდის)/,'time_space'],
      [/(წყარო|მტკიცებულ|ინტერპრეტ|დოკუმენტ|მემატიან)/,'sources_interpretation'],
      [/(კულტურ|რელიგ|ეკლესი|წიგნ|ხელოვნ|ტრადიცი)/,'culture_religion']
    ],'society_state');
    if(area==='geography')return pick(text,[
      [/(რუკ|კოორდინატ|განედ|გრძედ|მასშტაბ|მდებარეობ)/,'map_space'],
      [/(კლიმატ|რელიეფ|მდინარ|ოკეან|ქან|ატმოსფერ|ტექტონ)/,'natural_processes'],
      [/(მოსახლ|მიგრაცი|მეურნ|ეკონომ|ქალაქ|ინდუსტრ)/,'population_economy'],
      [/(მდგრად|დაბინძურ|გარემოსდაც|რესურს)/,'sustainability']
    ],'map_space');
    if(area==='biology')return pick(text,[
      [/(გენ|მენდელ|მემკვიდრ|დნმ|ევოლუც|მუტაცი)/,'heredity_evolution'],
      [/(ეკოსისტემ|კვებითი|ბიომრავალ|პოპულაცი|ენდემ|ინვაზიურ)/,'ecology_biodiversity'],
      [/(ექსპერიმენტ|კვლევ|მონაცემ|ჰიპოთეზ|მიკროსკოპ)/,'inquiry']
    ],'organization_processes');
    if(area==='chemistry')return pick(text,[
      [/(რეაქცი|მოლ|სტექიომეტრ|ტოლობ|ოქსიდ|მჟავ|ტუტ|ენერგ)/,'reactions_quantities'],
      [/(უსაფრთხო|ექსპერიმენტ|ლაბორატორ|გაზომ|ინდიკატორ)/,'inquiry_safety']
    ],'substances_structure');
    if(area==='physics')return pick(text,[
      [/(მოძრაობ|სიჩქარ|აჩქარ|ძალ|ნიუტონ|იმპულს|წნევ)/,'motion_forces'],
      [/(ენერგ|მუშაობ|სიმძლავრ|სითბ|თერმო)/,'energy'],
      [/(ტალღ|ბგერ|სინათლ|ელექტრ|მაგნიტ|ოპტიკ)/,'waves_fields']
    ],'inquiry_data');
    return['inquiry',.6];
  }
  function cognitiveLevel(question){
    const text=String(question.text||'').toLocaleLowerCase('ka-GE');
    if(question.type==='match'||question.type==='order'||question.type==='fill'||question.type==='calc')return'application';
    if(/(რატომ|დაასაბუთ|შეადარ|დასკვნ|მტკიცებულ|როგორ შეიცვლ|გამოთვალ|გაანალიზ)/.test(text)||Number(question.pts)>=3)return'analysis';
    if(/(გამოიყენ|იპოვ|რამდენ|რომელი მოქმედებ|ამოხსნ)/.test(text)||Number(question.pts)>=2)return'application';
    return'recall';
  }
  function infer(question,context){
    const pool=context&&context.pool||question._sourcePoolKey||question.poolKey||'';
    const band=gradeBand(pool,context&&context.grades);const area=areaFor(pool);const picked=domainFor(question,pool,area);
    const domain=picked[0],confidence=picked[1];const flags=[];const clean=basePool(pool);
    if(!question.explain)flags.push('missing_author_explanation');
    if(question.type==='true_false')flags.push('low_depth_binary_format');
    const stem=String(question.text||'').trim();
    if(!question.media&&(stem.endsWith(':')||(stem.length<12&&!/[?!.]$/.test(stem))))flags.push('short_or_fragmented_stem');
    if(Array.isArray(question.opts)&&question.opts.some(option=>/(ბოდვ|არ ვიცი|ყველა პასუხი სწორია|არცერთი პასუხი)/i.test(String(option))))flags.push('weak_or_nonacademic_distractor');
    if(KNOWN_REVIEW[question.id])flags.push('known_content_quality_issue');
    const stageMismatch=clean.startsWith('hist-')&&band[1]<7;
    const unpublishedPool=!!(context&&context.hasPublishedTest===false);
    const outcomeId=question.outcome||`NCP.${area.toUpperCase()}.${band[0]}-${band[1]}.${domain.toUpperCase()}`;
    let reviewStatus='candidate_domain_alignment';
    if(unpublishedPool)reviewStatus='blocked_unpublished_pool';
    else if(stageMismatch)reviewStatus='blocked_curriculum_stage';
    else if(KNOWN_REVIEW[question.id]||flags.includes('weak_or_nonacademic_distractor'))reviewStatus='review_required';
    else if(question.outcome&&question.skill&&question.explain)reviewStatus='approved_explicit_alignment';
    return{
      frameworkVersion:VERSION,source:'საქართველოს ეროვნული სასწავლო გეგმის საგნობრივი სფეროები',
      sourceUrl:'https://mes.gov.ge/content.php?id=12552',
      area,domain,gradeMin:band[0],gradeMax:band[1],outcomeId,
      outcomeLabel:OUTCOMES[area][domain],alignmentType:question.outcome?'explicit_result_code':'domain_level_candidate',
      confidence,reviewStatus,cognitiveLevel:cognitiveLevel(question),qualityFlags:flags,
      exactGradeVerified:Number(question.gradeMin)===Number(question.gradeMax)&&Number.isFinite(Number(question.gradeMin)),
      reviewNote:unpublishedPool?'კითხვების აუზი არც ერთ მოქმედ ტესტზე არ არის მიბმული':stageMismatch?'საგანი/კლასი სამინისტროს მიმდინარე თანმიმდევრობას არ ემთხვევა':KNOWN_REVIEW[question.id]||null
    };
  }
  root.CURRICULUM_ALIGNMENT={version:VERSION,outcomes:OUTCOMES,basePool,gradeBand,areaFor,infer};
})(typeof window!=='undefined'?window:globalThis);
