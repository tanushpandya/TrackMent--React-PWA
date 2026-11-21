-- =============================================================================
-- Migration: 20261027000000_faculty_oauth_and_mentor_requests.sql
-- Purpose:
--   1. Fix Faculty Google OAuth Sign-In ("not found in verified faculty registry"
--      / "not in database" error) by recognizing all official @rvce.edu.in
--      faculty emails (no digits in local part) and auto-registering them into
--      public.verified_faculty + providing a SECURITY DEFINER upsert RPC.
--   2. Enable Team Leads (when team has no mentor) to search all faculty mentors
--      by name, 4-digit faculty code, or branch/department and send a mentorship
--      request (public.mentor_requests).
--   3. Enable Faculty Mentors to receive mentorship request notifications, view
--      full Team Info (project details + all member names/USNs/branches) prior
--      to accepting, and accept or decline mentorship.
--   4. SAFE & NON-DESTRUCTIVE: Zero DROP TABLE or DELETE statements on user accounts.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX FACULTY GOOGLE OAUTH SIGN-IN & PROFILE UPSERT
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_verified_faculty(p_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_email  TEXT := LOWER(TRIM(COALESCE(p_email, auth.jwt() ->> 'email', '')));
  v_local  TEXT := split_part(v_email, '@', 1);
  v_domain TEXT := split_part(v_email, '@', 2);
BEGIN
  IF v_email = '' THEN
    RETURN FALSE;
  END IF;

  -- 1. Explicitly listed in verified_faculty registry
  IF EXISTS (
    SELECT 1 FROM public.verified_faculty WHERE LOWER(email) = v_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Official @rvce.edu.in faculty email (local part has no digits)
  IF v_domain = 'rvce.edu.in' AND v_local <> '' AND v_local !~ '[0-9]' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_verified_faculty(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_email_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := LOWER(TRIM(COALESCE(NEW.email, '')));
  v_local TEXT := split_part(v_email, '@', 1);
  v_domain TEXT := split_part(v_email, '@', 2);
  v_is_faculty_email BOOLEAN := FALSE;
BEGIN
  IF v_domain <> 'rvce.edu.in' OR v_local = '' THEN
    RAISE EXCEPTION 'Only @rvce.edu.in email addresses are permitted.';
  END IF;

  -- Faculty email: explicitly in verified_faculty OR @rvce.edu.in local-part has no digits
  IF (v_local !~ '[0-9]') OR public.is_verified_faculty(v_email) THEN
    v_is_faculty_email := TRUE;
  END IF;

  IF v_is_faculty_email THEN
    -- Auto-record in verified_faculty so no faculty member is ever blocked on Google OAuth
    INSERT INTO public.verified_faculty (email, full_name, department)
    VALUES (v_email, NEW.full_name, COALESCE(NEW.department, 'RVCE'))
    ON CONFLICT (email) DO UPDATE
      SET full_name  = COALESCE(EXCLUDED.full_name, public.verified_faculty.full_name),
          department = COALESCE(EXCLUDED.department, public.verified_faculty.department);

    NEW.role := 'MENTOR';
    NEW.usn := NULL;
    NEW.branch := NULL;
    NEW.section := NULL;
    NEW.semester := NULL;
  ELSE
    -- Student email (local-part contains digits, e.g. name.cs24@rvce.edu.in)
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'STUDENT';
    ELSIF TG_OP = 'UPDATE' AND NEW.role = 'MENTOR' AND OLD.role <> 'MENTOR' THEN
      RAISE EXCEPTION 'Student accounts cannot be assigned the MENTOR role.';
    END IF;
    NEW.faculty_code := NULL;
  END IF;

  NEW.email := v_email;
  RETURN NEW;
END;
$$;

-- Helper RPC to safely create/update a Faculty Mentor profile on Google OAuth sign-in
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
  v_code  TEXT := NULLIF(UPPER(TRIM(COALESCE(p_faculty_code, ''))), '');
  v_row   public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF v_email = '' THEN
    SELECT LOWER(TRIM(email)) INTO v_email FROM auth.users WHERE id = v_uid;
  END IF;

  -- Ensure email is registered in verified_faculty
  INSERT INTO public.verified_faculty (email, full_name, department)
  VALUES (v_email, TRIM(p_full_name), TRIM(p_department))
  ON CONFLICT (email) DO UPDATE
    SET full_name  = EXCLUDED.full_name,
        department = EXCLUDED.department;

  -- Upsert the mentor's profile row
  INSERT INTO public.profiles (
    id, email, full_name, role, department, faculty_code, updated_at
  )
  VALUES (
    v_uid,
    v_email,
    TRIM(p_full_name),
    'MENTOR',
    TRIM(p_department),
    v_code,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name    = EXCLUDED.full_name,
        role         = 'MENTOR',
        department   = EXCLUDED.department,
        faculty_code = COALESCE(EXCLUDED.faculty_code, public.profiles.faculty_code),
        updated_at   = NOW()
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_faculty_profile(TEXT, TEXT, TEXT) TO authenticated;

-- Backfill any existing MENTOR profiles into verified_faculty
INSERT INTO public.verified_faculty (email, full_name, department)
SELECT LOWER(TRIM(email)), full_name, COALESCE(department, 'RVCE')
FROM public.profiles
WHERE role = 'MENTOR' AND email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. ALLOW STUDENTS/LEADS TO BROWSE ALL FACULTY MENTORS & MENTORS TO VIEW TEAMS
-- -----------------------------------------------------------------------------

-- Allow any authenticated user (students & team leads) to read MENTOR profiles
DROP POLICY IF EXISTS authenticated_read_all_mentors ON public.profiles;
CREATE POLICY authenticated_read_all_mentors ON public.profiles
  FOR SELECT TO authenticated
  USING (role = 'MENTOR');

-- Allow any authenticated MENTOR to read student/lead profiles so clicking
-- "Team Info" on a requesting/unmentored team displays all member names & USNs
DROP POLICY IF EXISTS mentor_read_assigned_students ON public.profiles;
CREATE POLICY mentor_read_assigned_students ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'MENTOR'
  );

-- Allow any authenticated MENTOR to read team rows (including unmentored teams
-- that requested mentorship)
DROP POLICY IF EXISTS team_read ON public.teams;
CREATE POLICY team_read ON public.teams
  FOR SELECT TO authenticated
  USING (
    leader_id = auth.uid()
    OR mentor_id = auth.uid()
    OR public.is_team_member(id)
    OR public.current_user_role() = 'MENTOR'
  );

-- Allow any authenticated MENTOR to read team_members rows when inspecting a team
DROP POLICY IF EXISTS team_member_read ON public.team_members;
CREATE POLICY team_member_read ON public.team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_team_leader(team_id)
    OR public.is_team_mentor(team_id)
    OR public.is_team_member(team_id)
    OR public.current_user_role() = 'MENTOR'
  );

-- Keep identical TABLE return signature for inspect_team_roster so existing apps and RPC calls never break
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
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.profiles p ON p.id = tm.user_id
    WHERE tm.team_id = p_team_id
    ORDER BY (t.leader_id = p.id) DESC, tm.joined_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.inspect_team_roster(BIGINT) TO authenticated;

-- Directory RPC to list & filter all Faculty Mentors
CREATE OR REPLACE FUNCTION public.list_faculty_mentors(
  p_query      TEXT DEFAULT '',
  p_department TEXT DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_q    TEXT := LOWER(TRIM(COALESCE(p_query, '')));
  v_dept TEXT := LOWER(TRIM(COALESCE(p_department, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE p.role = 'MENTOR'
    AND (
      v_q = ''
      OR LOWER(COALESCE(p.full_name, '')) LIKE '%' || v_q || '%'
      OR LOWER(COALESCE(p.faculty_code, '')) LIKE '%' || v_q || '%'
      OR LOWER(COALESCE(p.email, '')) LIKE '%' || v_q || '%'
      OR LOWER(COALESCE(p.department, '')) LIKE '%' || v_q || '%'
    )
    AND (
      v_dept = ''
      OR LOWER(COALESCE(p.department, '')) LIKE '%' || v_dept || '%'
      OR LOWER(COALESCE(p.branch, '')) LIKE '%' || v_dept || '%'
    )
  ORDER BY p.full_name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_faculty_mentors(TEXT, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. MENTORSHIP REQUESTS TABLE & RPCs (Leader -> Faculty Mentor)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mentor_requests (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id      BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  mentor_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_mentor_request
  ON public.mentor_requests (team_id, mentor_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_status
  ON public.mentor_requests (mentor_id, status);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_team_status
  ON public.mentor_requests (team_id, status);

ALTER TABLE public.mentor_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mentor_requests_read ON public.mentor_requests;
CREATE POLICY mentor_requests_read ON public.mentor_requests
  FOR SELECT TO authenticated
  USING (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.is_team_leader(team_id)
    OR public.is_team_member(team_id)
  );

DROP POLICY IF EXISTS mentor_requests_insert ON public.mentor_requests;
CREATE POLICY mentor_requests_insert ON public.mentor_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_leader(team_id)
  );

DROP POLICY IF EXISTS mentor_requests_update ON public.mentor_requests;
CREATE POLICY mentor_requests_update ON public.mentor_requests
  FOR UPDATE TO authenticated
  USING (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.is_team_leader(team_id)
  )
  WITH CHECK (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.is_team_leader(team_id)
  );

DROP POLICY IF EXISTS mentor_requests_delete ON public.mentor_requests;
CREATE POLICY mentor_requests_delete ON public.mentor_requests
  FOR DELETE TO authenticated
  USING (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.is_team_leader(team_id)
  );

-- RPC: Team Lead sends a mentorship request to a faculty member
CREATE OR REPLACE FUNCTION public.send_mentor_request(
  p_team_id   BIGINT,
  p_mentor_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_leader_id   UUID;
  v_existing_m  UUID;
  v_req_id      BIGINT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT leader_id, mentor_id
    INTO v_leader_id, v_existing_m
    FROM public.teams
   WHERE id = p_team_id;

  IF v_leader_id IS NULL THEN
    RAISE EXCEPTION 'Team not found.';
  END IF;

  IF v_leader_id <> v_uid THEN
    RAISE EXCEPTION 'Only the Team Lead can request a faculty mentor.';
  END IF;

  IF v_existing_m IS NOT NULL THEN
    RAISE EXCEPTION 'Your team already has an assigned faculty mentor.';
  END IF;

  -- Check if there is already a row for (team_id, mentor_id)
  SELECT id INTO v_req_id
    FROM public.mentor_requests
   WHERE team_id = p_team_id
     AND mentor_id = p_mentor_id
     AND status = 'PENDING'
   LIMIT 1;

  IF v_req_id IS NOT NULL THEN
    RETURN v_req_id;
  END IF;

  INSERT INTO public.mentor_requests (team_id, mentor_id, requested_by, status)
  VALUES (p_team_id, p_mentor_id, v_uid, 'PENDING')
  RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_mentor_request(BIGINT, UUID) TO authenticated;

-- RPC: Faculty Mentor accepts or declines a mentorship request
CREATE OR REPLACE FUNCTION public.respond_to_mentor_request(
  p_request_id BIGINT,
  p_accept     BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_req        public.mentor_requests%ROWTYPE;
  v_team       public.teams%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT * INTO v_req
    FROM public.mentor_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mentorship request not found.';
  END IF;

  IF v_req.mentor_id <> v_uid THEN
    RAISE EXCEPTION 'You are not authorized to respond to this mentorship request.';
  END IF;

  SELECT * INTO v_team
    FROM public.teams
   WHERE id = v_req.team_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Team no longer exists.';
  END IF;

  IF p_accept THEN
    IF v_team.mentor_id IS NOT NULL AND v_team.mentor_id <> v_uid THEN
      UPDATE public.mentor_requests
         SET status = 'CANCELLED', updated_at = NOW()
       WHERE id = p_request_id;
      RAISE EXCEPTION 'This team has already been assigned to another faculty mentor.';
    END IF;

    -- Assign mentor to team
    UPDATE public.teams
       SET mentor_id  = v_uid,
           updated_at = NOW()
     WHERE id = v_req.team_id
     RETURNING * INTO v_team;

    -- Mark this request ACCEPTED
    UPDATE public.mentor_requests
       SET status     = 'ACCEPTED',
           updated_at = NOW()
     WHERE id = p_request_id;

    -- Cancel any other pending mentor requests from this team
    UPDATE public.mentor_requests
       SET status     = 'CANCELLED',
           updated_at = NOW()
     WHERE team_id = v_req.team_id
       AND status = 'PENDING'
       AND id <> p_request_id;
  ELSE
    UPDATE public.mentor_requests
       SET status     = 'REJECTED',
           updated_at = NOW()
     WHERE id = p_request_id;
  END IF;

  RETURN to_jsonb(v_team);
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_to_mentor_request(BIGINT, BOOLEAN) TO authenticated;

-- Enable Realtime on mentor_requests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'mentor_requests'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_requests;
    END IF;
  END IF;
END $$;
