-- ==============================================================================
-- TRACKMENT - RVCE EXPERIENTIAL LEARNING RUBRICS & TEAM REPORTS
-- Migration: 20261119100000_rvce_rubrics_and_team_reports.sql
-- Description: Adds team report deliverables, criteria-level rubric scoring,
--              private storage bucket 'team-reports', and hardened storage policies.
-- ==============================================================================

BEGIN;

-- 1. Add reports column to teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS reports JSONB DEFAULT '[]'::jsonb;

-- 2. Add rubric_scores column to team_evaluations
ALTER TABLE public.team_evaluations ADD COLUMN IF NOT EXISTS rubric_scores JSONB DEFAULT '{}'::jsonb;

-- 3. Create private Supabase storage bucket 'team-reports'
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-reports', 'team-reports', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS Policies for 'team-reports' bucket
DROP POLICY IF EXISTS "team reports leader upload" ON storage.objects;
CREATE POLICY "team reports leader upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'team-reports'
    AND LOWER(storage.extension(name)) = 'pdf'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM 'team_([0-9]+)'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team reports leader update" ON storage.objects;
CREATE POLICY "team reports leader update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'team-reports'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM 'team_([0-9]+)'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
)
WITH CHECK (
    bucket_id = 'team-reports'
    AND LOWER(storage.extension(name)) = 'pdf'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM 'team_([0-9]+)'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team reports leader delete" ON storage.objects;
CREATE POLICY "team reports leader delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'team-reports'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM 'team_([0-9]+)'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team reports team and mentor read" ON storage.objects;
CREATE POLICY "team reports team and mentor read"
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'team-reports'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM 'team_([0-9]+)'), '')::BIGINT
          AND (
            public.can_access_team(t.id)
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MENTOR')
          )
    )
);

-- 5. Secure RPC to update team reports metadata (Team Leader only)
CREATE OR REPLACE FUNCTION public.update_team_reports(
    p_team_id BIGINT,
    p_reports JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_leader UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT leader_id INTO v_leader
    FROM public.teams
    WHERE id = p_team_id;

    IF v_leader IS DISTINCT FROM v_uid THEN
        RAISE EXCEPTION 'Only the team leader can update team reports';
    END IF;

    UPDATE public.teams
    SET reports = COALESCE(p_reports, '[]'::jsonb),
        updated_at = NOW()
    WHERE id = p_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_team_reports(BIGINT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_team_reports(BIGINT, JSONB) TO authenticated;

-- 6. Update record_team_evaluation to persist rubric_scores
DROP FUNCTION IF EXISTS public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_team_evaluation(
    p_team_id       BIGINT,
    p_phase_name    TEXT,
    p_total_marks   NUMERIC,
    p_max_marks     NUMERIC,
    p_member_marks  JSONB DEFAULT '{}'::jsonb,
    p_remarks       TEXT DEFAULT NULL,
    p_rubric_scores JSONB DEFAULT '{}'::jsonb
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_eval_id BIGINT;
BEGIN
    IF NOT public.is_team_mentor(p_team_id) THEN
        RAISE EXCEPTION 'Only the assigned faculty mentor of this team can record evaluations.';
    END IF;

    INSERT INTO public.team_evaluations (
        team_id,
        evaluator_id,
        phase_name,
        total_marks,
        max_marks,
        member_marks,
        remarks,
        rubric_scores,
        updated_at
    ) VALUES (
        p_team_id,
        auth.uid(),
        TRIM(p_phase_name),
        p_total_marks,
        p_max_marks,
        COALESCE(p_member_marks, '{}'::jsonb),
        NULLIF(TRIM(COALESCE(p_remarks, '')), ''),
        COALESCE(p_rubric_scores, '{}'::jsonb),
        NOW()
    ) RETURNING id INTO v_eval_id;

    RETURN v_eval_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_team_evaluation(BIGINT, TEXT, NUMERIC, NUMERIC, JSONB, TEXT, JSONB) TO authenticated;

COMMIT;
