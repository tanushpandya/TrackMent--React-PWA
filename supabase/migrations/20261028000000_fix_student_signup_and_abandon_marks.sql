-- ==============================================================================
-- TRACKMENT: 20261028000000_fix_student_signup_and_abandon_marks.sql
-- 1. Atomic upsert_student_profile RPC to prevent duplicate USN/email collisions
--    during first-time student onboarding (including pre-seeded account rebinding).
-- 2. Clear/reset team evaluations and academic marks when a mentor abandons a team.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. UPSERT STUDENT PROFILE RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_student_profile(
    p_full_name  TEXT,
    p_usn        TEXT,
    p_branch     TEXT,
    p_section    TEXT DEFAULT NULL,
    p_semester   INT DEFAULT NULL,
    p_skills     TEXT[] DEFAULT NULL,
    p_interests  TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid              UUID := auth.uid();
    v_email            TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_usn              TEXT := UPPER(TRIM(COALESCE(p_usn, '')));
    v_existing_id      UUID;
    v_usn_owner_id     UUID;
    v_usn_owner_email  TEXT;
    v_row              public.profiles%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated.';
    END IF;

    IF v_email = '' THEN
        SELECT LOWER(TRIM(email)) INTO v_email FROM auth.users WHERE id = v_uid;
    END IF;

    IF v_email = '' OR v_email IS NULL THEN
        RAISE EXCEPTION 'User email could not be resolved from session.';
    END IF;

    -- Validate USN format
    IF v_usn !~ '^(1R[VZ]|RVCE)[0-9]{2}[A-Z]{2,4}[0-9]{3}$' THEN
        RAISE EXCEPTION 'Invalid USN format. Please check your institutional USN (1RV... or RVCE...).';
    END IF;

    -- Check if another user owns this USN
    SELECT id, email INTO v_usn_owner_id, v_usn_owner_email
    FROM public.profiles
    WHERE UPPER(TRIM(usn)) = v_usn
      AND id <> v_uid
      AND LOWER(email) <> v_email;

    IF v_usn_owner_id IS NOT NULL THEN
        RAISE EXCEPTION 'This USN is already registered to another student account.';
    END IF;

    -- Check if a seeded/pre-existing profile row exists with this email under a different id
    SELECT id INTO v_existing_id
    FROM public.profiles
    WHERE LOWER(email) = v_email;

    IF v_existing_id IS NOT NULL AND v_existing_id <> v_uid THEN
        -- Rebind foreign keys referencing the old pre-seeded profile id to the current authenticated uid
        UPDATE public.teams SET leader_id = v_uid WHERE leader_id = v_existing_id;
        UPDATE public.teams SET mentor_id = v_uid WHERE mentor_id = v_existing_id;
        UPDATE public.team_members SET user_id = v_uid WHERE user_id = v_existing_id;
        UPDATE public.join_requests SET student_id = v_uid WHERE student_id = v_existing_id;
        UPDATE public.team_invitations SET student_id = v_uid WHERE student_id = v_existing_id;
        UPDATE public.direct_messages SET from_user_id = v_uid WHERE from_user_id = v_existing_id;
        UPDATE public.direct_messages SET to_user_id = v_uid WHERE to_user_id = v_existing_id;
        UPDATE public.audit_logs SET user_id = v_uid WHERE user_id = v_existing_id;
        UPDATE public.team_evaluations SET evaluator_id = v_uid WHERE evaluator_id = v_existing_id;
        UPDATE public.team_formation_requests SET requested_by = v_uid WHERE requested_by = v_existing_id;
        UPDATE public.team_formation_requests SET mentor_id = v_uid WHERE mentor_id = v_existing_id;
        UPDATE public.meeting_attendance SET student_id = v_uid WHERE student_id = v_existing_id;
        UPDATE public.project_contributions SET author_id = v_uid WHERE author_id = v_existing_id;

        -- Remove the orphaned pre-seeded profile row
        DELETE FROM public.profiles WHERE id = v_existing_id;
    END IF;

    -- Upsert the authoritative student profile row
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        usn,
        branch,
        section,
        semester,
        skills,
        interests,
        updated_at
    ) VALUES (
        v_uid,
        v_email,
        TRIM(p_full_name),
        'STUDENT',
        v_usn,
        TRIM(p_branch),
        p_section,
        p_semester,
        COALESCE(p_skills, '{}'),
        COALESCE(p_interests, '{}'),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name  = EXCLUDED.full_name,
        usn        = EXCLUDED.usn,
        branch     = EXCLUDED.branch,
        section    = EXCLUDED.section,
        semester   = EXCLUDED.semester,
        skills     = EXCLUDED.skills,
        interests  = EXCLUDED.interests,
        updated_at = NOW()
    RETURNING * INTO v_row;

    RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_student_profile(TEXT, TEXT, TEXT, TEXT, INT, TEXT[], TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_student_profile(TEXT, TEXT, TEXT, TEXT, INT, TEXT[], TEXT[]) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. ABANDON TEAM RPC - AUTOMATICALLY RESET EVALUATIONS AND ACADEMIC MARKS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abandon_team(p_team_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_rows INT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'MENTOR' THEN
        RAISE EXCEPTION 'Only mentors can abandon team mentorship';
    END IF;

    -- Relinquish mentorship
    UPDATE public.teams
    SET mentor_id = NULL, updated_at = NOW()
    WHERE id = p_team_id
      AND mentor_id = auth.uid();

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Team not found or you are not the assigned mentor';
    END IF;

    -- Reset/wipe all evaluations, marks, and visibility records for this team
    DELETE FROM public.team_evaluations
    WHERE team_id = p_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.abandon_team(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_team(BIGINT) TO authenticated;

