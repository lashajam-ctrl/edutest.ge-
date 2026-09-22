// ===== I18N =====
let LANG='ka';
let _lastResult=null;
const I18N={
  ka:{
    freeze_confirm:'გამოიყენო Streak Freeze?',class_lb:'კლასი',national_lb:'ეროვნული',
    login:'შესვლა',register:'რეგისტრაცია',logout:'გასვლა',
    email:'ელ-ფოსტა',password:'პაროლი',name:'სახელი',grade:'კლასი',subject:'საგანი',
    start_test:'ტესტის დაწყება',submit:'გაგზავნა',back:'უკან',next:'შემდეგი',prev:'წინა',
    question:'კითხვა',of:'/',score:'ქულა',result:'შედეგი',
    passed:'✅ ჩაბარდა',failed:'❌ ვერ ჩაბარდა',failed_short:'ვერ ჩავაბარე',time_left:'დარჩ. დრო',min:'წთ',
    all_subjects:'ყველა საგანი',all_grades:'ყველა კლასი',
    math:'მათემატიკა',georgian:'ქართული',english:'ინგლისური',russian:'რუსული',nature:'ბუნება',
    attempts:'მცდ.',questions:'კ.',minutes:'წთ',
    my_results:'ჩემი შედეგები',no_results:'შედეგები არ მოიძებნა',
    correct:'სწორი',wrong:'მცდარი',true_ans:'✅ სწორია',false_ans:'❌ მცდარია',
    congrats_100:'🎉 გილოცავ! 100% გაქვს! შესანიშნავია!',
    congrats_pass:'გილოცავ! ჩაბარდა!',sorry_fail:'სამწუხაროდ, ვერ ჩაბარდა. სცადე ახლიდან!',
    admin_panel:'ადმინ პანელი',students:'მოსწავლეები',tests:'ტესტები',
    welcome:'მოგესალმებით',available_tests:'ხელმისაწვდომი ტესტები',history:'ისტორია',geography:'გეოგრაფია',biology:'ბიოლოგია',chemistry:'ქიმია',physics:'ფიზიკა',geo_lit:'ქართული ლიტ.',geo_lang:'ქართული ენა',eng_lit:'ინგლ. ლიტ.',eng_gram:'ინგლ. გრამ.',rus_gram:'რუს. გრამ.',sem1:'I სემ.',sem2:'II სემ.',all_sems:'ყველა სემ.',semester_label:'სემ.',test_mid:'შუალედური',test_sum:'შემაჯამებელი',all_types:'ყველა სახეობა',stat_today:'დღეს გავლილი ტესტი',stat_teacher_sat:'მასწავლებლის კმაყოფილება',profile:'პროფილი',my_tests:'ჩემი ტესტები',
    fill_all:'შეავსეთ ყველა ველი',invalid_email:'ელ-ფოსტა არასწორია',
    short_pass:'პაროლი მინ. 6 სიმბოლო',already_exists:'ეს ელ-ფოსტა უკვე დარეგისტრირებულია',
    not_found:'მომხმარებელი ვერ მოიძებნა',wrong_pass:'პაროლი არასწორია',no_tests:'ტესტები ვერ მოიძებნა',
    ver_badge:'ვ.',paid:'ფასიანი',test_complete:'ტესტი დასრულდა',
    your_score:'შენი ქულა',max_score:'მაქს. ქულა',percentage:'პროცენტი',
    pass_threshold:'გასავლელი ბარიერი 60%',skipped:'გამოტოვებული',
    grade_1:'I კლ.',grade_2:'II კლ.',grade_3:'III კლ.',grade_4:'IV კლ.',
    grade_5:'V კლ.',grade_6:'VI კლ.',grade_7:'VII კლ.',grade_8:'VIII კლ.',
    grade_9:'IX კლ.',grade_10:'X კლ.',grade_11:'XI კლ.',grade_12:'XII კლ.',
    hero_badge:'🇬🇪 ქართული სკოლებისთვის',
    platform_stats:'პლატფორმის სტატისტიკა',
    hero_h1:'სატესტო პლატფორმა',
    hero_h1b:'ახალი თაობისთვის',
    hero_desc:'შეამოწმე ცოდნა, მიიღე მიღწევის ბეიჯები და თვალყური ადევნე პროგრესს — I–XII კლასებისთვის.',
    hero_cta:'▶ დაწყება — უფასოდ',
    leaderboard:'ლიდერბორდი',rank:'ადგილი',class_lb:'კლასი',national_lb:'ეროვნული',
    streak_label:'Streak',daily_challenge:'დღის გამოწვევა',daily_bonus:'2× XP ბონუსი',
    daily_done:'დღეს დასრულებული ✓',prizes_title:'🎁 ჯილდოები',prize_period:'პერიოდი',
    prize_cond:'პირობა',subject_mastery:'საგნის დაუფლება',mastery_label:'ტესტი ჩაბარებული',
    study_tip:'სწავლის რჩევა',correct_ans_was:'სწორი პასუხი იყო',
    review_topic:'გაიმეორე ეს თემა სახელმძღვანელოდან.',
    new_achievement:'ახალი მიღწევა!',prize_active:'🏆 აქტიური კონკურსი',
    hero_demo:'👁 Demo ნახვა',
    stat_subject:'საგანი',stat_grade:'კლასი',stat_question:'კითხვა',stat_auto:'შეფასება',
    stat_auto_big:'ავტო',
    login_subtitle:'სკოლის სატესტო პლატფორმა',
    role_label:'როლი',
    student_role:'მოსწავლე',
    teacher_role:'მასწავლებელი',
    admin_role:'ადმინი',
    surname:'გვარი',
    teacher_note:'⚠️ მასწავლებლის ანგარიში ადმინის დამტკიცებას საჭიროებს.',
    demo_mode:'Demo რეჟიმი:',
    email_ph:'თქვენი ელ-ფოსტა',
    password_ph:'პაროლი',
    name_ph:'სახელი',
    surname_ph:'გვარი',
    adm_dashboard:'🏠 მთავარი',
    adm_schools:'🏫 სკოლები',
    adm_users:'👥 მომხმარებლები',
    adm_pending:'⚠️ დამტკიცება',
    completed_tests:'დასრულებული ტესტი',
    avg_score:'საშუალო ქულა',
    total_pts_label:'სულ ქულა',
    excellent_badge:'შესანიშნავი შედეგი',
    recent_results:'🏆 ბოლო შედეგები',
    no_test_taken:'ჯერ ტესტი არ გაქვს გავლილი',
    exit_test:'← გასვლა',edit_questions:'კითხვების რედ.',
    exit_test_confirm:'ტესტიდან გახვიდეთ? შევსებული პასუხები შენახულია და ტესტის გაგრძელებას მოგვიანებით შეძლებთ.',
    back_to_tests:'← ტესტები',
    profile_settings:'⚙️ პარამეტრები',
    new_password:'ახალი პაროლი',
    change_pass_ph:'შეცვალეთ პაროლი',
    save_profile:'💾 შენახვა',
    adm_settings:'⚙️ პარამეტრები',
    adm_role_label:'ადმინი',
    adm_subtitle:'ადმინ · პლატფორმის ადმინისტრატორი',
    adm_stat_schools:'სკოლა',
    adm_stat_users:'მომხმარებელი',
    adm_stat_tests:'სულ ტესტი',
    adm_pending_teachers:'🔴 დასამტკიცებელი მასწავლებლები',
    adm_approve:'✓ დამტკიცება',
    adm_reject:'✗ უარი',
    adm_schools_title:'სკოლები',
    adm_add_school:'+ სკოლის დამატება',
    adm_th_school:'სკოლა',
    adm_th_teach:'მასწ.',
    adm_th_stud:'მოსწ.',
    adm_th_tests:'ტესტი',
    adm_th_act:'ქმ.',
    adm_users_title:'მომხმარებლები',
    adm_search:'🔍 ძებნა...',
    adm_status:'სტატუსი',
    adm_awaiting:'⏳ დამტკიცების მოლოდინში',
    how_title:'📋 როგორ მუშაობს?',
    step1_title:'დარეგისტრირდი',
    step1_desc:'შექმენი ანგარიში — უფასოდ',
    step2_title:'აირჩიე ტესტი',
    step2_desc:'ასაკის მიხედვით ტესტები',
    step3_title:'მიიღე შედეგი',
    step3_desc:'ავტომატური შეფასება',
    feat1_title:'ონლაინ ტესტები',
    feat1_desc:'მასწავლებლები ქმნიან ტესტებს, მოსწავლეები ასრულებენ ბრაუზერში',
    feat2_title:'ავტო-შეფასება',
    feat2_desc:'MCQ და True/False ავტომატურად ფასდება, შედეგი — დაუყოვნებლივ',
    feat3_title:'ანალიტიკა',
    feat3_desc:'კლასის, მოსწავლის და საგნის მიხედვით დეტალური სტატისტიკა',
    feat4_title:'ბეიჯები',
    feat4_desc:'შესანიშნავი, კარგი და ჩაბარებული შედეგები — მოტივაციისთვის',
    plans_title:'გეგმები',
    plans_sub:'BOG Pay / TBC Pay-ით — ლარით',
    plan_free:'უფასო',
    plan_popular:'პოპულარული',
    plan_b1:'✓ 5 ტესტი/თვე',
    plan_b2:'✓ 30 მოსწავლე',
    plan_b3:'✓ MCQ & True/False',
    plan_p1:'✓ შეუზღუდავი ტესტი',
    plan_p2:'✓ 200 მოსწავლე',
    plan_p3:'✓ ყველა ტიპი + ანალიტიკა',
    plan_s1:'✓ მთელი სკოლა',
    plan_s2:'✓ შეუზღუდავი ყველაფერი',
    plan_s3:'✓ API + ინტეგრაცია',
    btn_start:'დაწყება',
    btn_sub:'გამოწერა',
    footer:'© 2026 EduTest.ge · ყველა უფლება დაცულია',
    q_review:'📋 კითხვების განხილვა',
    your_ans:'თქვ.',
    correct_ans:'სწ.',
    pending_pts:'⏳ pending',
    enter_number_ans:'ჩაწერეთ რიცხვითი პასუხი',
    drag_to_order:'გადააადგილეთ სწორი თანმიმდ.',
    test_done:'ტესტი დასრულდა!',
    bravo_perfect:'ბრავო! სრულყოფილი შედეგი!',
    bravo_msg:'შენ გამოჩენილი ხარ! ყველა კითხვა სწორად გაიხადე — ეს დიდი მიღწევაა! 🌟✨',
    q_label:'კ.',
    pts_label:'ქ.',
    class_label:'კლასი',
    student_label:'მოსწავლე',
    hello_label:'👋 გამარჯობა',
    no_test_taken:'ჯერ ტესტი არ გაქვს გავლილი',
    tests_label:'ტესტები',
    grade_label_roman:'ტესტები (I–XII კლასი)',
    test_not_found:'ტესტი ვერ მოიძებნა',
    results_label:'ჩემი შედეგები',
    no_result_taken:'ჯერ ტესტი არ გაქვს გავლილი',
    ver_label:'ვ.',
    min_abbr:'წთ',
    att_abbr:'მცდ.',
    try_again:'კიდევ ერთხელ',
    teacher_label:'მასწავლებელი',
    summary_label:'შეჯამება',
    short_ans_teacher:'მასწ. ამოწმებს',
    enter_ans:'შეიყვანეთ პასუხი...',
    your_ans_label:'თქვ.:',
    correct_short:'სწ:',
    q_num_label:'კ.',
    progress_label:'პროგრესი:',
  },
  en:{
    platform_stats:'Platform Statistics',class_lb:'Class',national_lb:'National',freeze_confirm:'Use Streak Freeze?',
    login:'Log In',register:'Register',logout:'Log Out',
    email:'Email',password:'Password',name:'Name',grade:'Grade',subject:'Subject',
    start_test:'Start Test',submit:'Submit',back:'Back',next:'Next',prev:'Previous',
    question:'Question',of:'of',score:'Score',result:'Result',
    passed:'✅ Passed',failed:'❌ Failed',failed_short:'Failed',time_left:'Time Left',min:'min',
    all_subjects:'All Subjects',all_grades:'All Grades',
    math:'Mathematics',georgian:'Georgian',english:'English',russian:'Russian',nature:'Science',
    attempts:'att.',questions:'q.',minutes:'min',
    my_results:'My Results',no_results:'No results found',
    correct:'Correct',wrong:'Wrong',true_ans:'✅ True',false_ans:'❌ False',
    congrats_100:'🎉 Congratulations! 100%! Outstanding!',
    congrats_pass:'Congratulations! You passed!',sorry_fail:'Sorry, not passed. Try again!',
    admin_panel:'Admin Panel',students:'Students',tests:'Tests',
    welcome:'Welcome',available_tests:'Available Tests',history:'History',geography:'Geography',biology:'Biology',chemistry:'Chemistry',physics:'Physics',geo_lit:'Georgian Lit.',geo_lang:'Georgian Lang.',eng_lit:'English Lit.',eng_gram:'English Grammar',rus_gram:'Russian Grammar',sem1:'Sem. I',sem2:'Sem. II',all_sems:'All semesters',semester_label:'Sem.',test_mid:'Midterm',test_sum:'Final',all_types:'All types',stat_today:'Tests today',stat_teacher_sat:'Teacher satisfaction',profile:'Profile',my_tests:'My Tests',
    fill_all:'Please fill in all fields',invalid_email:'Invalid email address',
    short_pass:'Password min. 6 characters',already_exists:'Email already registered',
    not_found:'User not found',wrong_pass:'Incorrect password',no_tests:'No tests found',
    ver_badge:'v.',paid:'Paid',test_complete:'Test Complete',
    your_score:'Your Score',max_score:'Max Score',percentage:'Percentage',
    pass_threshold:'Pass threshold: 60%',skipped:'Skipped',
    grade_1:'Gr.1',grade_2:'Gr.2',grade_3:'Gr.3',grade_4:'Gr.4',
    grade_5:'Gr.5',grade_6:'Gr.6',grade_7:'Gr.7',grade_8:'Gr.8',
    grade_9:'Gr.9',grade_10:'Gr.10',grade_11:'Gr.11',grade_12:'Gr.12',
    hero_badge:'🇬🇧 For Georgian Schools',
    hero_h1:'Testing Platform',
    hero_h1b:'for the New Generation',
    hero_desc:'Test your knowledge, earn the 🏆 Excellent badge and become the best in class! Grades 1–12 · 10 subjects · instant results.',
    hero_cta:'▶ Start — Free',
    leaderboard:'Leaderboard',rank:'Rank',class_lb:'Class',national_lb:'National',
    streak_label:'Streak',daily_challenge:'Daily Challenge',daily_bonus:'2× XP Bonus',
    daily_done:'Done today ✓',prizes_title:'🎁 Prizes',prize_period:'Period',
    prize_cond:'Condition',subject_mastery:'Subject Mastery',mastery_label:'tests completed',
    study_tip:'Study Tip',correct_ans_was:'The correct answer was',
    review_topic:'Review this topic in your textbook.',
    new_achievement:'New Achievement!',prize_active:'🏆 Active Contest',
    hero_demo:'👁 View Demo',
    stat_subject:'subjects',stat_grade:'grades',stat_question:'questions',stat_auto:'auto-grade',
    stat_auto_big:'Auto',
    login_subtitle:'School Testing Platform',
    role_label:'Role',
    student_role:'Student',
    teacher_role:'Teacher',
    admin_role:'Admin',
    surname:'Surname',
    teacher_note:'⚠️ Teacher account requires admin approval.',
    demo_mode:'Demo mode:',
    email_ph:'Your email',
    password_ph:'Password',
    name_ph:'First name',
    surname_ph:'Last name',
    adm_dashboard:'🏠 Dashboard',
    adm_schools:'🏫 Schools',
    adm_users:'👥 Users',
    adm_pending:'⚠️ Pending',
    completed_tests:'Completed Tests',
    avg_score:'Avg Score',
    total_pts_label:'Total Points',
    excellent_badge:'Excellent Badges',
    recent_results:'🏆 Recent Results',
    no_test_taken:'No tests taken yet',
    exit_test:'← Exit Test',edit_questions:'Edit Questions',
    exit_test_confirm:'Exit the test? Your answers are saved and you can continue later.',
    back_to_tests:'← Tests',
    profile_settings:'⚙️ Settings',
    new_password:'New Password',
    change_pass_ph:'Change password',
    save_profile:'💾 Save',
    adm_settings:'⚙️ Settings',
    adm_role_label:'Admin',
    adm_subtitle:'Admin · Platform Administrator',
    adm_stat_schools:'Schools',
    adm_stat_users:'Users',
    adm_stat_tests:'Total Tests',
    adm_pending_teachers:'🔴 Teachers Awaiting Approval',
    adm_approve:'✓ Approve',
    adm_reject:'✗ Reject',
    adm_schools_title:'Schools',
    adm_add_school:'+ Add School',
    adm_th_school:'School',
    adm_th_teach:'Teach.',
    adm_th_stud:'Stud.',
    adm_th_tests:'Tests',
    adm_th_act:'Act.',
    adm_users_title:'Users',
    adm_search:'🔍 Search...',
    adm_status:'Status',
    adm_awaiting:'⏳ Awaiting Approval',
    how_title:'📋 How does it work?',
    step1_title:'Register',
    step1_desc:'Create an account — for free',
    step2_title:'Choose a test',
    step2_desc:'Tests filtered by your grade',
    step3_title:'Get your result',
    step3_desc:'Automatic grading',
    feat1_title:'Online Tests',
    feat1_desc:'Teachers create tests, students complete them in the browser',
    feat2_title:'Auto-grading',
    feat2_desc:'MCQ and True/False are graded automatically — instant results',
    feat3_title:'Analytics',
    feat3_desc:'Detailed statistics by class, student and subject',
    feat4_title:'Badges',
    feat4_desc:'Excellent, Good, Pass — for motivation',
    plans_title:'Plans',
    plans_sub:'BOG Pay / TBC Pay — in GEL',
    plan_free:'Free',
    plan_popular:'Popular',
    plan_b1:'✓ 5 tests/month',
    plan_b2:'✓ 30 students',
    plan_b3:'✓ MCQ & True/False',
    plan_p1:'✓ Unlimited tests',
    plan_p2:'✓ 200 students',
    plan_p3:'✓ All types + analytics',
    plan_s1:'✓ Whole school',
    plan_s2:'✓ Everything unlimited',
    plan_s3:'✓ API + integration',
    btn_start:'Get Started',
    btn_sub:'Subscribe',
    footer:'© 2026 EduTest.ge · All rights reserved',
    q_review:'📋 Question Review',
    your_ans:'Ans.',
    correct_ans:'Corr.',
    pending_pts:'⏳ pending',
    enter_number_ans:'Enter a numeric answer',
    drag_to_order:'Drag to correct order',
    test_done:'Test Complete!',
    bravo_perfect:'Perfect Score!',
    bravo_msg:'Outstanding! You answered every question correctly — a great achievement! 🌟✨',
    q_label:'q.',
    pts_label:'pts',
    class_label:'Class',
    student_label:'Student',
    hello_label:'👋 Hello',
    no_test_taken:'No tests taken yet',
    tests_label:'Tests',
    grade_label_roman:'Tests (Gr. 1–12)',
    test_not_found:'No tests found',
    results_label:'My Results',
    no_result_taken:'No tests taken yet',
    ver_label:'v.',
    min_abbr:'min',
    att_abbr:'att.',
    try_again:'Try Again',
    teacher_label:'Teacher',
    summary_label:'Summary',
    short_ans_teacher:'Teacher reviews',
    enter_ans:'Enter your answer...',
    your_ans_label:'Your ans:',
    correct_short:'Correct:',
    q_num_label:'Q.',
    progress_label:'Progress:',
  },
  ru:{
    platform_stats:'Статистика платформы',class_lb:'Класс',national_lb:'Национальный',freeze_confirm:'Использовать Streak Freeze?',
    login:'Войти',register:'Регистрация',logout:'Выйти',
    email:'Эл. почта',password:'Пароль',name:'Имя',grade:'Класс',subject:'Предмет',
    start_test:'Начать тест',submit:'Отправить',back:'Назад',next:'Далее',prev:'Назад',
    question:'Вопрос',of:'из',score:'Баллы',result:'Результат',
    passed:'✅ Сдано',failed:'❌ Не сдано',failed_short:'Не сдано',time_left:'Осталось',min:'мин',
    all_subjects:'Все предметы',all_grades:'Все классы',
    math:'Математика',georgian:'Грузинский',english:'Английский',russian:'Русский',nature:'Естествознание',
    attempts:'поп.',questions:'воп.',minutes:'мин',
    my_results:'Мои результаты',no_results:'Результаты не найдены',
    correct:'Верно',wrong:'Неверно',true_ans:'✅ Верно',false_ans:'❌ Неверно',
    congrats_100:'🎉 Поздравляем! 100%! Отлично!',
    congrats_pass:'Поздравляем! Тест сдан!',sorry_fail:'К сожалению, не сдан. Попробуйте ещё раз!',
    admin_panel:'Панель администратора',students:'Ученики',tests:'Тесты',
    welcome:'Добро пожаловать',available_tests:'Доступные тесты',history:'История',geography:'География',biology:'Биология',chemistry:'Химия',physics:'Физика',geo_lit:'Груз. лит.',geo_lang:'Груз. язык',eng_lit:'Англ. лит.',eng_gram:'Англ. грамм.',rus_gram:'Рус. грамм.',sem1:'Сем. I',sem2:'Сем. II',all_sems:'Все сем.',semester_label:'Сем.',test_mid:'Промежуточный',test_sum:'Итоговый',all_types:'Все типы',stat_today:'Тестов сегодня',stat_teacher_sat:'Доволен учитель',profile:'Профиль',my_tests:'Мои тесты',
    fill_all:'Заполните все поля',invalid_email:'Неверный адрес эл. почты',
    short_pass:'Пароль мин. 6 символов',already_exists:'Email уже зарегистрирован',
    not_found:'Пользователь не найден',wrong_pass:'Неверный пароль',no_tests:'Тесты не найдены',
    ver_badge:'в.',paid:'Платно',test_complete:'Тест завершён',
    your_score:'Ваш результат',max_score:'Макс. балл',percentage:'Процент',
    pass_threshold:'Порог сдачи: 60%',skipped:'Пропущен',
    grade_1:'1 кл.',grade_2:'2 кл.',grade_3:'3 кл.',grade_4:'4 кл.',
    grade_5:'5 кл.',grade_6:'6 кл.',grade_7:'7 кл.',grade_8:'8 кл.',
    grade_9:'9 кл.',grade_10:'10 кл.',grade_11:'11 кл.',grade_12:'12 кл.',
    hero_badge:'🇷🇺 Для грузинских школ',
    hero_h1:'Тестовая платформа',
    hero_h1b:'для нового поколения',
    hero_desc:'Проверь знания, получи значок 🏆 Excellent и стань лучшим в классе! 1–12 класс · 10 предметов · мгновенная оценка.',
    hero_cta:'▶ Начать — бесплатно',
    leaderboard:'Рейтинг',rank:'Место',class_lb:'Класс',national_lb:'Нац. рейтинг',
    streak_label:'Стрик',daily_challenge:'Задание дня',daily_bonus:'Бонус 2× XP',
    daily_done:'Выполнено сегодня ✓',prizes_title:'🎁 Призы',prize_period:'Период',
    prize_cond:'Условие',subject_mastery:'Освоение предметов',mastery_label:'тестов пройдено',
    study_tip:'Подсказка',correct_ans_was:'Правильный ответ',
    review_topic:'Повтори эту тему по учебнику.',
    new_achievement:'Новое достижение!',prize_active:'🏆 Активный конкурс',
    hero_demo:'👁 Посмотреть демо',
    stat_subject:'предметов',stat_grade:'классов',stat_question:'вопросов',stat_auto:'автооценка',
    stat_auto_big:'Авто',
    login_subtitle:'Платформа школьного тестирования',
    role_label:'Роль',
    student_role:'Ученик',
    teacher_role:'Учитель',
    admin_role:'Админ',
    surname:'Фамилия',
    teacher_note:'⚠️ Аккаунт учителя требует подтверждения администратора.',
    demo_mode:'Демо-режим:',
    email_ph:'Ваш email',
    password_ph:'Пароль',
    name_ph:'Имя',
    surname_ph:'Фамилия',
    adm_dashboard:'🏠 Дашборд',
    adm_schools:'🏫 Школы',
    adm_users:'👥 Пользователи',
    adm_pending:'⚠️ На утверждении',
    completed_tests:'Тестов пройдено',
    avg_score:'Средний балл',
    total_pts_label:'Всего баллов',
    excellent_badge:'Отлично значки',
    recent_results:'🏆 Последние результаты',
    no_test_taken:'Тестов ещё нет',
    exit_test:'← Выйти',edit_questions:'Ред. вопросов',
    exit_test_confirm:'Выйти из теста? Ответы сохранены, и вы сможете продолжить позже.',
    back_to_tests:'← Тесты',
    profile_settings:'⚙️ Настройки',
    new_password:'Новый пароль',
    change_pass_ph:'Сменить пароль',
    save_profile:'💾 Сохранить',
    adm_settings:'⚙️ Настройки',
    adm_role_label:'Админ',
    adm_subtitle:'Админ · Администратор платформы',
    adm_stat_schools:'Школ',
    adm_stat_users:'Пользователей',
    adm_stat_tests:'Всего тестов',
    adm_pending_teachers:'🔴 Учителя на утверждении',
    adm_approve:'✓ Утвердить',
    adm_reject:'✗ Отклонить',
    adm_schools_title:'Школы',
    adm_add_school:'+ Добавить школу',
    adm_th_school:'Школа',
    adm_th_teach:'Учит.',
    adm_th_stud:'Уч-ся',
    adm_th_tests:'Тесты',
    adm_th_act:'Дей.',
    adm_users_title:'Пользователи',
    adm_search:'🔍 Поиск...',
    adm_status:'Статус',
    adm_awaiting:'⏳ Ожидают утверждения',
    how_title:'📋 Как это работает?',
    step1_title:'Зарегистрируйтесь',
    step1_desc:'Создайте аккаунт — бесплатно',
    step2_title:'Выберите тест',
    step2_desc:'Тесты по возрасту',
    step3_title:'Получите результат',
    step3_desc:'Автоматическая оценка',
    feat1_title:'Онлайн-тесты',
    feat1_desc:'Учителя создают тесты, ученики проходят в браузере',
    feat2_title:'Автооценка',
    feat2_desc:'MCQ и True/False оцениваются автоматически — результат мгновенно',
    feat3_title:'Аналитика',
    feat3_desc:'Подробная статистика по классу, ученику и предмету',
    feat4_title:'Значки',
    feat4_desc:'Excellent, Good, Pass — для мотивации',
    plans_title:'Тарифы',
    plans_sub:'BOG Pay / TBC Pay — в лари',
    plan_free:'Бесплатно',
    plan_popular:'Популярный',
    plan_b1:'✓ 5 тестов/мес.',
    plan_b2:'✓ 30 учеников',
    plan_b3:'✓ MCQ & True/False',
    plan_p1:'✓ Неограниченно тестов',
    plan_p2:'✓ 200 учеников',
    plan_p3:'✓ Все типы + аналитика',
    plan_s1:'✓ Вся школа',
    plan_s2:'✓ Всё без ограничений',
    plan_s3:'✓ API + интеграция',
    btn_start:'Начать',
    btn_sub:'Подписаться',
    footer:'© 2026 EduTest.ge · Все права защищены',
    q_review:'📋 Разбор вопросов',
    your_ans:'Отв.',
    correct_ans:'Верн.',
    pending_pts:'⏳ pending',
    enter_number_ans:'Введите числовой ответ',
    drag_to_order:'Перетащите в правильном порядке',
    test_done:'Тест завершён!',
    bravo_perfect:'Идеальный результат!',
    bravo_msg:'Отлично! Вы ответили на все вопросы верно — это большое достижение! 🌟✨',
    q_label:'воп.',
    pts_label:'б.',
    class_label:'Класс',
    student_label:'Ученик',
    hello_label:'👋 Привет',
    no_test_taken:'Тестов ещё не проходили',
    tests_label:'Тесты',
    grade_label_roman:'Тесты (1–12 кл.)',
    test_not_found:'Тесты не найдены',
    results_label:'Мои результаты',
    no_result_taken:'Тестов ещё не проходили',
    ver_label:'в.',
    min_abbr:'мин',
    att_abbr:'поп.',
    try_again:'Попробовать снова',
    teacher_label:'Учитель',
    summary_label:'Сводка',
    short_ans_teacher:'Учитель проверяет',
    enter_ans:'Введите ответ...',
    your_ans_label:'Ваш ответ:',
    correct_short:'Верный:',
    q_num_label:'В.',
    progress_label:'Прогресс:',
  }
};

function t(k){return(I18N[LANG]&&I18N[LANG][k])||I18N.ka[k]||k;}
function performanceBadgeLabel(pct){
  const score=Number(pct)||0;
  const labels=LANG==='en'
    ?['🏆 Excellent','✅ Good','📘 Passed','❌ Needs improvement']
    :LANG==='ru'
      ?['🏆 Отлично','✅ Хорошо','📘 Зачёт','❌ Нужно улучшить']
      :['🏆 შესანიშნავი','✅ კარგი','📘 ჩაბარებული','❌ გასაუმჯობესებელი'];
  return score>=90?labels[0]:score>=70?labels[1]:score>=50?labels[2]:labels[3];
}

function updateI18n(){
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var k=el.getAttribute('data-i18n');
    var v=t(k);
    if(v){
      if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){el.placeholder=v;}
      else if(el.tagName==='OPTION'){el.textContent=v;}
      else{el.innerHTML=v;}
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
    var k=el.getAttribute('data-i18n-placeholder');
    var v=t(k);
    if(v) el.placeholder=v;
  });

  // Re-render dynamic topbar/subtitle when lang changes
  if(CUR_USER){
    if(typeof renderStudentTests==='function'&&!document.getElementById('s-tests')?.classList.contains('hidden'))renderStudentTests();
    if(typeof renderStudentResults==='function'&&!document.getElementById('s-results')?.classList.contains('hidden'))renderStudentResults();
    if(typeof renderTeacherTests==='function'&&!document.getElementById('t-tests')?.classList.contains('hidden'))renderTeacherTests();
    const sub=document.getElementById('s-topbar-sub');
    if(sub)sub.textContent=(CUR_USER.grade?t('class_label')+' '+CUR_USER.grade+' · ':'')+t('student_label');
    const badge=document.getElementById('s-topbar-badge');
    if(badge)badge.textContent=CUR_USER.grade?t('grade')+' '+CUR_USER.grade:t('student_label');
    const ttl=document.getElementById('s-topbar-title');
    if(ttl){const active=document.querySelector('#p-student .ni.act');
      if(active){const ids={'s-home':t('adm_dashboard'),'s-tests':t('tests'),'s-results':t('my_results'),'s-profile':t('profile')};
        const id=active.getAttribute('onclick').match(/'([^']+)'/)?.[1];
        if(id&&ids[id])ttl.textContent=ids[id];}}
    const shRec=document.getElementById('s-home-recent');
    if(shRec&&shRec.querySelector('[data-i18n]')){shRec.querySelector('[data-i18n]').textContent=t('no_test_taken');}
  }
}

function setLang(l){
  LANG=l;
  ['langSwitcher','langSwitcherLogin'].forEach(function(id){
    var sw=document.getElementById(id);
    if(!sw) return;
    sw.querySelectorAll('.lang-btn').forEach(function(b){
      b.classList.toggle('active', b.id==='lang-'+l||b.id==='ll-'+l);
    });
  });
  updateI18n();
  // Re-render ALL dynamic content based on role
  if(typeof CUR_USER!=='undefined'&&CUR_USER){
    if(CUR_USER.role==='admin'){
      if(typeof renderAdminHome==='function') renderAdminHome();
      if(typeof renderAdminUsers==='function') renderAdminUsers();
    } else if(CUR_USER.role==='teacher'){
      if(typeof updateTeacherUI==='function') updateTeacherUI();
      if(typeof renderTeacherTests==='function') renderTeacherTests();
      if(typeof renderTeacherHome==='function') renderTeacherHome();
      if(typeof renderTeacherStudents==='function') renderTeacherStudents();
    } else {
      if(typeof updateStudentUI==='function') updateStudentUI();
      if(typeof renderStudentTests==='function') renderStudentTests();
      if(typeof updateStudentHomeStats==='function') updateStudentHomeStats();
      // If on results page, re-render it
      var resPage=document.getElementById('p-results');
      if(resPage&&resPage.classList.contains('active')&&typeof renderResultsPage==='function'&&typeof _lastResult!=='undefined'&&_lastResult){
        renderResultsPage(_lastResult);
      }
      // If taking a test, re-render current question
      var takePage=document.getElementById('p-take-test');
      if(takePage&&takePage.classList.contains('active')&&typeof renderQ==='function'){
        renderQ();
      }
    }
  }
}
// ===== END I18N =====

const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// SERVER-VERIFIED BUILD: authoritative questions and answer keys live in Supabase only.

// ===== Q_TRANS (math/nature V1 translations) =====
const Q_TRANS={}; // Secure assessment build: question content is delivered per session by Edge Function.


const USER_VERS={}; // legacy UI compatibility only; server selects questions.
function getUserVersion(){return 0;}
function advanceUserVersion(){}

// ===== PROFESSIONAL QA REPAIR PASS 1 (2026-08-08): calc evaluator, MC options, G1 metadata/explanations =====
// ===== PROFESSIONAL QA REPAIR PASS 2 (2026-08-08): G1-G8 parallel-form diversification + option-order hardening =====
// ===== PROFESSIONAL QA REPAIR PASS 3 (2026-08-08): balanced MCQ answer positions + G7 cross-subject stem cleanup =====
// ===== PROFESSIONAL QA REPAIR PASS 4 (2026-08-08): schema normalization, explanations, T/F normalization, match redesign =====
// ===== PROFESSIONAL QA REPAIR PASS 5 (2026-08-08): numeric precision, calc feedback, freeze audited runtime pools =====
// ===== PROFESSIONAL QA REPAIR PASS 6 (2026-08-08): passage-specific reading comprehension and evidence answers =====
// SERVER-VERIFIED BUILD: reviewed question rows removed from client bundle.

const ALL_TESTS=[
{id:'math-g1-s1',title:'მათემატიკა — I კლასი — I სემ.',subject:'მათემატიკა',grade:1,pool:'math-g1',count:10,time:10,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'math-g1-s2',title:'მათემატიკა — I კლასი — II სემ.',subject:'მათემატიკა',grade:1,pool:'math-g1',count:10,time:10,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'math-g1-s1-sum',title:'მათემატიკა — I კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:1,pool:'math-g1',count:20,time:20,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g1-s2-sum',title:'მათემატიკა — I კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:1,pool:'math-g1',count:20,time:20,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'math-g2-s1',title:'მათემატიკა — II კლასი — I სემ.',subject:'მათემატიკა',grade:2,pool:'math-g2',count:10,time:12,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'math-g2-s2',title:'მათემატიკა — II კლასი — II სემ.',subject:'მათემატიკა',grade:2,pool:'math-g2',count:10,time:12,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'math-g2-s1-sum',title:'მათემატიკა — II კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:2,pool:'math-g2',count:20,time:22,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g2-s2-sum',title:'მათემატიკა — II კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:2,pool:'math-g2',count:20,time:22,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'math-g3-s1',title:'მათემატიკა — III კლასი — I სემ.',subject:'მათემატიკა',grade:3,pool:'math-g3',count:10,time:15,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'math-g3-s2',title:'მათემატიკა — III კლასი — II სემ.',subject:'მათემატიკა',grade:3,pool:'math-g3',count:10,time:15,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'math-g3-s1-sum',title:'მათემატიკა — III კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:3,pool:'math-g3',count:20,time:25,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g3-s2-sum',title:'მათემატიკა — III კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:3,pool:'math-g3',count:20,time:25,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'math-g4-s1',title:'მათემატიკა — IV კლასი — I სემ.',subject:'მათემატიკა',grade:4,pool:'math-g4',count:10,time:18,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'math-g4-s2',title:'მათემატიკა — IV კლასი — II სემ.',subject:'მათემატიკა',grade:4,pool:'math-g4',count:10,time:18,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'math-g4-s1-sum',title:'მათემატიკა — IV კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:4,pool:'math-g4',count:20,time:30,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g4-s2-sum',title:'მათემატიკა — IV კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:4,pool:'math-g4',count:20,time:30,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'math-g5-s1',title:'მათემატიკა — V კლასი — I სემ.',subject:'მათემატიკა',grade:5,pool:'math-g5',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'math-g5-s2',title:'მათემატიკა — V კლასი — II სემ.',subject:'მათემატიკა',grade:5,pool:'math-g5',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'math-g5-s1-sum',title:'მათემატიკა — V კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:5,pool:'math-g5',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g5-s2-sum',title:'მათემატიკა — V კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:5,pool:'math-g5',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'math-g6-s1',title:'მათემატიკა — VI კლასი — I სემ.',subject:'მათემატიკა',grade:6,pool:'math-g6',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'math-g6-s2',title:'მათემატიკა — VI კლასი — II სემ.',subject:'მათემატიკა',grade:6,pool:'math-g6',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'math-g6-s1-sum',title:'მათემატიკა — VI კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:6,pool:'math-g6',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g6-s2-sum',title:'მათემატიკა — VI კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:6,pool:'math-g6',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'math-g7-s1',title:'მათემატიკა — VII კლასი — I სემ.',subject:'მათემატიკა',grade:7,pool:'math-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'math-g7-s2',title:'მათემატიკა — VII კლასი — II სემ.',subject:'მათემატიკა',grade:7,pool:'math-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'math-g7-s1-sum',title:'მათემატიკა — VII კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:7,pool:'math-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g7-s2-sum',title:'მათემატიკა — VII კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:7,pool:'math-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g7-s1',title:'ქართული ენა და ლიტერატურა — VII კლასი — I სემ.',subject:'ქართული ენა და ლიტერატურა',grade:7,pool:'geo-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'geo-g7-s2',title:'ქართული ენა და ლიტერატურა — VII კლასი — II სემ.',subject:'ქართული ენა და ლიტერატურა',grade:7,pool:'geo-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'geo-g7-s1-sum',title:'ქართული ენა და ლიტერატურა — VII კლასი — I სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:7,pool:'geo-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g7-s2-sum',title:'ქართული ენა და ლიტერატურა — VII კლასი — II სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:7,pool:'geo-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g7-s1',title:'ინგლისური — VII კლასი — I სემ.',subject:'ინგლისური',grade:7,pool:'eng-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'eng-g7-s2',title:'ინგლისური — VII კლასი — II სემ.',subject:'ინგლისური',grade:7,pool:'eng-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'eng-g7-s1-sum',title:'ინგლისური — VII კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:7,pool:'eng-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g7-s2-sum',title:'ინგლისური — VII კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:7,pool:'eng-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'rus-g7-s1',title:'მეორე უცხოური — რუსული — VII კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:7,pool:'rus-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'rus-g7-s2',title:'მეორე უცხოური — რუსული — VII კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:7,pool:'rus-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'rus-g7-s1-sum',title:'მეორე უცხოური — რუსული — VII კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:7,pool:'rus-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'rus-g7-s2-sum',title:'მეორე უცხოური — რუსული — VII კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:7,pool:'rus-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'hist-g7-s1',title:'ისტორია — VII კლასი — I სემ.',subject:'ისტორია',grade:7,pool:'hist-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'hist-g7-s2',title:'ისტორია — VII კლასი — II სემ.',subject:'ისტორია',grade:7,pool:'hist-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'hist-g7-s1-sum',title:'ისტორია — VII კლასი — I სემ. შემაჯამებელი',subject:'ისტორია',grade:7,pool:'hist-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'hist-g7-s2-sum',title:'ისტორია — VII კლასი — II სემ. შემაჯამებელი',subject:'ისტორია',grade:7,pool:'hist-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geog-g7-s1',title:'გეოგრაფია — VII კლასი — I სემ.',subject:'გეოგრაფია',grade:7,pool:'geog-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'geog-g7-s2',title:'გეოგრაფია — VII კლასი — II სემ.',subject:'გეოგრაფია',grade:7,pool:'geog-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'geog-g7-s1-sum',title:'გეოგრაფია — VII კლასი — I სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:7,pool:'geog-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geog-g7-s2-sum',title:'გეოგრაფია — VII კლასი — II სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:7,pool:'geog-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'bio-g7-s1',title:'ბიოლოგია — VII კლასი — I სემ.',subject:'ბიოლოგია',grade:7,pool:'bio-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'bio-g7-s2',title:'ბიოლოგია — VII კლასი — II სემ.',subject:'ბიოლოგია',grade:7,pool:'bio-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'bio-g7-s1-sum',title:'ბიოლოგია — VII კლასი — I სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:7,pool:'bio-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'bio-g7-s2-sum',title:'ბიოლოგია — VII კლასი — II სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:7,pool:'bio-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'phys-g7-s1',title:'ფიზიკა — VII კლასი — I სემ.',subject:'ფიზიკა',grade:7,pool:'phys-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'phys-g7-s2',title:'ფიზიკა — VII კლასი — II სემ.',subject:'ფიზიკა',grade:7,pool:'phys-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'phys-g7-s1-sum',title:'ფიზიკა — VII კლასი — I სემ. შემაჯამებელი',subject:'ფიზიკა',grade:7,pool:'phys-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'phys-g7-s2-sum',title:'ფიზიკა — VII კლასი — II სემ. შემაჯამებელი',subject:'ფიზიკა',grade:7,pool:'phys-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'civ-g7-s1',title:'მოქალაქეობა — VII კლასი — I სემ.',subject:'მოქალაქეობა',grade:7,pool:'civ-g7',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'civ-g7-s2',title:'მოქალაქეობა — VII კლასი — II სემ.',subject:'მოქალაქეობა',grade:7,pool:'civ-g7',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'civ-g7-s1-sum',title:'მოქალაქეობა — VII კლასი — I სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:7,pool:'civ-g7',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'civ-g7-s2-sum',title:'მოქალაქეობა — VII კლასი — II სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:7,pool:'civ-g7',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
// --- GRADE 10 REVISED TEST MAPPINGS ---
{id:'math-g10-s1',title:'მათემატიკა — X კლასი — I სემ.',subject:'მათემატიკა',grade:10,pool:'math-g10',count:10,time:30,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'math-g10-s2',title:'მათემატიკა — X კლასი — II სემ.',subject:'მათემატიკა',grade:10,pool:'math-g10',count:10,time:30,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'math-g10-s1-sum',title:'მათემატიკა — X კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:10,pool:'math-g10',count:20,time:50,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'math-g10-s2-sum',title:'მათემატიკა — X კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:10,pool:'math-g10',count:20,time:50,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geo-g10-s1',title:'ქართული ენა და ლიტერატურა — X კლასი — I სემ.',subject:'ქართული ენა და ლიტერატურა',grade:10,pool:'geo-g10',count:10,time:30,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geo-g10-s2',title:'ქართული ენა და ლიტერატურა — X კლასი — II სემ.',subject:'ქართული ენა და ლიტერატურა',grade:10,pool:'geo-g10',count:10,time:30,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geo-g10-s1-sum',title:'ქართული ენა და ლიტერატურა — X კლასი — I სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:10,pool:'geo-g10',count:20,time:50,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geo-g10-s2-sum',title:'ქართული ენა და ლიტერატურა — X კლასი — II სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:10,pool:'geo-g10',count:20,time:50,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'eng-g10-s1',title:'ინგლისური — X კლასი — I სემ.',subject:'ინგლისური',grade:10,pool:'eng-g10',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'eng-g10-s2',title:'ინგლისური — X კლასი — II სემ.',subject:'ინგლისური',grade:10,pool:'eng-g10',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'eng-g10-s1-sum',title:'ინგლისური — X კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:10,pool:'eng-g10',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'eng-g10-s2-sum',title:'ინგლისური — X კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:10,pool:'eng-g10',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'rus-g10-s1',title:'მეორე უცხოური — რუსული — X კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:10,pool:'rus-g10',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'rus-g10-s2',title:'მეორე უცხოური — რუსული — X კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:10,pool:'rus-g10',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'rus-g10-s1-sum',title:'მეორე უცხოური — რუსული — X კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:10,pool:'rus-g10',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'rus-g10-s2-sum',title:'მეორე უცხოური — რუსული — X კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:10,pool:'rus-g10',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'hist-g10-s1',title:'ისტორია — X კლასი — I სემ.',subject:'ისტორია',grade:10,pool:'hist-g10',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'hist-g10-s2',title:'ისტორია — X კლასი — II სემ.',subject:'ისტორია',grade:10,pool:'hist-g10',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'hist-g10-s1-sum',title:'ისტორია — X კლასი — I სემ. შემაჯამებელი',subject:'ისტორია',grade:10,pool:'hist-g10',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'hist-g10-s2-sum',title:'ისტორია — X კლასი — II სემ. შემაჯამებელი',subject:'ისტორია',grade:10,pool:'hist-g10',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geog-g10-s1',title:'გეოგრაფია — X კლასი — I სემ.',subject:'გეოგრაფია',grade:10,pool:'geog-g10',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geog-g10-s2',title:'გეოგრაფია — X კლასი — II სემ.',subject:'გეოგრაფია',grade:10,pool:'geog-g10',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geog-g10-s1-sum',title:'გეოგრაფია — X კლასი — I სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:10,pool:'geog-g10',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geog-g10-s2-sum',title:'გეოგრაფია — X კლასი — II სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:10,pool:'geog-g10',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'bio-g10-s1',title:'ბიოლოგია — X კლასი — I სემ.',subject:'ბიოლოგია',grade:10,pool:'bio-g10',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'bio-g10-s2',title:'ბიოლოგია — X კლასი — II სემ.',subject:'ბიოლოგია',grade:10,pool:'bio-g10',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'bio-g10-s1-sum',title:'ბიოლოგია — X კლასი — I სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:10,pool:'bio-g10',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'bio-g10-s2-sum',title:'ბიოლოგია — X კლასი — II სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:10,pool:'bio-g10',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'phys-g10-s1',title:'ფიზიკა — X კლასი — I სემ.',subject:'ფიზიკა',grade:10,pool:'phys-g10',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'phys-g10-s2',title:'ფიზიკა — X კლასი — II სემ.',subject:'ფიზიკა',grade:10,pool:'phys-g10',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'phys-g10-s1-sum',title:'ფიზიკა — X კლასი — I სემ. შემაჯამებელი',subject:'ფიზიკა',grade:10,pool:'phys-g10',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'phys-g10-s2-sum',title:'ფიზიკა — X კლასი — II სემ. შემაჯამებელი',subject:'ფიზიკა',grade:10,pool:'phys-g10',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'chem-g10-s1',title:'ქიმია — X კლასი — I სემ.',subject:'ქიმია',grade:10,pool:'chem-g10',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'chem-g10-s2',title:'ქიმია — X კლასი — II სემ.',subject:'ქიმია',grade:10,pool:'chem-g10',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'chem-g10-s1-sum',title:'ქიმია — X კლასი — I სემ. შემაჯამებელი',subject:'ქიმია',grade:10,pool:'chem-g10',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'chem-g10-s2-sum',title:'ქიმია — X კლასი — II სემ. შემაჯამებელი',subject:'ქიმია',grade:10,pool:'chem-g10',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'civ-g10-s1',title:'მოქალაქეობა — X კლასი — I სემ.',subject:'მოქალაქეობა',grade:10,pool:'civ-g10',count:10,time:22,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'civ-g10-s2',title:'მოქალაქეობა — X კლასი — II სემ.',subject:'მოქალაქეობა',grade:10,pool:'civ-g10',count:10,time:22,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'civ-g10-s1-sum',title:'მოქალაქეობა — X კლასი — I სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:10,pool:'civ-g10',count:20,time:40,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'civ-g10-s2-sum',title:'მოქალაქეობა — X კლასი — II სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:10,pool:'civ-g10',count:20,time:40,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geo-g1-s1',title:'ქართული — I კლასი — I სემ.',subject:'ქართული',grade:1,pool:'geo-g1',count:10,time:10,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'geo-g1-s2',title:'ქართული — I კლასი — II სემ.',subject:'ქართული',grade:1,pool:'geo-g1',count:10,time:10,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'geo-g1-s1-sum',title:'ქართული — I კლასი — I სემ. შემაჯამებელი',subject:'ქართული',grade:1,pool:'geo-g1',count:20,time:20,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g1-s2-sum',title:'ქართული — I კლასი — II სემ. შემაჯამებელი',subject:'ქართული',grade:1,pool:'geo-g1',count:20,time:20,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g2-s1',title:'ქართული — II კლასი — I სემ.',subject:'ქართული',grade:2,pool:'geo-g2',count:10,time:12,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'geo-g2-s2',title:'ქართული — II კლასი — II სემ.',subject:'ქართული',grade:2,pool:'geo-g2',count:10,time:12,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'geo-g2-s1-sum',title:'ქართული — II კლასი — I სემ. შემაჯამებელი',subject:'ქართული',grade:2,pool:'geo-g2',count:20,time:22,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g2-s2-sum',title:'ქართული — II კლასი — II სემ. შემაჯამებელი',subject:'ქართული',grade:2,pool:'geo-g2',count:20,time:22,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g3-s1',title:'ქართული — III კლასი — I სემ.',subject:'ქართული',grade:3,pool:'geo-g3',count:10,time:15,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'geo-g3-s2',title:'ქართული — III კლასი — II სემ.',subject:'ქართული',grade:3,pool:'geo-g3',count:10,time:15,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'geo-g3-s1-sum',title:'ქართული — III კლასი — I სემ. შემაჯამებელი',subject:'ქართული',grade:3,pool:'geo-g3',count:20,time:25,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g3-s2-sum',title:'ქართული — III კლასი — II სემ. შემაჯამებელი',subject:'ქართული',grade:3,pool:'geo-g3',count:20,time:25,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g4-s1',title:'ქართული — IV კლასი — I სემ.',subject:'ქართული',grade:4,pool:'geo-g4',count:10,time:18,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'geo-g4-s2',title:'ქართული — IV კლასი — II სემ.',subject:'ქართული',grade:4,pool:'geo-g4',count:10,time:18,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'geo-g4-s1-sum',title:'ქართული — IV კლასი — I სემ. შემაჯამებელი',subject:'ქართული',grade:4,pool:'geo-g4',count:20,time:30,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g4-s2-sum',title:'ქართული — IV კლასი — II სემ. შემაჯამებელი',subject:'ქართული',grade:4,pool:'geo-g4',count:20,time:30,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g5-s1',title:'ქართული — V კლასი — I სემ.',subject:'ქართული',grade:5,pool:'geo-g5',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'geo-g5-s2',title:'ქართული — V კლასი — II სემ.',subject:'ქართული',grade:5,pool:'geo-g5',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'geo-g5-s1-sum',title:'ქართული — V კლასი — I სემ. შემაჯამებელი',subject:'ქართული',grade:5,pool:'geo-g5',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g5-s2-sum',title:'ქართული — V კლასი — II სემ. შემაჯამებელი',subject:'ქართული',grade:5,pool:'geo-g5',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g6-s1',title:'ქართული — VI კლასი — I სემ.',subject:'ქართული',grade:6,pool:'geo-g6',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'geo-g6-s2',title:'ქართული — VI კლასი — II სემ.',subject:'ქართული',grade:6,pool:'geo-g6',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'geo-g6-s1-sum',title:'ქართული — VI კლასი — I სემ. შემაჯამებელი',subject:'ქართული',grade:6,pool:'geo-g6',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g6-s2-sum',title:'ქართული — VI კლასი — II სემ. შემაჯამებელი',subject:'ქართული',grade:6,pool:'geo-g6',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g1-s1',title:'ინგლისური — I კლასი — I სემ.',subject:'ინგლისური',grade:1,pool:'eng-g1',count:10,time:10,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'eng-g1-s2',title:'ინგლისური — I კლასი — II სემ.',subject:'ინგლისური',grade:1,pool:'eng-g1',count:10,time:10,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'eng-g1-s1-sum',title:'ინგლისური — I კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:1,pool:'eng-g1',count:20,time:20,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g1-s2-sum',title:'ინგლისური — I კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:1,pool:'eng-g1',count:20,time:20,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g2-s1',title:'ინგლისური — II კლასი — I სემ.',subject:'ინგლისური',grade:2,pool:'eng-g2',count:10,time:12,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'eng-g2-s2',title:'ინგლისური — II კლასი — II სემ.',subject:'ინგლისური',grade:2,pool:'eng-g2',count:10,time:12,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'eng-g2-s1-sum',title:'ინგლისური — II კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:2,pool:'eng-g2',count:20,time:22,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g2-s2-sum',title:'ინგლისური — II კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:2,pool:'eng-g2',count:20,time:22,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g3-s1',title:'ინგლისური — III კლასი — I სემ.',subject:'ინგლისური',grade:3,pool:'eng-g3',count:10,time:15,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'eng-g3-s2',title:'ინგლისური — III კლასი — II სემ.',subject:'ინგლისური',grade:3,pool:'eng-g3',count:10,time:15,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'eng-g3-s1-sum',title:'ინგლისური — III კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:3,pool:'eng-g3',count:20,time:25,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g3-s2-sum',title:'ინგლისური — III კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:3,pool:'eng-g3',count:20,time:25,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g4-s1',title:'ინგლისური — IV კლასი — I სემ.',subject:'ინგლისური',grade:4,pool:'eng-g4',count:10,time:18,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'eng-g4-s2',title:'ინგლისური — IV კლასი — II სემ.',subject:'ინგლისური',grade:4,pool:'eng-g4',count:10,time:18,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'eng-g4-s1-sum',title:'ინგლისური — IV კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:4,pool:'eng-g4',count:20,time:30,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g4-s2-sum',title:'ინგლისური — IV კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:4,pool:'eng-g4',count:20,time:30,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g5-s1',title:'ინგლისური — V კლასი — I სემ.',subject:'ინგლისური',grade:5,pool:'eng-g5',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'eng-g5-s2',title:'ინგლისური — V კლასი — II სემ.',subject:'ინგლისური',grade:5,pool:'eng-g5',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'eng-g5-s1-sum',title:'ინგლისური — V კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:5,pool:'eng-g5',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g5-s2-sum',title:'ინგლისური — V კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:5,pool:'eng-g5',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g6-s1',title:'ინგლისური — VI კლასი — I სემ.',subject:'ინგლისური',grade:6,pool:'eng-g6',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'eng-g6-s2',title:'ინგლისური — VI კლასი — II სემ.',subject:'ინგლისური',grade:6,pool:'eng-g6',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'eng-g6-s1-sum',title:'ინგლისური — VI კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:6,pool:'eng-g6',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g6-s2-sum',title:'ინგლისური — VI კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:6,pool:'eng-g6',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'rus-g5-s1',title:'მეორე უცხოური — რუსული — V კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:5,pool:'rus-g5',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'rus-g5-s2',title:'მეორე უცხოური — რუსული — V კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:5,pool:'rus-g5',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'rus-g5-s1-sum',title:'მეორე უცხოური — რუსული — V კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:5,pool:'rus-g5',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'rus-g5-s2-sum',title:'მეორე უცხოური — რუსული — V კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:5,pool:'rus-g5',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'rus-g6-s1',title:'მეორე უცხოური — რუსული — VI კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:6,pool:'rus-g6',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'rus-g6-s2',title:'მეორე უცხოური — რუსული — VI კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:6,pool:'rus-g6',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'rus-g6-s1-sum',title:'მეორე უცხოური — რუსული — VI კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:6,pool:'rus-g6',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'rus-g6-s2-sum',title:'მეორე უცხოური — რუსული — VI კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:6,pool:'rus-g6',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'nat-g1-s1',title:'ბუნება — I კლასი — I სემ.',subject:'ბუნება',grade:1,pool:'nat-g1',count:10,time:10,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'nat-g1-s2',title:'ბუნება — I კლასი — II სემ.',subject:'ბუნება',grade:1,pool:'nat-g1',count:10,time:10,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'nat-g1-s1-sum',title:'ბუნება — I კლასი — I სემ. შემაჯამებელი',subject:'ბუნება',grade:1,pool:'nat-g1',count:20,time:20,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'nat-g1-s2-sum',title:'ბუნება — I კლასი — II სემ. შემაჯამებელი',subject:'ბუნება',grade:1,pool:'nat-g1',count:20,time:20,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'nat-g2-s1',title:'ბუნება — II კლასი — I სემ.',subject:'ბუნება',grade:2,pool:'nat-g2',count:10,time:12,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'nat-g2-s2',title:'ბუნება — II კლასი — II სემ.',subject:'ბუნება',grade:2,pool:'nat-g2',count:10,time:12,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'nat-g2-s1-sum',title:'ბუნება — II კლასი — I სემ. შემაჯამებელი',subject:'ბუნება',grade:2,pool:'nat-g2',count:20,time:22,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'nat-g2-s2-sum',title:'ბუნება — II კლასი — II სემ. შემაჯამებელი',subject:'ბუნება',grade:2,pool:'nat-g2',count:20,time:22,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'nat-g3-s1',title:'ბუნება — III კლასი — I სემ.',subject:'ბუნება',grade:3,pool:'nat-g3',count:10,time:15,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'nat-g3-s2',title:'ბუნება — III კლასი — II სემ.',subject:'ბუნება',grade:3,pool:'nat-g3',count:10,time:15,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'nat-g3-s1-sum',title:'ბუნება — III კლასი — I სემ. შემაჯამებელი',subject:'ბუნება',grade:3,pool:'nat-g3',count:20,time:25,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'nat-g3-s2-sum',title:'ბუნება — III კლასი — II სემ. შემაჯამებელი',subject:'ბუნება',grade:3,pool:'nat-g3',count:20,time:25,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'nat-g4-s1',title:'ბუნება — IV კლასი — I სემ.',subject:'ბუნება',grade:4,pool:'nat-g4',count:10,time:18,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'nat-g4-s2',title:'ბუნება — IV კლასი — II სემ.',subject:'ბუნება',grade:4,pool:'nat-g4',count:10,time:18,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'nat-g4-s1-sum',title:'ბუნება — IV კლასი — I სემ. შემაჯამებელი',subject:'ბუნება',grade:4,pool:'nat-g4',count:20,time:30,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'nat-g4-s2-sum',title:'ბუნება — IV კლასი — II სემ. შემაჯამებელი',subject:'ბუნება',grade:4,pool:'nat-g4',count:20,time:30,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'nat-g5-s1',title:'ბუნება — V კლასი — I სემ.',subject:'ბუნება',grade:5,pool:'nat-g5',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'nat-g5-s2',title:'ბუნება — V კლასი — II სემ.',subject:'ბუნება',grade:5,pool:'nat-g5',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'nat-g5-s1-sum',title:'ბუნება — V კლასი — I სემ. შემაჯამებელი',subject:'ბუნება',grade:5,pool:'nat-g5',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'nat-g5-s2-sum',title:'ბუნება — V კლასი — II სემ. შემაჯამებელი',subject:'ბუნება',grade:5,pool:'nat-g5',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'nat-g6-s1',title:'ბუნება — VI კლასი — I სემ.',subject:'ბუნება',grade:6,pool:'nat-g6',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'nat-g6-s2',title:'ბუნება — VI კლასი — II სემ.',subject:'ბუნება',grade:6,pool:'nat-g6',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'nat-g6-s1-sum',title:'ბუნება — VI კლასი — I სემ. შემაჯამებელი',subject:'ბუნება',grade:6,pool:'nat-g6',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'nat-g6-s2-sum',title:'ბუნება — VI კლასი — II სემ. შემაჯამებელი',subject:'ბუნება',grade:6,pool:'nat-g6',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'soc-g3-s1',title:'მე და საზოგადოება — III კლასი — I სემ.',subject:'მე და საზოგადოება',grade:3,pool:'soc-g3',count:10,time:15,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'soc-g3-s2',title:'მე და საზოგადოება — III კლასი — II სემ.',subject:'მე და საზოგადოება',grade:3,pool:'soc-g3',count:10,time:15,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'soc-g3-s1-sum',title:'მე და საზოგადოება — III კლასი — I სემ. შემაჯამებელი',subject:'მე და საზოგადოება',grade:3,pool:'soc-g3',count:20,time:25,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'soc-g3-s2-sum',title:'მე და საზოგადოება — III კლასი — II სემ. შემაჯამებელი',subject:'მე და საზოგადოება',grade:3,pool:'soc-g3',count:20,time:25,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'soc-g4-s1',title:'მე და საზოგადოება — IV კლასი — I სემ.',subject:'მე და საზოგადოება',grade:4,pool:'soc-g4',count:10,time:18,attempts:3,paid:false,semester:1,testType:'mid'},
{id:'soc-g4-s2',title:'მე და საზოგადოება — IV კლასი — II სემ.',subject:'მე და საზოგადოება',grade:4,pool:'soc-g4',count:10,time:18,attempts:3,paid:false,semester:2,testType:'mid'},
{id:'soc-g4-s1-sum',title:'მე და საზოგადოება — IV კლასი — I სემ. შემაჯამებელი',subject:'მე და საზოგადოება',grade:4,pool:'soc-g4',count:20,time:30,attempts:3,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'soc-g4-s2-sum',title:'მე და საზოგადოება — IV კლასი — II სემ. შემაჯამებელი',subject:'მე და საზოგადოება',grade:4,pool:'soc-g4',count:20,time:30,attempts:3,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'country-g5-s1',title:'ჩვენი საქართველო — V კლასი — I სემ.',subject:'ჩვენი საქართველო',grade:5,pool:'country-g5',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'country-g5-s2',title:'ჩვენი საქართველო — V კლასი — II სემ.',subject:'ჩვენი საქართველო',grade:5,pool:'country-g5',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'country-g5-s1-sum',title:'ჩვენი საქართველო — V კლასი — I სემ. შემაჯამებელი',subject:'ჩვენი საქართველო',grade:5,pool:'country-g5',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'country-g5-s2-sum',title:'ჩვენი საქართველო — V კლასი — II სემ. შემაჯამებელი',subject:'ჩვენი საქართველო',grade:5,pool:'country-g5',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'country-g6-s1',title:'ჩვენი საქართველო — VI კლასი — I სემ.',subject:'ჩვენი საქართველო',grade:6,pool:'country-g6',count:10,time:20,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'country-g6-s2',title:'ჩვენი საქართველო — VI კლასი — II სემ.',subject:'ჩვენი საქართველო',grade:6,pool:'country-g6',count:10,time:20,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'country-g6-s1-sum',title:'ჩვენი საქართველო — VI კლასი — I სემ. შემაჯამებელი',subject:'ჩვენი საქართველო',grade:6,pool:'country-g6',count:20,time:35,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'country-g6-s2-sum',title:'ჩვენი საქართველო — VI კლასი — II სემ. შემაჯამებელი',subject:'ჩვენი საქართველო',grade:6,pool:'country-g6',count:20,time:35,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
// Grade 8 reviewed integrated tests
{id:'math-g8-s1',title:'მათემატიკა — VIII კლასი — I სემ.',subject:'მათემატიკა',grade:8,pool:'math-g8',count:10,time:24,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'math-g8-s2',title:'მათემატიკა — VIII კლასი — II სემ.',subject:'მათემატიკა',grade:8,pool:'math-g8',count:10,time:24,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'math-g8-s1-sum',title:'მათემატიკა — VIII კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:8,pool:'math-g8',count:20,time:42,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'math-g8-s2-sum',title:'მათემატიკა — VIII კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:8,pool:'math-g8',count:20,time:42,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geo-g8-s1',title:'ქართული ენა და ლიტერატურა — VIII კლასი — I სემ.',subject:'ქართული ენა და ლიტერატურა',grade:8,pool:'geo-g8',count:10,time:25,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'geo-g8-s2',title:'ქართული ენა და ლიტერატურა — VIII კლასი — II სემ.',subject:'ქართული ენა და ლიტერატურა',grade:8,pool:'geo-g8',count:10,time:25,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'geo-g8-s1-sum',title:'ქართული ენა და ლიტერატურა — VIII კლასი — I სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:8,pool:'geo-g8',count:20,time:45,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geo-g8-s2-sum',title:'ქართული ენა და ლიტერატურა — VIII კლასი — II სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:8,pool:'geo-g8',count:20,time:45,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'eng-g8-s1',title:'ინგლისური — VIII კლასი — I სემ.',subject:'ინგლისური',grade:8,pool:'eng-g8',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'eng-g8-s2',title:'ინგლისური — VIII კლასი — II სემ.',subject:'ინგლისური',grade:8,pool:'eng-g8',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'eng-g8-s1-sum',title:'ინგლისური — VIII კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:8,pool:'eng-g8',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'eng-g8-s2-sum',title:'ინგლისური — VIII კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:8,pool:'eng-g8',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'rus-g8-s1',title:'მეორე უცხოური — რუსული — VIII კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:8,pool:'rus-g8',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'rus-g8-s2',title:'მეორე უცხოური — რუსული — VIII კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:8,pool:'rus-g8',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'rus-g8-s1-sum',title:'მეორე უცხოური — რუსული — VIII კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:8,pool:'rus-g8',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'rus-g8-s2-sum',title:'მეორე უცხოური — რუსული — VIII კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:8,pool:'rus-g8',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'hist-g8-s1',title:'ისტორია — VIII კლასი — I სემ.',subject:'ისტორია',grade:8,pool:'hist-g8',count:10,time:23,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'hist-g8-s2',title:'ისტორია — VIII კლასი — II სემ.',subject:'ისტორია',grade:8,pool:'hist-g8',count:10,time:23,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'hist-g8-s1-sum',title:'ისტორია — VIII კლასი — I სემ. შემაჯამებელი',subject:'ისტორია',grade:8,pool:'hist-g8',count:20,time:40,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'hist-g8-s2-sum',title:'ისტორია — VIII კლასი — II სემ. შემაჯამებელი',subject:'ისტორია',grade:8,pool:'hist-g8',count:20,time:40,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'geog-g8-s1',title:'გეოგრაფია — VIII კლასი — I სემ.',subject:'გეოგრაფია',grade:8,pool:'geog-g8',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'geog-g8-s2',title:'გეოგრაფია — VIII კლასი — II სემ.',subject:'გეოგრაფია',grade:8,pool:'geog-g8',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'geog-g8-s1-sum',title:'გეოგრაფია — VIII კლასი — I სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:8,pool:'geog-g8',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'geog-g8-s2-sum',title:'გეოგრაფია — VIII კლასი — II სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:8,pool:'geog-g8',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'bio-g8-s1',title:'ბიოლოგია — VIII კლასი — I სემ.',subject:'ბიოლოგია',grade:8,pool:'bio-g8',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'bio-g8-s2',title:'ბიოლოგია — VIII კლასი — II სემ.',subject:'ბიოლოგია',grade:8,pool:'bio-g8',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'bio-g8-s1-sum',title:'ბიოლოგია — VIII კლასი — I სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:8,pool:'bio-g8',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'bio-g8-s2-sum',title:'ბიოლოგია — VIII კლასი — II სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:8,pool:'bio-g8',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'phys-g8-s1',title:'ფიზიკა — VIII კლასი — I სემ.',subject:'ფიზიკა',grade:8,pool:'phys-g8',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'phys-g8-s2',title:'ფიზიკა — VIII კლასი — II სემ.',subject:'ფიზიკა',grade:8,pool:'phys-g8',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'phys-g8-s1-sum',title:'ფიზიკა — VIII კლასი — I სემ. შემაჯამებელი',subject:'ფიზიკა',grade:8,pool:'phys-g8',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'phys-g8-s2-sum',title:'ფიზიკა — VIII კლასი — II სემ. შემაჯამებელი',subject:'ფიზიკა',grade:8,pool:'phys-g8',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'chem-g8-s1',title:'ქიმია — VIII კლასი — I სემ.',subject:'ქიმია',grade:8,pool:'chem-g8',count:10,time:22,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'chem-g8-s2',title:'ქიმია — VIII კლასი — II სემ.',subject:'ქიმია',grade:8,pool:'chem-g8',count:10,time:22,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'chem-g8-s1-sum',title:'ქიმია — VIII კლასი — I სემ. შემაჯამებელი',subject:'ქიმია',grade:8,pool:'chem-g8',count:20,time:38,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'chem-g8-s2-sum',title:'ქიმია — VIII კლასი — II სემ. შემაჯამებელი',subject:'ქიმია',grade:8,pool:'chem-g8',count:20,time:38,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
{id:'civ-g8-s1',title:'მოქალაქეობა — VIII კლასი — I სემ.',subject:'მოქალაქეობა',grade:8,pool:'civ-g8',count:10,time:18,attempts:2,paid:false,semester:1,testType:'mid'},
{id:'civ-g8-s2',title:'მოქალაქეობა — VIII კლასი — II სემ.',subject:'მოქალაქეობა',grade:8,pool:'civ-g8',count:10,time:18,attempts:2,paid:false,semester:2,testType:'mid'},
{id:'civ-g8-s1-sum',title:'მოქალაქეობა — VIII კლასი — I სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:8,pool:'civ-g8',count:20,time:32,attempts:2,paid:false,semester:1,testType:'sum',sumTest:true},
{id:'civ-g8-s2-sum',title:'მოქალაქეობა — VIII კლასი — II სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:8,pool:'civ-g8',count:20,time:32,attempts:2,paid:false,semester:2,testType:'sum',sumTest:true},
// Grade 9 reviewed integrated tests
{id:'math-g9-s1',title:'მათემატიკა — IX კლასი — I სემ.',subject:'მათემატიკა',grade:9,pool:'math-g9',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'math-g9-s2',title:'მათემატიკა — IX კლასი — II სემ.',subject:'მათემატიკა',grade:9,pool:'math-g9',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'math-g9-s1-sum',title:'მათემატიკა — IX კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:9,pool:'math-g9',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'math-g9-s2-sum',title:'მათემატიკა — IX კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:9,pool:'math-g9',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geo-g9-s1',title:'ქართული ენა და ლიტერატურა — IX კლასი — I სემ.',subject:'ქართული ენა და ლიტერატურა',grade:9,pool:'geo-g9',count:10,time:30,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geo-g9-s2',title:'ქართული ენა და ლიტერატურა — IX კლასი — II სემ.',subject:'ქართული ენა და ლიტერატურა',grade:9,pool:'geo-g9',count:10,time:30,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geo-g9-s1-sum',title:'ქართული ენა და ლიტერატურა — IX კლასი — I სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:9,pool:'geo-g9',count:20,time:50,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geo-g9-s2-sum',title:'ქართული ენა და ლიტერატურა — IX კლასი — II სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:9,pool:'geo-g9',count:20,time:50,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'eng-g9-s1',title:'ინგლისური — IX კლასი — I სემ.',subject:'ინგლისური',grade:9,pool:'eng-g9',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'eng-g9-s2',title:'ინგლისური — IX კლასი — II სემ.',subject:'ინგლისური',grade:9,pool:'eng-g9',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'eng-g9-s1-sum',title:'ინგლისური — IX კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:9,pool:'eng-g9',count:20,time:42,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'eng-g9-s2-sum',title:'ინგლისური — IX კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:9,pool:'eng-g9',count:20,time:42,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'rus-g9-s1',title:'მეორე უცხოური — რუსული — IX კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:9,pool:'rus-g9',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'rus-g9-s2',title:'მეორე უცხოური — რუსული — IX კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:9,pool:'rus-g9',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'rus-g9-s1-sum',title:'მეორე უცხოური — რუსული — IX კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:9,pool:'rus-g9',count:20,time:42,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'rus-g9-s2-sum',title:'მეორე უცხოური — რუსული — IX კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:9,pool:'rus-g9',count:20,time:42,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'hist-g9-s1',title:'ისტორია — IX კლასი — I სემ.',subject:'ისტორია',grade:9,pool:'hist-g9',count:10,time:27,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'hist-g9-s2',title:'ისტორია — IX კლასი — II სემ.',subject:'ისტორია',grade:9,pool:'hist-g9',count:10,time:27,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'hist-g9-s1-sum',title:'ისტორია — IX კლასი — I სემ. შემაჯამებელი',subject:'ისტორია',grade:9,pool:'hist-g9',count:20,time:46,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'hist-g9-s2-sum',title:'ისტორია — IX კლასი — II სემ. შემაჯამებელი',subject:'ისტორია',grade:9,pool:'hist-g9',count:20,time:46,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geog-g9-s1',title:'გეოგრაფია — IX კლასი — I სემ.',subject:'გეოგრაფია',grade:9,pool:'geog-g9',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geog-g9-s2',title:'გეოგრაფია — IX კლასი — II სემ.',subject:'გეოგრაფია',grade:9,pool:'geog-g9',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geog-g9-s1-sum',title:'გეოგრაფია — IX კლასი — I სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:9,pool:'geog-g9',count:20,time:44,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geog-g9-s2-sum',title:'გეოგრაფია — IX კლასი — II სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:9,pool:'geog-g9',count:20,time:44,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'bio-g9-s1',title:'ბიოლოგია — IX კლასი — I სემ.',subject:'ბიოლოგია',grade:9,pool:'bio-g9',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'bio-g9-s2',title:'ბიოლოგია — IX კლასი — II სემ.',subject:'ბიოლოგია',grade:9,pool:'bio-g9',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'bio-g9-s1-sum',title:'ბიოლოგია — IX კლასი — I სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:9,pool:'bio-g9',count:20,time:44,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'bio-g9-s2-sum',title:'ბიოლოგია — IX კლასი — II სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:9,pool:'bio-g9',count:20,time:44,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'phys-g9-s1',title:'ფიზიკა — IX კლასი — I სემ.',subject:'ფიზიკა',grade:9,pool:'phys-g9',count:10,time:27,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'phys-g9-s2',title:'ფიზიკა — IX კლასი — II სემ.',subject:'ფიზიკა',grade:9,pool:'phys-g9',count:10,time:27,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'phys-g9-s1-sum',title:'ფიზიკა — IX კლასი — I სემ. შემაჯამებელი',subject:'ფიზიკა',grade:9,pool:'phys-g9',count:20,time:46,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'phys-g9-s2-sum',title:'ფიზიკა — IX კლასი — II სემ. შემაჯამებელი',subject:'ფიზიკა',grade:9,pool:'phys-g9',count:20,time:46,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'chem-g9-s1',title:'ქიმია — IX კლასი — I სემ.',subject:'ქიმია',grade:9,pool:'chem-g9',count:10,time:27,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'chem-g9-s2',title:'ქიმია — IX კლასი — II სემ.',subject:'ქიმია',grade:9,pool:'chem-g9',count:10,time:27,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'chem-g9-s1-sum',title:'ქიმია — IX კლასი — I სემ. შემაჯამებელი',subject:'ქიმია',grade:9,pool:'chem-g9',count:20,time:46,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'chem-g9-s2-sum',title:'ქიმია — IX კლასი — II სემ. შემაჯამებელი',subject:'ქიმია',grade:9,pool:'chem-g9',count:20,time:46,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'civ-g9-s1',title:'მოქალაქეობა — IX კლასი — I სემ.',subject:'მოქალაქეობა',grade:9,pool:'civ-g9',count:10,time:22,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'civ-g9-s2',title:'მოქალაქეობა — IX კლასი — II სემ.',subject:'მოქალაქეობა',grade:9,pool:'civ-g9',count:10,time:22,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'civ-g9-s1-sum',title:'მოქალაქეობა — IX კლასი — I სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:9,pool:'civ-g9',count:20,time:38,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'civ-g9-s2-sum',title:'მოქალაქეობა — IX კლასი — II სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:9,pool:'civ-g9',count:20,time:38,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'math-g11-s1',title:'მათემატიკა — XI კლასი — I სემ.',subject:'მათემატიკა',grade:11,pool:'math-g11',count:10,time:30,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'math-g11-s2',title:'მათემატიკა — XI კლასი — II სემ.',subject:'მათემატიკა',grade:11,pool:'math-g11',count:10,time:30,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'math-g11-s1-sum',title:'მათემატიკა — XI კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:11,pool:'math-g11',count:20,time:50,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'math-g11-s2-sum',title:'მათემატიკა — XI კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:11,pool:'math-g11',count:20,time:50,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geo-g11-s1',title:'ქართული ენა და ლიტერატურა — XI კლასი — I სემ.',subject:'ქართული ენა და ლიტერატურა',grade:11,pool:'geo-g11',count:10,time:30,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geo-g11-s2',title:'ქართული ენა და ლიტერატურა — XI კლასი — II სემ.',subject:'ქართული ენა და ლიტერატურა',grade:11,pool:'geo-g11',count:10,time:30,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geo-g11-s1-sum',title:'ქართული ენა და ლიტერატურა — XI კლასი — I სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:11,pool:'geo-g11',count:20,time:50,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geo-g11-s2-sum',title:'ქართული ენა და ლიტერატურა — XI კლასი — II სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:11,pool:'geo-g11',count:20,time:50,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'eng-g11-s1',title:'ინგლისური — XI კლასი — I სემ.',subject:'ინგლისური',grade:11,pool:'eng-g11',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'eng-g11-s2',title:'ინგლისური — XI კლასი — II სემ.',subject:'ინგლისური',grade:11,pool:'eng-g11',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'eng-g11-s1-sum',title:'ინგლისური — XI კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:11,pool:'eng-g11',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'eng-g11-s2-sum',title:'ინგლისური — XI კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:11,pool:'eng-g11',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'rus-g11-s1',title:'მეორე უცხოური — რუსული — XI კლასი — I სემ.',subject:'მეორე უცხოური — რუსული',grade:11,pool:'rus-g11',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'rus-g11-s2',title:'მეორე უცხოური — რუსული — XI კლასი — II სემ.',subject:'მეორე უცხოური — რუსული',grade:11,pool:'rus-g11',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'rus-g11-s1-sum',title:'მეორე უცხოური — რუსული — XI კლასი — I სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:11,pool:'rus-g11',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'rus-g11-s2-sum',title:'მეორე უცხოური — რუსული — XI კლასი — II სემ. შემაჯამებელი',subject:'მეორე უცხოური — რუსული',grade:11,pool:'rus-g11',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'hist-g11-s1',title:'ისტორია — XI კლასი — I სემ.',subject:'ისტორია',grade:11,pool:'hist-g11',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'hist-g11-s2',title:'ისტორია — XI კლასი — II სემ.',subject:'ისტორია',grade:11,pool:'hist-g11',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'hist-g11-s1-sum',title:'ისტორია — XI კლასი — I სემ. შემაჯამებელი',subject:'ისტორია',grade:11,pool:'hist-g11',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'hist-g11-s2-sum',title:'ისტორია — XI კლასი — II სემ. შემაჯამებელი',subject:'ისტორია',grade:11,pool:'hist-g11',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geog-g11-s1',title:'გეოგრაფია — XI კლასი — I სემ.',subject:'გეოგრაფია',grade:11,pool:'geog-g11',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geog-g11-s2',title:'გეოგრაფია — XI კლასი — II სემ.',subject:'გეოგრაფია',grade:11,pool:'geog-g11',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geog-g11-s1-sum',title:'გეოგრაფია — XI კლასი — I სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:11,pool:'geog-g11',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geog-g11-s2-sum',title:'გეოგრაფია — XI კლასი — II სემ. შემაჯამებელი',subject:'გეოგრაფია',grade:11,pool:'geog-g11',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'bio-g11-s1',title:'ბიოლოგია — XI კლასი — I სემ.',subject:'ბიოლოგია',grade:11,pool:'bio-g11',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'bio-g11-s2',title:'ბიოლოგია — XI კლასი — II სემ.',subject:'ბიოლოგია',grade:11,pool:'bio-g11',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'bio-g11-s1-sum',title:'ბიოლოგია — XI კლასი — I სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:11,pool:'bio-g11',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'bio-g11-s2-sum',title:'ბიოლოგია — XI კლასი — II სემ. შემაჯამებელი',subject:'ბიოლოგია',grade:11,pool:'bio-g11',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'phys-g11-s1',title:'ფიზიკა — XI კლასი — I სემ.',subject:'ფიზიკა',grade:11,pool:'phys-g11',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'phys-g11-s2',title:'ფიზიკა — XI კლასი — II სემ.',subject:'ფიზიკა',grade:11,pool:'phys-g11',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'phys-g11-s1-sum',title:'ფიზიკა — XI კლასი — I სემ. შემაჯამებელი',subject:'ფიზიკა',grade:11,pool:'phys-g11',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'phys-g11-s2-sum',title:'ფიზიკა — XI კლასი — II სემ. შემაჯამებელი',subject:'ფიზიკა',grade:11,pool:'phys-g11',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'chem-g11-s1',title:'ქიმია — XI კლასი — I სემ.',subject:'ქიმია',grade:11,pool:'chem-g11',count:10,time:28,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'chem-g11-s2',title:'ქიმია — XI კლასი — II სემ.',subject:'ქიმია',grade:11,pool:'chem-g11',count:10,time:28,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'chem-g11-s1-sum',title:'ქიმია — XI კლასი — I სემ. შემაჯამებელი',subject:'ქიმია',grade:11,pool:'chem-g11',count:20,time:48,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'chem-g11-s2-sum',title:'ქიმია — XI კლასი — II სემ. შემაჯამებელი',subject:'ქიმია',grade:11,pool:'chem-g11',count:20,time:48,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'civ-g11-s1',title:'მოქალაქეობა — XI კლასი — I სემ.',subject:'მოქალაქეობა',grade:11,pool:'civ-g11',count:10,time:22,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'civ-g11-s2',title:'მოქალაქეობა — XI კლასი — II სემ.',subject:'მოქალაქეობა',grade:11,pool:'civ-g11',count:10,time:22,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'civ-g11-s1-sum',title:'მოქალაქეობა — XI კლასი — I სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:11,pool:'civ-g11',count:20,time:40,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'civ-g11-s2-sum',title:'მოქალაქეობა — XI კლასი — II სემ. შემაჯამებელი',subject:'მოქალაქეობა',grade:11,pool:'civ-g11',count:20,time:40,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
// Grade 12 reviewed core tests
{id:'math-g12-s1',title:'მათემატიკა — XII კლასი — I სემ.',subject:'მათემატიკა',grade:12,pool:'math-g12',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'math-g12-s2',title:'მათემატიკა — XII კლასი — II სემ.',subject:'მათემატიკა',grade:12,pool:'math-g12',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'math-g12-s1-sum',title:'მათემატიკა — XII კლასი — I სემ. შემაჯამებელი',subject:'მათემატიკა',grade:12,pool:'math-g12',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'math-g12-s2-sum',title:'მათემატიკა — XII კლასი — II სემ. შემაჯამებელი',subject:'მათემატიკა',grade:12,pool:'math-g12',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'geo-g12-s1',title:'ქართული ენა და ლიტერატურა — XII კლასი — I სემ.',subject:'ქართული ენა და ლიტერატურა',grade:12,pool:'geo-g12',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'geo-g12-s2',title:'ქართული ენა და ლიტერატურა — XII კლასი — II სემ.',subject:'ქართული ენა და ლიტერატურა',grade:12,pool:'geo-g12',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'geo-g12-s1-sum',title:'ქართული ენა და ლიტერატურა — XII კლასი — I სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:12,pool:'geo-g12',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'geo-g12-s2-sum',title:'ქართული ენა და ლიტერატურა — XII კლასი — II სემ. შემაჯამებელი',subject:'ქართული ენა და ლიტერატურა',grade:12,pool:'geo-g12',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'eng-g12-s1',title:'ინგლისური — XII კლასი — I სემ.',subject:'ინგლისური',grade:12,pool:'eng-g12',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'eng-g12-s2',title:'ინგლისური — XII კლასი — II სემ.',subject:'ინგლისური',grade:12,pool:'eng-g12',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'eng-g12-s1-sum',title:'ინგლისური — XII კლასი — I სემ. შემაჯამებელი',subject:'ინგლისური',grade:12,pool:'eng-g12',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'eng-g12-s2-sum',title:'ინგლისური — XII კლასი — II სემ. შემაჯამებელი',subject:'ინგლისური',grade:12,pool:'eng-g12',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'hist-g12-s1',title:'ისტორია — XII კლასი — I სემ.',subject:'ისტორია',grade:12,pool:'hist-g12',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'hist-g12-s2',title:'ისტორია — XII კლასი — II სემ.',subject:'ისტორია',grade:12,pool:'hist-g12',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'hist-g12-s1-sum',title:'ისტორია — XII კლასი — I სემ. შემაჯამებელი',subject:'ისტორია',grade:12,pool:'hist-g12',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'hist-g12-s2-sum',title:'ისტორია — XII კლასი — II სემ. შემაჯამებელი',subject:'ისტორია',grade:12,pool:'hist-g12',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
{id:'safety-g12-s1',title:'სამოქალაქო თავდაცვა და უსაფრთხოება — XII კლასი — I სემ.',subject:'სამოქალაქო თავდაცვა და უსაფრთხოება',grade:12,pool:'safety-g12',count:10,time:25,attempts:2,paid:true,semester:1,testType:'mid'},
{id:'safety-g12-s2',title:'სამოქალაქო თავდაცვა და უსაფრთხოება — XII კლასი — II სემ.',subject:'სამოქალაქო თავდაცვა და უსაფრთხოება',grade:12,pool:'safety-g12',count:10,time:25,attempts:2,paid:true,semester:2,testType:'mid'},
{id:'safety-g12-s1-sum',title:'სამოქალაქო თავდაცვა და უსაფრთხოება — XII კლასი — I სემ. შემაჯამებელი',subject:'სამოქალაქო თავდაცვა და უსაფრთხოება',grade:12,pool:'safety-g12',count:20,time:45,attempts:2,paid:true,semester:1,testType:'sum',sumTest:true},
{id:'safety-g12-s2-sum',title:'სამოქალაქო თავდაცვა და უსაფრთხოება — XII კლასი — II სემ. შემაჯამებელი',subject:'სამოქალაქო თავდაცვა და უსაფრთხოება',grade:12,pool:'safety-g12',count:20,time:45,attempts:2,paid:true,semester:2,testType:'sum',sumTest:true},
];
const PAYMENTS_ENABLED=false;
ALL_TESTS.forEach(test=>{test.paid=false;});



// ── User DB & State ───────────────────────────────────────────────────────────
const DEFAULT_USERS=[]; // Production: no bundled plaintext/demo credentials.


// ── Persistence helpers ───────────────────────────────────────────────────────
function _ls(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}}
function _lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){if(e&&e.name==='QuotaExceededError'){showXpToast('⚠️ მეხსიერება სავსეა — შედეგი ვერ შეინახა',null);}}}

function loadPersistedData(){
  const storedUsers=_ls('edutest_users')||[];
  // Merge: default users first, then any extra registered users
  const merged=[...DEFAULT_USERS];
  storedUsers.filter(u=>CUR_USER&&u.email===CUR_USER.email).forEach(u=>{const clean={...u};delete clean.password;if(!merged.find(d=>d.email===clean.email))merged.push(clean);});
  USER_DB.length=0; merged.forEach(u=>USER_DB.push(u));

  const storedResults=_ls('edutest_results')||[];
  SESSION_RESULTS.length=0; storedResults.filter(r=>CUR_USER&&r.userId===CUR_USER.email).forEach(r=>SESSION_RESULTS.push(r));

  const storedVers=_ls('edutest_vers')||{};
  Object.assign(USER_VERS,storedVers);
}

function saveUsers(){_lsSet('edutest_users',USER_DB.filter(u=>CUR_USER&&u.email===CUR_USER.email));}
function saveResults(){_lsSet('edutest_results',SESSION_RESULTS.filter(r=>CUR_USER&&r.userId===CUR_USER.email));}
function saveVers(){_lsSet('edutest_vers',USER_VERS);}

// Admin: delete one user's results
function adminDeleteResults(email){
  const idx=SESSION_RESULTS.findIndex(r=>r.userId===email);
  if(idx<0)return;
  let count=0;
  for(let i=SESSION_RESULTS.length-1;i>=0;i--){if(SESSION_RESULTS[i].userId===email){SESSION_RESULTS.splice(i,1);count++;}}
  saveResults();
  alert('წაიშალა '+count+' შედეგი · '+email);
  renderAdminUsers();
}

// Admin: delete a registered (non-default) user entirely
function adminDeleteUser(email){
  if(DEFAULT_USERS.find(d=>d.email===email)){alert('სისტემური მომხმარებელი ვერ წაიშლება.');return;}
  if(!confirm('წაიშალოს მომხმარებელი '+email+'?'))return;
  const i=USER_DB.findIndex(u=>u.email===email);
  if(i>=0)USER_DB.splice(i,1);
  for(let j=SESSION_RESULTS.length-1;j>=0;j--){if(SESSION_RESULTS[j].userId===email)SESSION_RESULTS.splice(j,1);}
  saveUsers(); saveResults();
  renderAdminUsers();
}


// ══════════════════════════════════════════════════════════════
// AUDIT LOG
// ══════════════════════════════════════════════════════════════
let ADMIN_AUDIT_LOG=[];
function loadAuditLog(){try{ADMIN_AUDIT_LOG=JSON.parse(localStorage.getItem('edutest_audit')||'[]');}catch(e){ADMIN_AUDIT_LOG=[];}}
function saveAuditLog(){try{localStorage.setItem('edutest_audit',JSON.stringify(ADMIN_AUDIT_LOG.slice(0,500)));}catch(e){}}
function logAudit(action,details){
  ADMIN_AUDIT_LOG.unshift({ts:new Date().toISOString(),admin:CUR_USER?CUR_USER.email:'?',action,details});
  saveAuditLog();
}
function renderAdminAudit(){
  loadAuditLog();
  const tbody=document.getElementById('a-audit-tbody');
  if(!tbody)return;
  if(!ADMIN_AUDIT_LOG.length){tbody.innerHTML='<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--gray)">ჩანაწერი არ არის</td></tr>';return;}
  tbody.innerHTML=ADMIN_AUDIT_LOG.map(e=>{
    const d=new Date(e.ts);
    const ds=d.toLocaleDateString('ka-GE')+' '+d.toLocaleTimeString('ka-GE',{hour:'2-digit',minute:'2-digit'});
    return `<tr><td style="font-size:11px;white-space:nowrap">${ds}</td><td style="font-size:11px">${e.admin||'?'}</td><td style="font-weight:500">${e.action}</td><td style="font-size:12px;color:var(--gray)">${e.details}</td></tr>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// ADMIN EDIT USER
// ══════════════════════════════════════════════════════════════
function adminEditUser(email){
  const u=USER_DB.find(x=>x.email===email);
  if(!u)return;
  document.getElementById('aeu-orig-email').value=u.email;
  document.getElementById('aeu-name').value=u.name||'';
  document.getElementById('aeu-email').value=u.email;
  document.getElementById('aeu-role').value=u.role||'student';
  document.getElementById('aeu-grade').value=u.grade||'';
  document.getElementById('aeu-school').value=u.school||'';
  document.getElementById('modal-edit-user').classList.remove('hidden');
}
function saveAdminEditUser(){
  const origEmail=document.getElementById('aeu-orig-email').value;
  const u=USER_DB.find(x=>x.email===origEmail);
  if(!u){alert('მომხმარებელი ვერ მოიძებნა');return;}
  const nn=document.getElementById('aeu-name').value.trim();
  const ne=document.getElementById('aeu-email').value.trim();
  const nr=document.getElementById('aeu-role').value;
  const ng=parseInt(document.getElementById('aeu-grade').value)||null;
  const ns=document.getElementById('aeu-school').value.trim();
  if(!nn||!ne){alert('სახელი და ელ-ფოსტა სავალდებულოა');return;}
  const changes=[];
  if(u.name!==nn)changes.push('სახელი: "'+u.name+'"→"'+nn+'"');
  if(u.email!==ne)changes.push('ელ-ფოსტა: '+u.email+'→'+ne);
  if(u.role!==nr)changes.push('როლი: '+u.role+'→'+nr);
  if(u.grade!==ng)changes.push('კლასი: '+(u.grade||'—')+'→'+(ng||'—'));
  if(u.school!==ns)changes.push('სკოლა: "'+(u.school||'')+'""→"'+ns+'"');
  u.name=nn; u.email=ne; u.role=nr; u.grade=ng; u.school=ns;
  SESSION_RESULTS.forEach(r=>{if(r.userId===origEmail)r.userId=ne;});
  if(CUR_USER&&CUR_USER.email===origEmail)CUR_USER.email=ne;
  logAudit('მომხმარებლის რედაქტირება',changes.length?changes.join(' | '):'ცვლილება არ მომხდარა');
  saveUsers(); saveResults();
  document.getElementById('modal-edit-user').classList.add('hidden');
  renderAdminUsers();
  alert('✅ მომხმარებელი განახლებულია');
}

// ══════════════════════════════════════════════════════════════
// SERVER-SIDE QUESTION BANK ADMINISTRATION
// Answer keys never exist in this browser build. Content changes must be
// performed through trusted server/admin tooling and re-seeded.
// ══════════════════════════════════════════════════════════════
function renderAdminQuestions(){
  const w=document.getElementById('aq-questions-wrap');
  if(w)w.innerHTML='<div class="card" style="padding:16px;color:var(--gray)">🔐 პასუხების გასაღები ბრაუზერში არ იტვირთება. კითხვების არჩევისა და ტესტის შექმნისთვის გამოიყენეთ უსაფრთხო ტესტის შემქმნელი.</div>';
}
function aqLoadTests(){renderAdminQuestions();}
function aqLoadVersions(){renderAdminQuestions();}
function aqLoadQuestions(){renderAdminQuestions();}
function adminEditAnswer(){alert('სწორი პასუხები იცვლება მხოლოდ დაცულ სერვერულ კითხვების ბანკში.');}
function adminResetAnswer(){alert('უსაფრთხო build-ში local answer override გამორთულია.');}

// ══════════════════════════════════════════════════════════════
// XP / LEVEL / STREAK / LEADERBOARD SYSTEM
// ══════════════════════════════════════════════════════════════
const LEVELS=[
  {min:0,   max:99,   name:'🥚 Rookie',      color:'#6b7280'},
  {min:100, max:249,  name:'📗 Learner',      color:'#10b981'},
  {min:250, max:499,  name:'📘 Scholar',      color:'#3b82f6'},
  {min:500, max:999,  name:'🔬 Explorer',     color:'#8b5cf6'},
  {min:1000,max:1999, name:'🎯 Expert',       color:'#f59e0b'},
  {min:2000,max:3999, name:'🚀 Champion',     color:'#ef4444'},
  {min:4000,max:99999,name:'👑 Legendary',    color:'#f97316'},
];
const ACHIEVEMENT_DEFS=[
  {id:'first_test',  icon:'🎉', label:'პირველი ტესტი'},
  {id:'streak3',     icon:'🔥', label:'3 დღე ზედიზედ'},
  {id:'streak7',     icon:'💫', label:'7 დღე ზედიზედ'},
  {id:'streak14',    icon:'🌙', label:'14 დღე ზედიზედ'},
  {id:'streak30',    icon:'🏅', label:'30 დღე ზედიზედ'},
  {id:'excellent',   icon:'🏆', label:'შესანიშნავი შედეგი'},
  {id:'tests5',      icon:'📚', label:'5 ტესტი'},
  {id:'tests20',     icon:'🎓', label:'20 ტესტი'},
  {id:'pct90',       icon:'⭐', label:'90%+ ტესტი'},
  {id:'pct100',      icon:'💯', label:'100% ტესტი'},
  {id:'allsubjects', icon:'🌟', label:'5 საგანი'},
  {id:'freeze_used', icon:'🧊', label:'Streak Freeze გამოყენება'},
  {id:'comeback',    icon:'💪', label:'Comeback — პროგრესი 3 ტესტში'},
  {id:'consistent',  icon:'🎯', label:'სტაბილური — 5 დღე ≥70%'},
  {id:'improver',    icon:'📈', label:'ყველაზე დიდი პროგრესი'},
  {id:'team_player', icon:'🤝', label:'კლასის ჩემპიონი'},
  {id:'subject_ace', icon:'🥇', label:'საგნის ოსტატი — ≥85%'},
  {id:'daily7',      icon:'⚡', label:'7 დღის მისია ზედიზედ'},
  {id:'tests50',     icon:'🎓', label:'50 ტესტი'},
];

// ── Streak Freeze System ──────────────────────────────────────────────────────
function getFreezesAvailable(email){
  try{return parseInt(localStorage.getItem('edutest_freeze_'+email)||'0');}catch(e){return 0;}
}
function addFreeze(email,n=1){
  try{localStorage.setItem('edutest_freeze_'+email,String(getFreezesAvailable(email)+n));}catch(e){}
}
function useFreeze(email){
  const n=getFreezesAvailable(email);
  if(n<=0)return false;
  try{localStorage.setItem('edutest_freeze_'+email,String(n-1));
  localStorage.setItem('edutest_freeze_used_'+email,'1');}catch(e){}
  return true;
}
function grantWeeklyFreeze(email){
  // Give 1 freeze token every 7 consecutive test days
  const streak=getUserStreak(email);
  if(streak>0&&streak%7===0){
    const lastGrant=parseInt(localStorage.getItem('edutest_freeze_grant_'+email)||'0');
    const today=new Date();today.setHours(0,0,0,0);
    if(lastGrant!==today.getTime()){
      addFreeze(email,1);
      try{localStorage.setItem('edutest_freeze_grant_'+email,String(today.getTime()));}catch(e){}
      showXpToast('🧊 Streak Freeze მოიპოვე! ('+getFreezesAvailable(email)+' ცალი)',null);
    }
  }
}

function getLevel(xp){return LEVELS.find(l=>xp>=l.min&&xp<=l.max)||LEVELS[0];}
function calcXP(pct,grade){
  const gradeMultiplier=grade<=4?1:grade<=8?1.5:2;
  return Math.round((pct/100)*50*gradeMultiplier);
}
function getUserXP(email){
  const results=SESSION_RESULTS.filter(r=>r.userId===email);
  const u=USER_DB.find(x=>x.email===email);
  const grade=parseInt((u&&u.grade)||1)||1;
  return results.reduce((sum,r)=>sum+(r.xpEarned||calcXP(r.pct,r.userGrade||grade)),0);
}
function getUserStreak(email){
  const results=SESSION_RESULTS.filter(r=>r.userId===email);
  if(!results.length)return 0;
  const today=new Date();today.setHours(0,0,0,0);
  const days=new Set(results.map(r=>{
    const d=(()=>{const _d=new Date(r.date.split('.').reverse().join('-'));_d.setMinutes(_d.getMinutes()-_d.getTimezoneOffset());return _d;})();
    d.setHours(0,0,0,0);return d.getTime();
  }));
  let streak=0,cur=new Date(today);
  while(true){
    if(days.has(cur.getTime()))streak++;
    else break;
    cur.setDate(cur.getDate()-1);
  }
  return streak;
}
function getUserAchievements(email){
  const results=SESSION_RESULTS.filter(r=>r.userId===email);
  const earned=[];
  if(results.length>=1) earned.push('first_test');
  const streak=getUserStreak(email);
  if(streak>=3) earned.push('streak3');
  if(streak>=7){earned.push('streak7');earned.push('daily7');}
  if(streak>=14) earned.push('streak14');
  if(streak>=30) earned.push('streak30');
  try{if(localStorage.getItem('edutest_freeze_used_'+email)==='1') earned.push('freeze_used');}catch(e){}
  if(results.length>=5) earned.push('tests5');
  if(results.length>=20) earned.push('tests20');
  if(results.length>=50) earned.push('tests50');
  if(results.some(r=>r.pct>=90)) earned.push('pct90');
  if(results.some(r=>r.pct===100)) earned.push('pct100');
  if(results.some(r=>Number(r.pct)>=90)) earned.push('excellent');
  const subjects=new Set(results.map(r=>r.subject));
  if(subjects.size>=5) earned.push('allsubjects');
  // Comeback: 3 consecutive tests each improving on the previous
  if(results.length>=3){
    const sorted=results.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
    for(let i=2;i<sorted.length;i++){
      if(sorted[i].pct>sorted[i-1].pct&&sorted[i-1].pct>sorted[i-2].pct){earned.push('comeback');break;}
    }
  }
  // Consistent: 5 results all ≥70%
  const recent5=results.slice(-5);
  if(recent5.length>=5&&recent5.every(r=>r.pct>=70)) earned.push('consistent');
  // Improver: biggest improvement ever (first vs best)
  if(results.length>=3){
    const first=results[0].pct;const best=Math.max(...results.map(r=>r.pct));
    if(best-first>=20) earned.push('improver');
  }
  // Subject ace: avg ≥85% in any subject with ≥3 results
  const subjectGroups={};
  results.forEach(r=>{if(!subjectGroups[r.subject])subjectGroups[r.subject]=[];subjectGroups[r.subject].push(r.pct);});
  if(Object.values(subjectGroups).some(arr=>arr.length>=3&&arr.reduce((a,b)=>a+b,0)/arr.length>=85)) earned.push('subject_ace');
  return [...new Set(earned)];
}

let _lbTab='class';
function lbSetTab(tab){
  _lbTab=tab;
  document.getElementById('lb-tab-class').className='tab'+(tab==='class'?' act':'');
  document.getElementById('lb-tab-national').className='tab'+(tab==='national'?' act':'');
  renderLeaderboardTable();
}

function renderLeaderboard(){
  if(!CUR_USER)return;
  const email=CUR_USER.email;
  const xp=getUserXP(email);
  const level=getLevel(xp);
  const streak=getUserStreak(email);
  const nextLevel=LEVELS.find(l=>l.min>xp);
  const barPct=nextLevel?Math.round((xp-level.min)/(nextLevel.min-level.min)*100):100;

  const el=id=>document.getElementById(id);
  if(el('lb-my-level'))el('lb-my-level').textContent=level.name;
  if(el('lb-my-xp'))el('lb-my-xp').textContent=xp+' XP';
  if(el('lb-my-streak'))el('lb-my-streak').textContent='🔥 '+streak+' დღე streak';
  if(el('lb-xp-bar'))el('lb-xp-bar').style.width=barPct+'%';
  if(el('lb-xp-next'))el('lb-xp-next').textContent=nextLevel?'შემდეგი დონე: '+nextLevel.min+' XP (კიდევ '+(nextLevel.min-xp)+' XP)':'👑 მაქსიმალური დონე!';

  // Badges
  const achieved=getUserAchievements(email);
  const badgesEl=el('lb-badges');
  if(badgesEl){
    badgesEl.innerHTML=ACHIEVEMENT_DEFS.map(a=>{
      const has=achieved.includes(a.id);
      return `<div title="${a.label}" style="padding:6px 10px;border-radius:20px;font-size:12px;background:${has?'#dbeafe':'#f3f4f6'};color:${has?'#1d4ed8':'#9ca3af'};border:1px solid ${has?'#bfdbfe':'#e5e7eb'};cursor:default">
        ${a.icon} ${a.label}${has?'':' 🔒'}
      </div>`;
    }).join('');
  }

  renderLeaderboardTable();
}

function renderLeaderboardTable(){
  if(!CUR_USER)return;
  const tbody=document.getElementById('lb-tbody');
  const rankEl=document.getElementById('lb-my-rank');
  if(!tbody)return;
  const u=USER_DB.find(x=>x.email===CUR_USER.email);
  const myGrade=u?u.grade:null;

  let students=USER_DB.filter(x=>x.role==='student' && (x.email===CUR_USER.email || x.leaderboardOptIn===true));
  if(_lbTab==='class'&&myGrade){
    students=students.filter(x=>x.grade===myGrade);
  }

  const rows=students.map(s=>{
    const xp=getUserXP(s.email);
    const results=SESSION_RESULTS.filter(r=>r.userId===s.email);
    const avgPct=results.length?Math.round(results.reduce((a,r)=>a+r.pct,0)/results.length):0;
    return{email:s.email,name:s.name,xp,level:getLevel(xp),tests:results.length,avgPct};
  }).sort((a,b)=>b.xp-a.xp||b.avgPct-a.avgPct);

  const myRank=rows.findIndex(r=>r.email===CUR_USER.email)+1;
  if(rankEl)rankEl.textContent='#'+(myRank||'—');

  const medals=['🥇','🥈','🥉'];
  tbody.innerHTML=rows.map((r,i)=>{
    const isMe=r.email===CUR_USER.email;
    return `<tr style="${isMe?'background:#eff6ff;font-weight:600':''}">
      <td style="text-align:center;font-size:16px">${medals[i]||i+1}</td>
      <td>${isMe?edutestEscapeHtml(r.name):('მოსწავლე #'+Math.abs(edutestHashStr(r.email)).toString(36).slice(0,4).toUpperCase())}${isMe?' <span style="font-size:10px;color:#3b82f6">(შენ)</span>':''}</td>
      <td style="font-weight:700;color:#1d4ed8">${r.xp} XP</td>
      <td style="font-size:12px">${r.level.name}</td>
      <td style="color:var(--gray)">${r.tests}</td>
      <td>${r.avgPct}%</td>
    </tr>`;
  }).join('');
  if(!rows.length)tbody.innerHTML='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray)">მოსწავლეები ჯერ არ არიან</td></tr>';
}

// Show XP earned popup after test
function showXpToast(xp,levelUp){
  const d=document.createElement('div');
  d.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1d4ed8;color:#fff;padding:12px 20px;border-radius:12px;font-weight:700;z-index:9999;animation:fadeIn .3s ease;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3)';
  d.innerHTML='+'+xp+' XP &#127381;'+(levelUp?'<br><span style="font-size:13px">&#127881; ახალი დონე: '+levelUp+'</span>':'');
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),3000);
}


// ══════════════════════════════════════════════════════════════
// PRIZE CONFIG SYSTEM
// ══════════════════════════════════════════════════════════════
const DEFAULT_PRIZE_CONFIG={
  active:false,period:'2025–2026 სასწავლო წელი',condition:'xp',
  prizes:[
    {place:1,medal:'🥇',reward:'1000 ₾',desc:'ფულადი ჯილდო + საპატიო სიგელი'},
    {place:2,medal:'🥈',reward:'700 ₾', desc:'ფულადი ჯილდო + საპატიო სიგელი'},
    {place:3,medal:'🥉',reward:'500 ₾', desc:'ფულადი ჯილდო + საპატიო სიგელი'},
  ],
  note:'გამარჯვებული გამოვლინდება სასწავლო წლის ბოლოს.'
};
let PRIZE_CONFIG={...DEFAULT_PRIZE_CONFIG};
function loadPrizeConfig(){PRIZE_CONFIG={...DEFAULT_PRIZE_CONFIG,prizes:DEFAULT_PRIZE_CONFIG.prizes.map(p=>({...p}))};}
function savePrizeConfig(){return false;}
loadPrizeConfig();
function renderAdminPrizeForm(){
  const el=id=>document.getElementById(id);
  if(el('prize-active'))el('prize-active').value=String(PRIZE_CONFIG.active);
  if(el('prize-period'))el('prize-period').value=PRIZE_CONFIG.period||'';
  if(el('prize-condition'))el('prize-condition').value=PRIZE_CONFIG.condition||'xp';
  if(el('prize-note'))el('prize-note').value=PRIZE_CONFIG.note||'';
  PRIZE_CONFIG.prizes.forEach((p,i)=>{
    const ri=document.getElementById('prize-'+(i+1)+'-reward');
    const di=document.getElementById('prize-'+(i+1)+'-desc');
    if(ri)ri.value=p.reward||'';if(di)di.value=p.desc||'';
  });
}
function adminSavePrizes(){
  PRIZE_CONFIG.active=false;
  const active=document.getElementById('prize-active');if(active)active.value='false';
  alert('ჯილდოების მართვა სატესტო ეტაპზე გამორთულია. ცვლილება არ შენახულა.');
}
function renderLeaderboardPrizeBanner(){
  const banner=document.getElementById('lb-prize-banner');const pb=document.getElementById('lb-period-badge');
  if(!banner)return;
  if(!PRIZE_CONFIG.active){banner.style.display='none';if(pb)pb.style.display='none';return;}
  banner.style.display='block';
  if(pb){pb.style.display='block';pb.textContent=PRIZE_CONFIG.period||'';}
  const rows=document.getElementById('lb-prize-rows');
  if(rows)rows.innerHTML=PRIZE_CONFIG.prizes.map(p=>`<div style="display:flex;align-items:center;gap:10px"><span style="font-size:18px">${p.medal}</span><span style="font-weight:700;color:#92400e">${p.reward}</span><span style="font-size:12px;color:#78350f">${p.desc||''}</span></div>`).join('');
  const note=document.getElementById('lb-prize-note');if(note)note.textContent=PRIZE_CONFIG.note||'';
}

// ══════════════════════════════════════════════════════════════
// DAILY CHALLENGE
// ══════════════════════════════════════════════════════════════
let _dailyChallengeTest=null,_isDailyBonus=false;
function getDailyTestForUser(email){
  const today=new Date().toISOString().slice(0,10);
  const u=USER_DB.find(x=>x.email===email);
  const grade=parseInt((u&&u.grade)||1)||1;
  const gradeTests=ALL_TESTS.filter(t=>t&&(parseInt(t.grade)===grade||t.grade===String(grade)));
  if(!gradeTests.length)return null;
  let hash=0;for(const c of today+email)hash=(hash*31+c.charCodeAt(0))&0xfffff;
  return gradeTests[Math.abs(hash)%gradeTests.length];
}
function hasDoneDaily(email){try{return localStorage.getItem('edutest_daily_'+email+'_'+new Date().toISOString().slice(0,10))==='1';}catch(e){return false;}}
function markDailyDone(email){try{localStorage.setItem('edutest_daily_'+email+'_'+new Date().toISOString().slice(0,10),'1');}catch(e){}}
