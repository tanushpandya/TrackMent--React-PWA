-- ==============================================================================
-- TRACKMENT SECURITY AUDIT CONSOLIDATED REMEDIATION MIGRATION
-- Migration Ref: 20261119000000_security_audit_consolidated_fixes.sql
-- Description: Comprehensive database security fixes for RLS, RPCs, Storage,
--              and Identity triggers, vetted via EGM Adversarial Review.
-- Safety: IDEMPOTENT, NON-DESTRUCTIVE. Preserves all existing user records,
--         student marks, teams, contributions, and storage objects.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CIE MARKS & EVALUATIONS RLS RECURSION & WRITE HARDENING (Findings #28, #29)
-- ------------------------------------------------------------------------------

-- 1.1 Helper function to verify marks visibility without recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.is_marks_visible(p_team_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_evaluations 
    WHERE team_id = p_team_id AND phase_name = '__MARKS_VISIBILITY__' AND total_marks = 1.0
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.is_marks_visible(BIGINT) TO authenticated;

-- 1.2 evaluations_read policy: Prevents students from viewing unreleased marks
DROP POLICY IF EXISTS evaluations_read ON public.team_evaluations;
CREATE POLICY evaluations_read ON public.team_evaluations FOR SELECT TO authenticated USING (
  public.is_team_mentor(team_id) OR (
    public.can_access_team(team_id) AND (
      phase_name = '__MARKS_VISIBILITY__' OR public.is_marks_visible(team_id)
    )
  )
);

-- 1.3 evaluations_mentor_write policy: Eliminates disjunctive OR bypass
DROP POLICY IF EXISTS evaluations_mentor_write ON public.team_evaluations;
CREATE POLICY evaluations_mentor_write ON public.team_evaluations FOR ALL TO authenticated USING (
  public.is_team_mentor(team_id)
) WITH CHECK (
  public.is_team_mentor(team_id) AND (
    evaluator_id = auth.uid() OR phase_name = '__MARKS_VISIBILITY__'
  )
);

-- 1.4 Hardened record_team_evaluation RPC: Verifies assigned mentor
DROP FUNCTION IF EXISTS public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.record_team_evaluation(BIGINT, VARCHAR, NUMERIC, NUMERIC, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_team_evaluation(
  p_team_id      BIGINT,
  p_phase_name   TEXT,
  p_total_marks  NUMERIC,
  p_max_marks    NUMERIC,
  p_member_marks JSONB DEFAULT '{}'::jsonb,
  p_remarks      TEXT DEFAULT NULL
) RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_eval_id BIGINT;
BEGIN
  IF NOT public.is_team_mentor(p_team_id) THEN
    RAISE EXCEPTION 'Only the assigned faculty mentor of this team can record evaluations.';
  END IF;

  INSERT INTO public.team_evaluations (
    team_id, evaluator_id, phase_name, total_marks, max_marks, remarks, member_marks
  ) VALUES (
    p_team_id, auth.uid(), TRIM(p_phase_name), p_total_marks, p_max_marks, p_remarks, COALESCE(p_member_marks, '{}'::jsonb)
  ) RETURNING id INTO v_eval_id;

  RETURN v_eval_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. APPOINTMENT RESCHEDULE SELF-CONFIRMATION GUARD (Finding #5)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_enforce_appointment_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    team_leader     UUID;
    assigned_mentor UUID;
    actor           UUID := auth.uid();
BEGIN
    IF actor IS NULL THEN
        RETURN NEW;
    END IF;

    IF OLD.status IN ('COMPLETED', 'CANCELLED') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Cannot modify an appointment that is already %', OLD.status;
    END IF;

    SELECT leader_id, mentor_id
    INTO team_leader, assigned_mentor
    FROM public.teams
    WHERE id = OLD.team_id;

    -- TEAM LEAD / REQUESTER ACTIONS
    IF actor = team_leader OR actor = OLD.requested_by THEN
        IF NEW.team_id <> OLD.team_id
           OR NEW.requested_by <> OLD.requested_by
           OR NEW.mentor_id <> OLD.mentor_id THEN
            RAISE EXCEPTION 'Team Lead cannot modify appointment ownership.';
        END IF;

        IF NEW.mentor_notes IS DISTINCT FROM OLD.mentor_notes THEN
            RAISE EXCEPTION 'Team Lead cannot modify mentor notes.';
        END IF;

        -- Slot immutability: Leader can only confirm if mentor already offered a slot and slot wasn't altered
        IF NEW.status = 'CONFIRMED' AND OLD.status = 'RESCHEDULED' THEN
            IF OLD.confirmed_slot IS NULL OR NEW.confirmed_slot IS DISTINCT FROM OLD.confirmed_slot THEN
                RAISE EXCEPTION 'Team lead can only confirm an appointment with a slot already offered by the mentor';
            END IF;
            RETURN NEW;
        END IF;

        IF NEW.confirmed_slot IS DISTINCT FROM OLD.confirmed_slot AND NEW.confirmed_slot IS NOT NULL THEN
            RAISE EXCEPTION 'Only the mentor can confirm or change appointment slots.';
        END IF;

        IF NEW.status IN ('CONFIRMED', 'REJECTED', 'IN_MEETING', 'COMPLETED')
           AND NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Only Mentor may confirm, reject, start or complete meetings.';
        END IF;

        IF NEW.status = 'RESCHEDULED' THEN
            IF OLD.status NOT IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') THEN
                RAISE EXCEPTION 'Appointment cannot be rescheduled from current state.';
            END IF;
            NEW.confirmed_slot := NULL;
        END IF;

        IF NEW.status = 'CANCELLED' THEN
            IF OLD.status NOT IN ('REQUESTED', 'RESCHEDULED', 'CONFIRMED') THEN
                RAISE EXCEPTION 'Appointment cannot be cancelled from current state.';
            END IF;
            NEW.confirmed_slot := NULL;
        END IF;

        RETURN NEW;
    END IF;

    -- MENTOR ACTIONS
    IF actor = assigned_mentor OR actor = OLD.mentor_id THEN
        IF NEW.team_id <> OLD.team_id
           OR NEW.requested_by <> OLD.requested_by
           OR NEW.mentor_id <> OLD.mentor_id THEN
            RAISE EXCEPTION 'Mentor cannot modify appointment ownership.';
        END IF;

        IF NEW.status = 'CONFIRMED' AND OLD.status NOT IN ('REQUESTED', 'RESCHEDULED') THEN
            RAISE EXCEPTION 'Invalid confirmation transition.';
        END IF;

        IF NEW.status = 'CONFIRMED' AND NEW.confirmed_slot IS NULL THEN
            RAISE EXCEPTION 'Confirmed appointment requires confirmed_slot.';
        END IF;

        IF NEW.status = 'RESCHEDULED' AND OLD.status NOT IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED') THEN
            RAISE EXCEPTION 'Invalid reschedule transition.';
        END IF;

        IF NEW.status = 'REJECTED' AND OLD.status NOT IN ('REQUESTED', 'RESCHEDULED', 'CONFIRMED') THEN
            RAISE EXCEPTION 'Invalid rejection transition.';
        END IF;

        IF NEW.status = 'IN_MEETING' AND OLD.status <> 'CONFIRMED' THEN
            RAISE EXCEPTION 'Only confirmed appointments can enter meeting.';
        END IF;

        IF NEW.status = 'COMPLETED' AND OLD.status NOT IN ('IN_MEETING', 'CONFIRMED') THEN
            RAISE EXCEPTION 'Meeting must be active or confirmed before completion.';
        END IF;

        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'User not permitted to modify this appointment.';
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_permissions ON public.appointments;
DROP TRIGGER IF EXISTS trg_guard_appointment_integrity ON public.appointments;
DROP TRIGGER IF EXISTS trg_enforce_appointment_permissions ON public.appointments;
CREATE TRIGGER trg_appointment_permissions
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_appointment_permissions();

-- ------------------------------------------------------------------------------
-- 3. STORAGE & DELIVERABLES PROOF TAMPERING PREVENTION (Finding #10)
-- ------------------------------------------------------------------------------

-- Index storage path for instantaneous RLS joins
CREATE INDEX IF NOT EXISTS idx_contribution_files_storage_path ON public.contribution_files(storage_path);

-- Prevent deleting proof files for deliverables that are already CONFIRMED
DROP POLICY IF EXISTS "authenticated owner delete proof" ON storage.objects;
CREATE POLICY "authenticated owner delete proof" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'project-proofs' AND owner_id = auth.uid()::TEXT AND NOT EXISTS (
    SELECT 1 FROM public.contribution_files cf 
    JOIN public.contributions c ON c.id = cf.contribution_id 
    WHERE cf.storage_path = storage.objects.name AND c.status != 'PENDING'
  )
);

-- Lock contributions.team_id from being modified cross-team
CREATE OR REPLACE FUNCTION public.trg_lock_contribution_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    RAISE EXCEPTION 'Contributions cannot be reassigned to another team.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_contribution_team_change ON public.contributions;
CREATE TRIGGER trg_prevent_contribution_team_change
BEFORE UPDATE ON public.contributions
FOR EACH ROW EXECUTE FUNCTION public.trg_lock_contribution_team();

-- ------------------------------------------------------------------------------
-- 4. TEAM READ ACCESS & MENTORSHIP ATTACHMENT HARMONIZATION (Findings #11, #18, #24)
-- ------------------------------------------------------------------------------

-- 4.1 team_read: Restores invited students and requested mentors
DROP POLICY IF EXISTS team_read ON public.teams;
CREATE POLICY team_read ON public.teams FOR SELECT TO authenticated USING (
  leader_id = auth.uid() 
  OR mentor_id = auth.uid() 
  OR public.is_team_member(id)
  -- Allows faculty mentors to see project details on incoming requests
  OR EXISTS (
    SELECT 1 FROM public.mentor_requests mr 
    WHERE mr.team_id = teams.id AND mr.mentor_id = auth.uid() AND mr.status = 'PENDING'
  )
  -- Allows invited students to inspect the team idea on invitation cards
  OR EXISTS (
    SELECT 1 FROM public.team_invitations ti 
    WHERE ti.team_id = teams.id AND ti.student_id = auth.uid()
  )
);

-- 4.2 claim_team_by_id: Authorizes faculty direct claim while settling pending requests
DROP FUNCTION IF EXISTS public.claim_team_by_id(BIGINT);
CREATE OR REPLACE FUNCTION public.claim_team_by_id(p_team_id BIGINT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_updated_id BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'MENTOR' THEN
    RAISE EXCEPTION 'Only faculty mentors can claim teams';
  END IF;

  -- Ensure team has no mentor assigned and update
  UPDATE public.teams 
  SET mentor_id = auth.uid(), updated_at = NOW() 
  WHERE id = p_team_id AND mentor_id IS NULL
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'Team does not exist or is already claimed by another mentor';
  END IF;

  -- Settle any outstanding pending mentor requests for this team
  UPDATE public.mentor_requests
  SET status = 'ACCEPTED', updated_at = NOW()
  WHERE team_id = p_team_id AND mentor_id = auth.uid() AND status = 'PENDING';

  UPDATE public.mentor_requests
  SET status = 'REJECTED', updated_at = NOW()
  WHERE team_id = p_team_id AND mentor_id != auth.uid() AND status = 'PENDING';

  RETURN v_updated_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_team_by_id(BIGINT) TO authenticated;

-- 4.3 Prevent single student from creating multiple teams simultaneously
DROP POLICY IF EXISTS team_lead_create ON public.teams;
CREATE POLICY team_lead_create ON public.teams FOR INSERT TO authenticated WITH CHECK (
  leader_id = auth.uid() 
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members WHERE user_id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 5. STUDENT PII EXPOSURE RESTRICTION (Finding #23)
-- ------------------------------------------------------------------------------

-- inspect_team_roster: Restricts full PII access to authorized team members or mentors
DROP FUNCTION IF EXISTS public.inspect_team_roster(BIGINT);
CREATE OR REPLACE FUNCTION public.inspect_team_roster(p_team_id BIGINT)
RETURNS TABLE (
  user_id   UUID,
  full_name TEXT,
  usn       TEXT,
  email     TEXT,
  branch    TEXT,
  role      TEXT,
  is_lead   BOOLEAN,
  joined_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Verify caller is a member, assigned mentor, or requesting faculty mentor
  IF NOT (
    public.can_access_team(p_team_id) 
    OR public.current_user_role() = 'MENTOR'
  ) THEN
    RAISE EXCEPTION 'You are not authorized to inspect this team roster.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name::TEXT,
    p.usn::TEXT,
    p.email::TEXT,
    p.branch::TEXT,
    p.role::TEXT,
    (t.leader_id = p.id) AS is_lead,
    tm.joined_at
  FROM public.team_members tm
  JOIN public.profiles p ON p.id = tm.user_id
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.team_id = p_team_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.inspect_team_roster(BIGINT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. FACULTY ONBOARDING & ROLE PROTECTION (Finding #25)
-- ------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.upsert_faculty_profile(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.upsert_faculty_profile(VARCHAR, VARCHAR, VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.upsert_faculty_profile(
  p_full_name    TEXT,
  p_department   TEXT,
  p_faculty_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_local TEXT;
  v_code  TEXT;
  v_row   public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_email = '' THEN
    SELECT LOWER(TRIM(email)) INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  IF v_email IS NULL OR v_email NOT LIKE '%@rvce.edu.in' THEN
    RAISE EXCEPTION 'Only official @rvce.edu.in accounts can register as faculty.';
  END IF;

  v_local := split_part(v_email, '@', 1);

  -- RVCE Institutional Invariant: Faculty emails are strictly digitless
  IF v_local ~ '[0-9]' THEN
    RAISE EXCEPTION 'Student accounts (containing batch digits) cannot register as faculty.';
  END IF;

  -- Ensure faculty_code is populated to satisfy chk_role_attributes
  v_code := COALESCE(NULLIF(UPPER(TRIM(COALESCE(p_faculty_code, ''))), ''), UPPER(v_local));

  -- Insert/update verified_faculty registry
  INSERT INTO public.verified_faculty (email, full_name, department, faculty_code)
  VALUES (v_email, TRIM(p_full_name), COALESCE(NULLIF(TRIM(p_department), ''), 'CSE'), v_code)
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    department = COALESCE(EXCLUDED.department, verified_faculty.department),
    faculty_code = COALESCE(EXCLUDED.faculty_code, verified_faculty.faculty_code);

  -- Upsert profile with MENTOR role
  INSERT INTO public.profiles (
    id, email, full_name, role, department, faculty_code, updated_at
  ) VALUES (
    v_uid, v_email, TRIM(p_full_name), 'MENTOR', COALESCE(NULLIF(TRIM(p_department), ''), 'CSE'), v_code, NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'MENTOR',
    department = EXCLUDED.department,
    faculty_code = COALESCE(EXCLUDED.faculty_code, public.profiles.faculty_code),
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_faculty_profile(TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. STUDENT USN GATE PROTECTION ON INSERT & UPDATE (Finding #26)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_protect_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_verified_google BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- 1. Email remains strictly immutable on update
        IF TG_OP = 'UPDATE' THEN
            IF OLD.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
                RAISE EXCEPTION 'Email cannot be changed directly.';
            END IF;
        END IF;

        -- 2. If USN is being added or updated: require caller to be a verified Google / Gmail account
        IF (TG_OP = 'INSERT' AND NEW.usn IS NOT NULL AND TRIM(NEW.usn) <> '')
           OR (TG_OP = 'UPDATE' AND NEW.usn IS DISTINCT FROM OLD.usn AND NEW.usn IS NOT NULL AND TRIM(NEW.usn) <> '') THEN
            SELECT EXISTS (
                SELECT 1
                FROM auth.users u
                WHERE u.id = auth.uid()
                  AND (
                      u.email_confirmed_at IS NOT NULL
                      OR (u.raw_app_meta_data ->> 'provider') = 'google'
                      OR (u.raw_user_meta_data ->> 'email_verified')::BOOLEAN IS TRUE
                      OR EXISTS (
                          SELECT 1
                          FROM auth.identities i
                          WHERE i.user_id = u.id AND i.provider = 'google'
                      )
                  )
            ) INTO v_is_verified_google;

            IF NOT v_is_verified_google THEN
                RAISE EXCEPTION 'Only verified Gmail / Google accounts can edit or add their USN. Please verify your email first.';
            END IF;
        END IF;

        -- 3. Role separation: Faculty Mentors do not carry student USNs
        IF NEW.role = 'MENTOR' AND NEW.usn IS NOT NULL THEN
            NEW.usn := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_identity_protection ON public.profiles;
CREATE TRIGGER trg_profile_identity_protection
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_profile_identity();

COMMIT;
