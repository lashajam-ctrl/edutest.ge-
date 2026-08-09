UPDATE assessment_questions
SET public_payload_json = json_set(
      public_payload_json,
      '$.text',
      'სიტყვა „ბურთი“ ასო ___-თი იწყება.'
    ),
    updated_at = 1786290000000
WHERE id = 'g1g2_14';

UPDATE assessment_answer_keys
SET answer_key_json = '{"blanks":["ბ"]}',
    explanation = 'სიტყვა „ბურთი“ ასო „ბ“-თი იწყება.',
    updated_at = 1786290000000
WHERE question_id = 'g1g2_14';
