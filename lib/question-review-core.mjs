export class ReviewError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export async function questionVersion(q){
  const body=JSON.stringify([q.id,q.grade,q.subject,q.semester,q.topic,q.question_type,q.points,q.public_payload_json,q.answer_key_json,q.explanation]);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function createReviewService({db,now=Date.now}){
  const query=`SELECT q.*,k.answer_key_json,k.explanation FROM assessment_questions q INNER JOIN assessment_answer_keys k ON k.question_id=q.id`;
  return {
    async list({grade=1,after='',questionId=''}){
      const rows=(await db.prepare(query+` WHERE q.grade=? AND q.id>?${questionId?' AND q.id=?':''} ORDER BY q.id LIMIT 21`)
        .bind(...(questionId?[grade,after,questionId]:[grade,after])).all()).results||[];
      const items=[];
      for(const q of rows.slice(0,20)){
        const version=await questionVersion(q);
        const history=(await db.prepare(`SELECT r.content_version,r.decision,r.note,r.reviewed_at,u.name AS reviewer FROM question_review_events r
          LEFT JOIN users u ON u.id=r.reviewer_id WHERE r.question_id=? ORDER BY r.reviewed_at DESC,r.id DESC LIMIT 5`).bind(q.id).all()).results||[];
        items.push({id:q.id,grade:q.grade,subject:q.subject,semester:q.semester,topic:q.topic,version,question:JSON.parse(q.public_payload_json),
          answer:JSON.parse(q.answer_key_json),explanation:q.explanation,history,currentDecision:history[0]?.content_version===version?history[0].decision:'unreviewed'});
      }
      return {items,next:rows.length>20?items.at(-1).id:null};
    },
    async record(reviewerId,body){
      if(typeof body?.questionId!=='string'||body.questionId.length>200||!['approved','needs_changes'].includes(body.decision)||typeof body.version!=='string')throw new ReviewError('შემოწმების მონაცემები არასწორია.');
      const note=typeof body.note==='string'?body.note.trim():'';
      if(note.length<10||note.length>2000)throw new ReviewError('დაწერეთ შემოწმების შენიშვნა (10–2000 სიმბოლო).');
      if(body.decision==='approved'&&(body.checks?.answer!==true||body.checks?.wording!==true||body.checks?.grade!==true))throw new ReviewError('დაადასტურეთ პასუხის, ფორმულირებისა და კლასის შესაბამისობის შემოწმება.');
      const q=await db.prepare(query+' WHERE q.id=?').bind(body.questionId).first();
      if(!q)throw new ReviewError('კითხვა ვერ მოიძებნა.',404);
      if(await questionVersion(q)!==body.version)throw new ReviewError('კითხვა შეიცვალა. თავიდან გახსენით მიმდინარე ვერსია.',409);
      // Compare exact content again in the INSERT, so concurrent editing cannot
      // attach an approval to a version the reviewer did not see.
      const result=await db.prepare(`INSERT INTO question_review_events(id,question_id,content_version,reviewer_id,decision,note,reviewed_at)
        SELECT ?,q.id,?,?,?,?,? FROM assessment_questions q INNER JOIN assessment_answer_keys k ON k.question_id=q.id
        WHERE q.id=? AND q.public_payload_json=? AND q.grade=? AND q.subject=? AND q.semester IS ? AND q.topic=?
        AND q.question_type=? AND q.points=? AND k.answer_key_json=? AND k.explanation=?`)
        .bind(crypto.randomUUID(),body.version,reviewerId,body.decision,note,now(),q.id,q.public_payload_json,q.grade,q.subject,q.semester,q.topic,q.question_type,q.points,q.answer_key_json,q.explanation).run();
      if(Number(result.meta?.changes)!==1)throw new ReviewError('კითხვა შეიცვალა. თავიდან გახსენით მიმდინარე ვერსია.',409);
      return {saved:true,decision:body.decision};
    },
  };
}
