PRAGMA foreign_keys=ON;

-- VII–XII კლასებში მათემატიკა ერთ საგნად რჩება. ძველი ალგებრა/გეომეტრიის
-- ჩანაწერები მხოლოდ თავსებადობისთვის ინახება, მაგრამ კატალოგში აღარ ქვეყნდება.
UPDATE assessment_questions
SET subject='მათემატიკა',
    public_payload_json=json_set(public_payload_json, '$.subject', 'მათემატიკა'),
    mapping_status='exact',
    updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE grade>=7 AND subject IN ('ალგებრა','გეომეტრია');

UPDATE assessment_tests
SET published=0,
    updated_at=CAST(strftime('%s','now') AS INTEGER)*1000
WHERE is_custom=0 AND grade>=7 AND subject IN ('ალგებრა','გეომეტრია');

INSERT OR IGNORE INTO assessment_tests
  (id,source_test_id,title,subject,grade,semester,source_pool,question_count,time_minutes,attempts_allowed,test_type,published,is_custom,created_by,created_at,updated_at)
SELECT
  'sv-' || source_test_id,
  source_test_id,
  'მათემატიკა — ' || grade || ' კლასი — ' || semester || ' სემ.' || CASE WHEN test_type='sum' THEN ' შემაჯამებელი' ELSE '' END,
  'მათემატიკა',
  grade,
  semester,
  source_pool,
  question_count,
  time_minutes,
  attempts_allowed,
  test_type,
  1,
  0,
  NULL,
  created_at,
  CAST(strftime('%s','now') AS INTEGER)*1000
FROM assessment_tests
WHERE is_custom=0 AND grade>=7 AND subject='ალგებრა' AND source_test_id IS NOT NULL;
