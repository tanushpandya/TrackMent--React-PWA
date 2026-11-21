-- ==============================================================================
-- TRACKMENT - PROJECT ABSTRACT & OBJECTIVES, AND TEAM MARKS / EVALUATIONS
-- Migration: 20261024100000_team_marks_and_project_abstract.sql
-- ==============================================================================

-- 1. Add abstract & objectives columns to teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS abstract TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS objectives TEXT;

GRANT UPDATE (abstract, objectives) ON public.teams TO authenticated;

-- 2. Secure RPC to update project abstract, objectives, title, and theme
CREATE OR REPLACE FUNCTION public.update_team_project_info(
    p_team_id      BIGINT,
    p_project_title TEXT,
    p_abstract      TEXT,
    p_objectives    TEXT,
    p_theme         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_leader UUID;
    v_mentor UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT leader_id, mentor_id INTO v_leader, v_mentor
    FROM public.teams
    WHERE id = p_team_id;

    IF v_leader IS DISTINCT FROM v_uid AND v_mentor IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'Only the team leader or assigned mentor can update project details';
    END IF;

    UPDATE public.teams
    SET project_title = COALESCE(NULLIF(TRIM(p_project_title), ''), project_title),
        abstract = TRIM(COALESCE(p_abstract, '')),
        objectives = TRIM(COALESCE(p_objectives, '')),
        project_gist = CASE 
            WHEN LENGTH(TRIM(COALESCE(p_abstract, ''))) > 0 THEN SUBSTRING(TRIM(p_abstract) FROM 1 FOR 300)
            ELSE project_gist
        END,
        theme = COALESCE(NULLIF(TRIM(p_theme), ''), theme),
        updated_at = NOW()
    WHERE id = p_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_team_project_info(BIGINT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_team_project_info(BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;


-- 3. Academic Marks & Evaluations Table
CREATE TABLE IF NOT EXISTS public.team_evaluations (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id      BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES public.profiles(id),
    phase_name   VARCHAR(100) NOT NULL,
    total_marks  NUMERIC(5,2) NOT NULL DEFAULT 0,
    max_marks    NUMERIC(5,2) NOT NULL DEFAULT 50,
    member_marks JSONB DEFAULT '{}'::jsonb,
    remarks      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_evaluations_team ON public.team_evaluations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_evaluations_evaluator ON public.team_evaluations(evaluator_id);

ALTER TABLE public.team_evaluations ENABLE ROW LEVEL SECURITY;

-- Read policy: Team members, leaders, mentors, and faculty can read evaluations
DROP POLICY IF EXISTS evaluations_read ON public.team_evaluations;
CREATE POLICY evaluations_read ON public.team_evaluations
FOR SELECT TO authenticated
USING (
    public.can_access_team(team_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MENTOR')
);

-- Write policy: Only mentors can insert or update evaluations
DROP POLICY IF EXISTS evaluations_mentor_write ON public.team_evaluations;
CREATE POLICY evaluations_mentor_write ON public.team_evaluations
FOR ALL TO authenticated
USING (
    evaluator_id = auth.uid()
    OR public.is_team_mentor(team_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MENTOR')
)
WITH CHECK (
    evaluator_id = auth.uid()
    OR public.is_team_mentor(team_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MENTOR')
);

-- 4. Secure RPC for faculty to record marks and evaluations
CREATE OR REPLACE FUNCTION public.record_team_evaluation(
    p_team_id      BIGINT,
    p_phase_name   TEXT,
    p_total_marks  NUMERIC,
    p_max_marks    NUMERIC,
    p_member_marks JSONB DEFAULT '{}'::jsonb,
    p_remarks      TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_eval_id BIGINT;
    v_uid     UUID := auth.uid();
    v_role    TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
    IF v_role IS DISTINCT FROM 'MENTOR' THEN
        RAISE EXCEPTION 'Only faculty mentors can record marks and evaluations';
    END IF;

    INSERT INTO public.team_evaluations(
        team_id,
        evaluator_id,
        phase_name,
        total_marks,
        max_marks,
        member_marks,
        remarks,
        updated_at
    )
    VALUES (
        p_team_id,
        v_uid,
        TRIM(p_phase_name),
        p_total_marks,
        p_max_marks,
        COALESCE(p_member_marks, '{}'::jsonb),
        NULLIF(TRIM(COALESCE(p_remarks, '')), ''),
        NOW()
    )
    RETURNING id INTO v_eval_id;

    RETURN v_eval_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT) TO authenticated;

-- ==============================================================================
-- 6. ALLOW USN FORMAT UPDATES & CORRECTIONS (e.g. 1RV <-> RVCE format transition)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.trg_protect_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Email remains strictly immutable as it's the OAuth identity
        IF OLD.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Email cannot be changed directly.';
        END IF;
        -- USN can be updated (e.g. format transition to RVCE or corrections), validated by chk_usn_format
    END IF;

    RETURN NEW;
END;
$$;

