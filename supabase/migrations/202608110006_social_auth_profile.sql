-- Safely complete profiles created through Google, Microsoft (Azure), or Facebook OAuth.
begin;

alter table public.profiles add column if not exists profile_completed_at timestamptz;

update public.profiles
set profile_completed_at = coalesce(profile_completed_at, updated_at, join_date, now())
where profile_completed_at is null;

create or replace function public.complete_social_profile(
  p_name text,
  p_requested_role text,
  p_grade text,
  p_school text,
  p_birth_date date,
  p_guardian_email text,
  p_terms_version text,
  p_privacy_version text,
  p_guardian_consent_version text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_name text := trim(coalesce(p_name,''));
  v_role text := case when p_requested_role='teacher' then 'pending_teacher' else 'student' end;
  v_grade text := trim(coalesce(p_grade,''));
  v_school text := left(trim(coalesce(p_school,'')),120);
  v_guardian text := lower(trim(coalesce(p_guardian_email,'')));
  v_user_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_under16 boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_profile from public.profiles where id=v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.profile_completed_at is not null then raise exception 'Profile already completed'; end if;
  if v_profile.role <> 'student' or coalesce(v_profile.grade,'') <> '' or v_profile.birth_date is not null then
    raise exception 'Profile is not eligible for social completion';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100 then raise exception 'Invalid name'; end if;
  if p_requested_role not in ('student','teacher') then raise exception 'Invalid role'; end if;

  if v_role='student' then
    if v_grade !~ '^(?:[1-9]|1[0-2])$' then raise exception 'Invalid grade'; end if;
    if p_birth_date is null or p_birth_date > current_date - interval '5 years' or p_birth_date < current_date - interval '100 years' then
      raise exception 'Invalid birth date';
    end if;
    v_under16 := p_birth_date > (current_date - interval '16 years')::date;
    if v_under16 and (v_guardian='' or v_guardian=v_user_email or position('@' in v_guardian)=0) then
      raise exception 'Guardian email is required';
    end if;
  else
    v_grade := '';
    if p_birth_date is null or p_birth_date > current_date - interval '18 years' or p_birth_date < current_date - interval '100 years' then
      raise exception 'Teacher must be an adult';
    end if;
    v_guardian := '';
  end if;

  update public.profiles set
    name=v_name, role=v_role, grade=v_grade, school=v_school, birth_date=p_birth_date,
    guardian_email=case when v_under16 then v_guardian else null end,
    guardian_verified_at=case when v_under16 then null else guardian_verified_at end,
    terms_version=p_terms_version, terms_accepted_at=now(),
    privacy_version=p_privacy_version, privacy_acknowledged_at=now(),
    profile_completed_at=now(), updated_at=now(), last_active_at=now()
  where id=v_uid;

  if v_under16 then
    insert into public.guardian_consent_requests(child_user_id,child_display_name,guardian_email,consent_version,status)
    values(v_uid,v_name,v_guardian,p_guardian_consent_version,'pending');
    insert into public.guardian_consent_log(child_user_id,guardian_email,action,consent_version)
    values(v_uid,v_guardian,'requested',p_guardian_consent_version);
  end if;

  return jsonb_build_object('role',v_role,'under16',v_under16,'guardian_email',case when v_under16 then v_guardian else null end);
end;
$$;

revoke all on function public.complete_social_profile(text,text,text,text,date,text,text,text,text) from public;
grant execute on function public.complete_social_profile(text,text,text,text,date,text,text,text,text) to authenticated;

commit;
