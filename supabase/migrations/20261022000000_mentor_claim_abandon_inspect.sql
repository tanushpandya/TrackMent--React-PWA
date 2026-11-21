-- ==============================================================================
-- TRACKMENT - MENTOR DIRECT CLAIM, ABANDON TEAM, AND INSPECT ROSTER RPCs
-- Migration: 20261022000000_mentor_claim_abandon_inspect.sql
-- ==============================================================================

-- 1. Direct claim by team ID without requiring code validation
DROP FUNCTION IF EXISTS public.claim_team_by_id(BIGINT);

CREATE OR REPLACE FUNCTION public.claim_team_by_id(p_team_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role       TEXT;
    v_updated_id BIGINT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role IS DISTINCT FROM 'MENTOR' THEN
        RAISE EXCEPTION 'Only mentors can claim teams';
    END IF;

    UPDATE public.teams
    SET mentor_id = auth.uid(), updated_at = NOW()
    WHERE id = p_team_id
      AND mentor_id IS NULL
    RETURNING id INTO v_updated_id;

    IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'Team does not exist or is already claimed by another mentor';
    END IF;

    RETURN v_updated_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_team_by_id(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_team_by_id(BIGINT) TO authenticated;


-- 2. Abandon team mentorship (relinquish claimed team)
DROP FUNCTION IF EXISTS public.abandon_team(BIGINT);

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

    UPDATE public.teams
    SET mentor_id = NULL, updated_at = NOW()
    WHERE id = p_team_id
      AND mentor_id = auth.uid();

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
        RAISE EXCEPTION 'Team not found or you are not the assigned mentor';
    END IF;

    -- Clear team evaluations and academic marks awarded by abandoning mentor
    DELETE FROM public.team_evaluations
    WHERE team_id = p_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.abandon_team(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_team(BIGINT) TO authenticated;


-- 3. Inspect team roster before claiming
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

REVOKE ALL ON FUNCTION public.inspect_team_roster(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inspect_team_roster(BIGINT) TO authenticated;
