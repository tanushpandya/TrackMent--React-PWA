-- ==============================================================================
-- TRACKMENT - VERIFIED GMAIL / GOOGLE IDENTITY GATE FOR USN MANAGEMENT
-- Migration: 20261030000000_verified_google_usn_management.sql
-- ==============================================================================
-- Security Requirements:
-- 1. Only verified accounts from Google / Gmail can edit or add their USN.
-- 2. Email remains strictly immutable (prevents identity/session hijacking).
-- 3. Institutional USN format constraints (chk_usn_format) and uniqueness (profiles_usn_key) remain strictly enforced.
-- 4. Role tampering remains strictly blocked by trg_profile_role_protection.

-- 1. Update Profile Identity Protection Trigger
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
        -- 1. Email remains strictly immutable (tied to Google OAuth / auth.users)
        IF OLD.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Email cannot be changed directly.';
        END IF;

        -- 2. If USN is being added or updated: require caller to be a verified Google / Gmail account
        IF NEW.usn IS DISTINCT FROM OLD.usn AND NEW.usn IS NOT NULL AND TRIM(NEW.usn) <> '' THEN
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
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_profile_identity();


-- 2. Update upsert_student_profile RPC to enforce verified Google/Gmail requirement
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
    v_uid                UUID := auth.uid();
    v_email              TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
    v_usn                TEXT := UPPER(TRIM(COALESCE(p_usn, '')));
    v_is_verified_google BOOLEAN := FALSE;
    v_existing_id        UUID;
    v_usn_owner_id       UUID;
    v_usn_owner_email    TEXT;
    v_row                public.profiles%ROWTYPE;
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

    -- Gate: Account must be verified from Google / Gmail to set or modify USN
    SELECT EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = v_uid
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

    -- Validate institutional USN format
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
        -- Rebind foreign keys referencing the old pre-seeded profile id to current authenticated uid
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

        -- Remove orphaned profile row
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

