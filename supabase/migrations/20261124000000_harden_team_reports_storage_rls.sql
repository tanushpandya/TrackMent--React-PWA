-- ==============================================================================
-- TRACKMENT SECURITY HARDENING: TEAM REPORTS STORAGE RLS
-- Migration: 20261124000000_harden_team_reports_storage_rls.sql
-- Fixes:
--   1. Anchors storage path regex to ^team_([0-9]+)/ and rejects '..' traversal
--   2. Scopes mentor read access strictly to assigned mentors (is_team_mentor)
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "team reports leader upload" ON storage.objects;
CREATE POLICY "team reports leader upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'team-reports'
    AND storage.objects.name NOT LIKE '%..%'
    AND LOWER(storage.extension(name)) = 'pdf'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM '^team_([0-9]+)/'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team reports leader update" ON storage.objects;
CREATE POLICY "team reports leader update"
ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'team-reports'
    AND storage.objects.name NOT LIKE '%..%'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM '^team_([0-9]+)/'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
)
WITH CHECK (
    bucket_id = 'team-reports'
    AND storage.objects.name NOT LIKE '%..%'
    AND LOWER(storage.extension(name)) = 'pdf'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM '^team_([0-9]+)/'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team reports leader delete" ON storage.objects;
CREATE POLICY "team reports leader delete"
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'team-reports'
    AND storage.objects.name NOT LIKE '%..%'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM '^team_([0-9]+)/'), '')::BIGINT
          AND t.leader_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "team reports team and mentor read" ON storage.objects;
CREATE POLICY "team reports team and mentor read"
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'team-reports'
    AND storage.objects.name NOT LIKE '%..%'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = NULLIF(SUBSTRING(storage.objects.name FROM '^team_([0-9]+)/'), '')::BIGINT
          AND (
            public.can_access_team(t.id)
            OR public.is_team_mentor(t.id)
          )
    )
);

COMMIT;
