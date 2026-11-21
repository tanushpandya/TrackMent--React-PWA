-- ==============================================================================
-- TRACKMENT — CONSOLIDATED & HARDENED SUPABASE SCHEMA MIGRATION
-- File: supabase/migrations/20261021000000_consolidated_schema.sql
-- PostgreSQL 16 / Supabase
--
-- Consolidates all schema definitions, indexes, views, triggers, RPCs, storage
-- policies, and security remediations (Phases 1–5) into a single authoritative,
-- idempotent migration.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CORE TABLES & VERIFIED FACULTY REGISTRY
-- ==============================================================================

-- 1.1 Verified Faculty Allow-List (Phase 2.1: Strict Faculty Verification)
-- Only emails registered in this admin-managed table can claim the MENTOR role.
CREATE TABLE IF NOT EXISTS public.verified_faculty (
    email        VARCHAR(255) PRIMARY KEY
                 CHECK (split_part(LOWER(email), '@', 2) = 'rvce.edu.in'),
    full_name    VARCHAR(150),
    department   VARCHAR(100),
    faculty_code VARCHAR(30) UNIQUE,
    added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.verified_faculty ENABLE ROW LEVEL SECURITY;

-- 1.2 Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        VARCHAR(255) UNIQUE NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    role         VARCHAR(20) NOT NULL DEFAULT 'STUDENT'
                 CHECK (role IN ('STUDENT', 'TEAM_LEAD', 'MENTOR')),
    -- Student / Team Lead attributes
    usn          VARCHAR(20) UNIQUE,
    branch       VARCHAR(50),
    section      VARCHAR(10),
    semester     INT CHECK (semester BETWEEN 1 AND 8),
    skills       TEXT[],
    interests    TEXT[],
    -- Mentor attributes
    department   VARCHAR(100),
    faculty_code VARCHAR(30) UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_institution_email
        CHECK (split_part(LOWER(email), '@', 2) = 'rvce.edu.in'),

    CONSTRAINT chk_usn_format
        CHECK (usn IS NULL OR usn ~ '^(1R[VZ]|RVCE)[0-9]{2}[A-Z]{2,4}[0-9]{3}$'),

    CONSTRAINT chk_role_attributes CHECK (
        (
            role IN ('STUDENT', 'TEAM_LEAD')
            AND usn IS NOT NULL
            AND branch IS NOT NULL
        )
        OR
        (
            role = 'MENTOR'
            AND faculty_code IS NOT NULL
            AND department IS NOT NULL
        )
    )
);

-- 1.3 Teams
CREATE TABLE IF NOT EXISTS public.teams (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_code            VARCHAR(20) UNIQUE NOT NULL,
    team_name            VARCHAR(100) UNIQUE NOT NULL,
    project_title        VARCHAR(255) NOT NULL,
    project_gist         TEXT NOT NULL,
    abstract             TEXT,
    objectives           TEXT,
    theme                VARCHAR(100) NOT NULL,
    branch               VARCHAR(50) NOT NULL,
    leader_id            UUID NOT NULL REFERENCES public.profiles(id),
    mentor_id            UUID REFERENCES public.profiles(id),
    current_progress_pct INT NOT NULL DEFAULT 0
                         CHECK (current_progress_pct BETWEEN 0 AND 100),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.4 Team Members (One active team per student)
CREATE TABLE IF NOT EXISTS public.team_members (
    team_id   BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id   UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- 1.5 Team Invitations (Lead -> Student)
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id    BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, student_id)
);

-- 1.6 Join Requests (Student -> Team)
CREATE TABLE IF NOT EXISTS public.join_requests (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id    BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message    TEXT,
    status     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, student_id)
);

-- 1.7 Lead Transfer Requests (Lead -> Member)
CREATE TABLE IF NOT EXISTS public.lead_transfer_requests (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id      BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    to_user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, to_user_id, status)
);

-- Normalize column names if an older migration variant created from_leader_id / to_member_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lead_transfer_requests' AND column_name = 'from_leader_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lead_transfer_requests' AND column_name = 'from_user_id'
    ) THEN
        ALTER TABLE public.lead_transfer_requests RENAME COLUMN from_leader_id TO from_user_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lead_transfer_requests' AND column_name = 'to_member_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lead_transfer_requests' AND column_name = 'to_user_id'
    ) THEN
        ALTER TABLE public.lead_transfer_requests RENAME COLUMN to_member_id TO to_user_id;
    END IF;
END $$;

-- 1.8 Contributions
CREATE TABLE IF NOT EXISTS public.contributions (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id                BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    author_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    parent_contribution_id BIGINT REFERENCES public.contributions(id) ON DELETE SET NULL,
    title                  VARCHAR(150) NOT NULL,
    description            TEXT NOT NULL,
    links                  TEXT[],
    status                 VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'SOFT_DELETED')),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.9 Contribution Files
CREATE TABLE IF NOT EXISTS public.contribution_files (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contribution_id BIGINT NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_type       VARCHAR(20) NOT NULL
                    CHECK (file_type IN ('VIDEO', 'IMAGE', 'DOCUMENT', 'ARCHIVE')),
    file_size_bytes BIGINT NOT NULL
                    CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.10 Contribution Reviews
CREATE TABLE IF NOT EXISTS public.contribution_reviews (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contribution_id  BIGINT NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
    reviewer_id      UUID NOT NULL REFERENCES public.profiles(id),
    verdict          VARCHAR(20) NOT NULL CHECK (verdict IN ('CONFIRMED', 'REJECTED')),
    rejection_reason TEXT,
    reviewed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_rejection_reason CHECK (
        verdict = 'CONFIRMED'
        OR (
            verdict = 'REJECTED'
            AND rejection_reason IS NOT NULL
            AND LENGTH(TRIM(rejection_reason)) > 0
        )
    )
);

-- 1.11 Contribution Votes (Democratic review of Team Lead contributions)
CREATE TABLE IF NOT EXISTS public.contribution_votes (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contribution_id  BIGINT NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
    voter_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    verdict          VARCHAR(20) NOT NULL CHECK (verdict IN ('CONFIRMED', 'REJECTED')),
    rejection_reason TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (contribution_id, voter_id),
    CONSTRAINT chk_vote_reason CHECK (
        verdict = 'CONFIRMED'
        OR (rejection_reason IS NOT NULL AND LENGTH(TRIM(rejection_reason)) > 0)
    )
);

-- 1.12 Progress History
CREATE TABLE IF NOT EXISTS public.progress_history (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id        BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    updated_by     UUID NOT NULL REFERENCES public.profiles(id),
    progress_pct   INT NOT NULL CHECK (progress_pct BETWEEN 0 AND 100),
    milestone_note TEXT NOT NULL,
    recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.13 Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id        BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    requested_by   UUID NOT NULL REFERENCES public.profiles(id),
    mentor_id      UUID NOT NULL REFERENCES public.profiles(id),
    requested_slot TIMESTAMPTZ NOT NULL,
    confirmed_slot TIMESTAMPTZ,
    status         VARCHAR(20) NOT NULL DEFAULT 'REQUESTED'
                   CHECK (status IN (
                       'REQUESTED', 'CONFIRMED', 'RESCHEDULED',
                       'REJECTED', 'CANCELLED', 'IN_MEETING', 'COMPLETED'
                   )),
    agenda         TEXT NOT NULL,
    mentor_notes   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.14 Feedback
CREATE TABLE IF NOT EXISTS public.feedback (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id         BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    mentor_id       UUID NOT NULL REFERENCES public.profiles(id),
    contribution_id BIGINT REFERENCES public.contributions(id) ON DELETE SET NULL,
    appointment_id  BIGINT REFERENCES public.appointments(id) ON DELETE SET NULL,
    feedback_type   VARCHAR(20) NOT NULL DEFAULT 'COMMENT'
                    CHECK (feedback_type IN ('COMMENT', 'THUMBS_UP', 'MEET_ME')),
    content         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1.15 Meeting Ledger & Attendance
CREATE TABLE IF NOT EXISTS public.meeting_ledger (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    appointment_id BIGINT UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
    team_id        BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    meeting_number INT NOT NULL CHECK (meeting_number > 0),
    meeting_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    summary_notes  TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_attendance (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    meeting_ledger_id BIGINT NOT NULL REFERENCES public.meeting_ledger(id) ON DELETE CASCADE,
    student_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_present        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (meeting_ledger_id, student_id)
);

-- 1.16 Team Departures
CREATE TABLE IF NOT EXISTS public.team_departures (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    team_id               BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name             VARCHAR(150) NOT NULL,
    usn                   VARCHAR(20),
    contributions_removed INT NOT NULL DEFAULT 0,
    joined_at             TIMESTAMPTZ,
    left_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure optional/upgraded columns exist on all mutable tables if upgrading from older schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS section VARCHAR(10);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS semester INT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty_code VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS abstract TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE public.team_invitations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.join_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.lead_transfer_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.contributions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ==============================================================================
-- 2. INDEXES & QUOTA CONSTRAINTS
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_teams_mentor ON public.teams(mentor_id);
CREATE INDEX IF NOT EXISTS idx_teams_theme_branch ON public.teams(theme, branch);
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_team_per_leader ON public.teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_student_status ON public.team_invitations(student_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON public.join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_lead_transfer_member_status ON public.lead_transfer_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_team_status ON public.contributions(team_id, status);
CREATE INDEX IF NOT EXISTS idx_contributions_author ON public.contributions(author_id);
CREATE INDEX IF NOT EXISTS idx_contributions_created ON public.contributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contribution_files_contribution ON public.contribution_files(contribution_id);
CREATE INDEX IF NOT EXISTS idx_reviews_contribution ON public.contribution_reviews(contribution_id);
CREATE INDEX IF NOT EXISTS idx_contribution_votes_contribution ON public.contribution_votes(contribution_id);
CREATE INDEX IF NOT EXISTS idx_progress_team_date ON public.progress_history(team_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_team ON public.appointments(team_id);
CREATE INDEX IF NOT EXISTS idx_appointments_mentor_status_slot ON public.appointments(mentor_id, status, confirmed_slot);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mentor_confirmed_slot
    ON public.appointments(mentor_id, confirmed_slot)
    WHERE status = 'CONFIRMED' AND confirmed_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_team ON public.feedback(team_id);
CREATE INDEX IF NOT EXISTS idx_feedback_team_created ON public.feedback(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_ledger_team ON public.meeting_ledger(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_meeting_number ON public.meeting_ledger(team_id, meeting_number);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.meeting_attendance(student_id, is_present);
CREATE INDEX IF NOT EXISTS idx_team_departures_team ON public.team_departures(team_id, left_at DESC);

-- ==============================================================================
-- 3. SECURITY HELPER FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_rvce_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT split_part(LOWER(COALESCE(auth.jwt() ->> 'email', '')), '@', 2) = 'rvce.edu.in';
$$;

-- Phase 2.1: Checks whether the given email (or caller's JWT email) is in verified_faculty
CREATE OR REPLACE FUNCTION public.is_verified_faculty(p_email TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.verified_faculty vf
        WHERE LOWER(vf.email) = LOWER(COALESCE(p_email, auth.jwt() ->> 'email', ''))
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = p_team_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader(p_team_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = p_team_id AND leader_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_team_mentor(p_team_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = p_team_id AND mentor_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_team(p_team_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.is_team_member(p_team_id)
        OR public.is_team_leader(p_team_id)
        OR public.is_team_mentor(p_team_id);
$$;

-- ==============================================================================
-- 4. VIEWS
-- ==============================================================================

DROP VIEW IF EXISTS public.student_absence_redflags;
CREATE OR REPLACE VIEW public.student_absence_redflags
WITH (security_invoker = true)
AS
SELECT
    tm.team_id,
    p.id AS student_id,
    p.full_name,
    p.usn,
    COUNT(ma.id) FILTER (WHERE ma.is_present = FALSE) AS total_absences,
    CASE
        WHEN COUNT(ma.id) FILTER (WHERE ma.is_present = FALSE) >= 2 THEN TRUE
        ELSE FALSE
    END AS is_marked_red
FROM public.team_members tm
JOIN public.profiles p ON tm.user_id = p.id
LEFT JOIN public.meeting_ledger ml ON tm.team_id = ml.team_id
LEFT JOIN public.meeting_attendance ma
    ON ml.id = ma.meeting_ledger_id AND p.id = ma.student_id
GROUP BY tm.team_id, p.id, p.full_name, p.usn;

-- ==============================================================================
-- 5. TRIGGERS & BUSINESS RULES
-- ==============================================================================

-- 5.1 Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_invitations_updated_at ON public.team_invitations;
CREATE TRIGGER trg_invitations_updated_at BEFORE UPDATE ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_contributions_updated_at ON public.contributions;
CREATE TRIGGER trg_contributions_updated_at BEFORE UPDATE ON public.contributions
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- 5.2 Phase 2.1: Strict Faculty Verification & Institutional Email Role Trigger
CREATE OR REPLACE FUNCTION public.enforce_profile_email_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_local TEXT;
BEGIN
    v_local := split_part(LOWER(NEW.email), '@', 1);

    IF NEW.role IN ('STUDENT', 'TEAM_LEAD') THEN
        IF v_local !~ '^[a-z0-9._-]+\.[a-z]{2,4}[0-9]{2}$' THEN
            RAISE EXCEPTION 'Student accounts must use an RVCE student email (e.g. name.branchyy@rvce.edu.in)';
        END IF;
    ELSIF NEW.role = 'MENTOR' THEN
        IF v_local ~ '[0-9]' THEN
            RAISE EXCEPTION 'Faculty / Mentor accounts must use an official RVCE faculty email (e.g. name@rvce.edu.in)';
        END IF;
        -- Definitive server-side faculty verification against verified_faculty allow-list
        IF NOT public.is_verified_faculty(NEW.email) THEN
            RAISE EXCEPTION 'Your email was not found in the verified faculty registry. Please contact the administrator.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_email_role ON public.profiles;
CREATE TRIGGER trg_enforce_profile_email_role
BEFORE INSERT OR UPDATE OF email, role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_email_role();

-- 5.3 Profile Role Escalation & Identity Protection Triggers
CREATE OR REPLACE FUNCTION public.trg_protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF current_setting('trackment.trusted_update', true) = 'true' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NOT NULL AND OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Role cannot be changed directly by the user.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_role_protection ON public.profiles;
CREATE TRIGGER trg_profile_role_protection
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_profile_role();

CREATE OR REPLACE FUNCTION public.trg_protect_profile_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        -- Email remains strictly immutable (tied to Google OAuth identity)
        IF OLD.email IS NOT NULL AND NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Email cannot be changed directly.';
        END IF;
        -- USN can be updated (e.g. format transition to RVCE or corrections), validated by chk_usn_format
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_identity_protection ON public.profiles;
CREATE TRIGGER trg_profile_identity_protection
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_profile_identity();

-- 5.4 Team Creation: Add Leader as Member & Promote Role
CREATE OR REPLACE FUNCTION public.trg_add_team_leader_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.team_members(team_id, user_id)
    VALUES (NEW.id, NEW.leader_id)
    ON CONFLICT DO NOTHING;

    PERFORM set_config('trackment.trusted_update', 'true', true);
    UPDATE public.profiles
    SET role = 'TEAM_LEAD'
    WHERE id = NEW.leader_id AND role = 'STUDENT';
    PERFORM set_config('trackment.trusted_update', 'false', true);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_add_leader ON public.teams;
CREATE TRIGGER trg_team_add_leader
AFTER INSERT ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.trg_add_team_leader_as_member();

-- 5.5 Validate Mentor Role on Teams
CREATE OR REPLACE FUNCTION public.trg_validate_team_mentor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.mentor_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = NEW.mentor_id AND role = 'MENTOR'
    ) THEN
        RAISE EXCEPTION 'mentor_id must reference an approved MENTOR account';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_team_mentor ON public.teams;
CREATE TRIGGER trg_validate_team_mentor
BEFORE INSERT OR UPDATE OF mentor_id ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.trg_validate_team_mentor();

-- 5.6 Single Consolidated Trigger for Invitation Acceptance
DROP TRIGGER IF EXISTS trg_invitation_acceptance ON public.team_invitations;
DROP TRIGGER IF EXISTS trg_accept_team_invitation ON public.team_invitations;

CREATE OR REPLACE FUNCTION public.handle_team_invitation_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'PENDING' AND NEW.status = 'ACCEPTED' THEN
        INSERT INTO public.team_members(team_id, user_id)
        VALUES (NEW.team_id, NEW.student_id)
        ON CONFLICT (team_id, user_id) DO NOTHING;

        UPDATE public.team_invitations
        SET status = 'CANCELLED'
        WHERE student_id = NEW.student_id
          AND id <> NEW.id
          AND status = 'PENDING';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_accept_team_invitation
AFTER UPDATE OF status ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.handle_team_invitation_accepted();

-- 5.7 Join Request Acceptance Trigger
CREATE OR REPLACE FUNCTION public.handle_join_request_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'ACCEPTED' AND OLD.status = 'PENDING' THEN
        INSERT INTO public.team_members (team_id, user_id)
        VALUES (NEW.team_id, NEW.student_id)
        ON CONFLICT (team_id, user_id) DO NOTHING;

        UPDATE public.join_requests
        SET status = 'REJECTED', updated_at = NOW()
        WHERE student_id = NEW.student_id
          AND id <> NEW.id
          AND status = 'PENDING';

        UPDATE public.team_invitations
        SET status = 'EXPIRED'
        WHERE student_id = NEW.student_id
          AND status = 'PENDING';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accept_join_request ON public.join_requests;
CREATE TRIGGER trg_accept_join_request
AFTER UPDATE OF status ON public.join_requests
FOR EACH ROW
WHEN (NEW.status = 'ACCEPTED' AND OLD.status = 'PENDING')
EXECUTE FUNCTION public.handle_join_request_accepted();

-- 5.8 Contribution Review Eligibility & Status Sync Triggers
CREATE OR REPLACE FUNCTION public.trg_check_review_eligibility()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    contrib_author UUID;
    contrib_team   BIGINT;
    team_leader    UUID;
    team_mentor    UUID;
BEGIN
    SELECT author_id, team_id
    INTO contrib_author, contrib_team
    FROM public.contributions
    WHERE id = NEW.contribution_id;

    SELECT leader_id, mentor_id
    INTO team_leader, team_mentor
    FROM public.teams
    WHERE id = contrib_team;

    IF NEW.reviewer_id = contrib_author THEN
        RAISE EXCEPTION 'Self-review prohibited.';
    END IF;

    IF contrib_author = team_leader THEN
        RAISE EXCEPTION 'Team Lead contributions are decided democratically by votes of at least 2 team members. Faculty validation is disabled.';
    END IF;

    IF contrib_author <> team_leader
       AND NEW.reviewer_id <> team_leader
       AND NEW.reviewer_id <> team_mentor THEN
        RAISE EXCEPTION 'Only Team Lead or assigned Mentor can review this contribution.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_review ON public.contribution_reviews;
CREATE TRIGGER trg_verify_review
BEFORE INSERT ON public.contribution_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_check_review_eligibility();

CREATE OR REPLACE FUNCTION public.trg_guard_contribution_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contrib_status TEXT;
BEGIN
    SELECT status INTO v_contrib_status
    FROM public.contributions
    WHERE id = NEW.contribution_id;

    IF v_contrib_status IS NULL THEN
        RAISE EXCEPTION 'Contribution does not exist';
    END IF;

    IF v_contrib_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Reviews can only be submitted for PENDING contributions (current status: %)', v_contrib_status;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_contribution_review ON public.contribution_reviews;
CREATE TRIGGER trg_guard_contribution_review
BEFORE INSERT ON public.contribution_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_guard_contribution_review();

CREATE OR REPLACE FUNCTION public.trg_sync_contribution_review_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM set_config('trackment.trusted_contribution_status', 'true', true);
    UPDATE public.contributions
    SET status = NEW.verdict, updated_at = NOW()
    WHERE id = NEW.contribution_id;
    PERFORM set_config('trackment.trusted_contribution_status', 'false', true);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_status_sync ON public.contribution_reviews;
CREATE TRIGGER trg_review_status_sync
AFTER INSERT ON public.contribution_reviews
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_contribution_review_status();

-- Prevent direct client manipulation of contributions.status to CONFIRMED/REJECTED
CREATE OR REPLACE FUNCTION public.trg_protect_contribution_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF current_setting('trackment.trusted_contribution_status', true) = 'true' THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
        IF NOT (OLD.status = 'PENDING' AND NEW.status IN ('PENDING', 'SOFT_DELETED') AND OLD.author_id = auth.uid()) THEN
            RAISE EXCEPTION 'Contribution status cannot be modified directly.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_contribution_status ON public.contributions;
CREATE TRIGGER trg_protect_contribution_status
BEFORE UPDATE ON public.contributions
FOR EACH ROW EXECUTE FUNCTION public.trg_protect_contribution_status();

-- 5.9 Progress History Sync Trigger
CREATE OR REPLACE FUNCTION public.trg_sync_progress_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.current_progress_pct IS DISTINCT FROM NEW.current_progress_pct THEN
        INSERT INTO public.progress_history(team_id, updated_by, progress_pct, milestone_note)
        VALUES (NEW.id, auth.uid(), NEW.current_progress_pct, 'Manual progress update');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_progress_history ON public.teams;
CREATE TRIGGER trg_auto_progress_history
AFTER UPDATE OF current_progress_pct ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_progress_history();

-- 5.10 Appointment Permissions & State Machine Triggers
CREATE OR REPLACE FUNCTION public.trg_enforce_appointment_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor           UUID := auth.uid();
    team_leader     UUID;
    assigned_mentor UUID;
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

    IF actor = team_leader THEN
        IF NEW.team_id <> OLD.team_id
           OR NEW.requested_by <> OLD.requested_by
           OR NEW.mentor_id <> OLD.mentor_id THEN
            RAISE EXCEPTION 'Team Lead cannot modify appointment ownership.';
        END IF;

        IF NEW.mentor_notes IS DISTINCT FROM OLD.mentor_notes THEN
            RAISE EXCEPTION 'Team Lead cannot modify mentor notes.';
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

    IF actor = assigned_mentor THEN
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

        IF NEW.status = 'COMPLETED' AND OLD.status <> 'IN_MEETING' THEN
            RAISE EXCEPTION 'Meeting must be active before completion.';
        END IF;

        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'User not permitted to modify this appointment.';
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_permissions ON public.appointments;
DROP TRIGGER IF EXISTS trg_guard_appointment_integrity ON public.appointments;
CREATE TRIGGER trg_appointment_permissions
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_appointment_permissions();

-- ==============================================================================
-- 6. PHASE 3: SERVER-SIDE AUTH SECURITY GATE (RECENT OAUTH & PASSWORD POLICY)
-- ==============================================================================
-- Enforces on the server side that password updates by authenticated users
-- require a recent OAuth sign-in within the last 10 minutes.
CREATE OR REPLACE FUNCTION public.trg_enforce_recent_oauth_for_password_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_fresh_oauth BOOLEAN := FALSE;
BEGIN
    IF auth.uid() IS NOT NULL
       AND OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN

        -- Check Supabase auth.mfa_amr_claims / auth.sessions for an OAuth authentication within 10 minutes
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'auth' AND table_name = 'mfa_amr_claims'
        ) THEN
            EXECUTE $q$
                SELECT EXISTS (
                    SELECT 1
                    FROM auth.mfa_amr_claims amr
                    JOIN auth.sessions s ON s.id = amr.session_id
                    WHERE s.user_id = auth.uid()
                      AND amr.authentication_method = 'oauth'
                      AND amr.updated_at >= (NOW() - INTERVAL '10 minutes')
                )
            $q$ INTO v_has_fresh_oauth;

            IF NOT v_has_fresh_oauth THEN
                RAISE EXCEPTION 'Recent Google OAuth verification (within 10 minutes) is required on the server before changing your password.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        DROP TRIGGER IF EXISTS trg_enforce_recent_oauth_password ON auth.users;
        CREATE TRIGGER trg_enforce_recent_oauth_password
        BEFORE UPDATE OF encrypted_password ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_recent_oauth_for_password_change();
    END IF;
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping auth.users trigger attachment (requires superuser / dashboard SQL editor).';
END $$;

-- ==============================================================================
-- 7. RPC FUNCTIONS
-- ==============================================================================

-- 7.1 Phase 2.3: Safe Student Directory Search (filters out exact USNs and emails)
DROP FUNCTION IF EXISTS public.search_available_students(TEXT);
DROP FUNCTION IF EXISTS public.search_available_students(TEXT, INT, TEXT);

CREATE OR REPLACE FUNCTION public.search_available_students(
    p_query    TEXT DEFAULT '',
    p_semester INT DEFAULT NULL,
    p_branch   TEXT DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.profiles%ROWTYPE;
BEGIN
    FOR v_row IN
        SELECT p.*
        FROM public.profiles p
        WHERE p.role = 'STUDENT'
          AND (auth.uid() IS NULL OR p.id <> auth.uid())
          AND NOT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = p.id)
          AND (
                COALESCE(p_query, '') = ''
                OR p.full_name ILIKE '%' || p_query || '%'
              )
          AND (p_semester IS NULL OR p.semester = p_semester)
          AND (p_branch IS NULL OR p.branch = p_branch)
        ORDER BY p.full_name
        LIMIT 100
    LOOP
        v_row.email := '';
        v_row.usn := NULL;
        v_row.faculty_code := NULL;
        RETURN NEXT v_row;
    END LOOP;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.search_available_students(TEXT, INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_available_students(TEXT, INT, TEXT) TO authenticated;

-- 7.2 Phase 2.3: Safe Team Browsing RPCs (never expose team_code to non-members/non-mentors)
DROP FUNCTION IF EXISTS public.get_recruiting_teams();
CREATE OR REPLACE FUNCTION public.get_recruiting_teams()
RETURNS SETOF public.teams
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.teams%ROWTYPE;
BEGIN
    FOR v_row IN
        SELECT t.*
        FROM public.teams t
        ORDER BY t.id DESC
        LIMIT 500
    LOOP
        IF NOT (
            v_row.leader_id = auth.uid()
            OR v_row.mentor_id = auth.uid()
            OR public.is_team_member(v_row.id)
        ) THEN
            v_row.team_code := '';
        END IF;
        RETURN NEXT v_row;
    END LOOP;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recruiting_teams() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recruiting_teams() TO authenticated;

DROP FUNCTION IF EXISTS public.get_team_directory();
CREATE OR REPLACE FUNCTION public.get_team_directory()
RETURNS TABLE (
    id                   BIGINT,
    team_code            VARCHAR(20),
    team_name            VARCHAR(100),
    project_title        VARCHAR(255),
    project_gist         TEXT,
    theme                VARCHAR(100),
    branch               VARCHAR(50),
    leader_id            UUID,
    mentor_id            UUID,
    current_progress_pct INT,
    leader_name          VARCHAR(150),
    leader_usn           VARCHAR(20),
    leader_email         VARCHAR(255)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        t.id::BIGINT,
        CASE
            WHEN t.leader_id = auth.uid()
                 OR t.mentor_id = auth.uid()
                 OR public.is_team_member(t.id)
            THEN t.team_code::VARCHAR(20)
            ELSE ''::VARCHAR(20)
        END AS team_code,
        t.team_name::VARCHAR(100),
        t.project_title::VARCHAR(255),
        t.project_gist::TEXT,
        t.theme::VARCHAR(100),
        t.branch::VARCHAR(50),
        t.leader_id::UUID,
        t.mentor_id::UUID,
        t.current_progress_pct::INT,
        l.full_name::VARCHAR(150) AS leader_name,
        CASE
            WHEN t.leader_id = auth.uid()
                 OR t.mentor_id = auth.uid()
                 OR public.is_team_member(t.id)
            THEN l.usn::VARCHAR(20)
            ELSE NULL::VARCHAR(20)
        END AS leader_usn,
        CASE
            WHEN t.leader_id = auth.uid()
                 OR t.mentor_id = auth.uid()
                 OR public.is_team_member(t.id)
            THEN l.email::VARCHAR(255)
            ELSE NULL::VARCHAR(255)
        END AS leader_email
    FROM public.teams t
    LEFT JOIN public.profiles l ON l.id = t.leader_id
    ORDER BY t.id DESC
    LIMIT 1000;
$$;

REVOKE ALL ON FUNCTION public.get_team_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_team_directory() TO authenticated;

-- 7.3 Mentor Claim & Mentorship Management RPCs
DROP FUNCTION IF EXISTS public.claim_team_by_id(BIGINT);
DROP FUNCTION IF EXISTS public.claim_team_by_code(TEXT);
DROP FUNCTION IF EXISTS public.abandon_team(BIGINT);
DROP FUNCTION IF EXISTS public.inspect_team_roster(BIGINT);

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
END;
$$;

REVOKE ALL ON FUNCTION public.abandon_team(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandon_team(BIGINT) TO authenticated;

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

CREATE OR REPLACE FUNCTION public.claim_team_by_code(p_code TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_id BIGINT;
    v_role    TEXT;
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
    WHERE team_code = UPPER(TRIM(p_code))
      AND mentor_id IS NULL
    RETURNING id INTO v_team_id;

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Invalid team code or team is already claimed';
    END IF;

    RETURN v_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_team_by_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_team_by_code(TEXT) TO authenticated;

-- 7.4 Update Team Progress RPC
DROP FUNCTION IF EXISTS public.update_team_progress(BIGINT, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.update_team_progress(
    p_team_id        BIGINT,
    p_progress_pct   INTEGER,
    p_milestone_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_pct INTEGER;
BEGIN
    IF NOT public.is_team_leader(p_team_id) THEN
        RAISE EXCEPTION 'Only the team leader may update progress.';
    END IF;

    IF p_progress_pct < 0 OR p_progress_pct > 100 THEN
        RAISE EXCEPTION 'Progress must be between 0 and 100.';
    END IF;

    SELECT current_progress_pct INTO v_old_pct
    FROM public.teams WHERE id = p_team_id;

    UPDATE public.teams
    SET current_progress_pct = p_progress_pct
    WHERE id = p_team_id;

    IF v_old_pct IS DISTINCT FROM p_progress_pct THEN
        UPDATE public.progress_history
        SET milestone_note = p_milestone_note
        WHERE team_id = p_team_id
          AND updated_by = auth.uid()
          AND milestone_note = 'Manual progress update'
          AND recorded_at = (
              SELECT MAX(recorded_at)
              FROM public.progress_history
              WHERE team_id = p_team_id AND updated_by = auth.uid()
          );
    ELSE
        INSERT INTO public.progress_history(team_id, updated_by, progress_pct, milestone_note)
        VALUES (p_team_id, auth.uid(), p_progress_pct, p_milestone_note);
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_team_progress(BIGINT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_team_progress(BIGINT, INTEGER, TEXT) TO authenticated;

-- 7.5 Respond to Lead Transfer RPC
DROP FUNCTION IF EXISTS public.respond_lead_transfer(BIGINT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.respond_lead_transfer(
    p_request_id BIGINT,
    p_accept     BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req RECORD;
BEGIN
    SELECT * INTO v_req
    FROM public.lead_transfer_requests
    WHERE id = p_request_id
      AND to_user_id = auth.uid()
      AND status = 'PENDING'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer request not found or already handled.';
    END IF;

    IF NOT p_accept THEN
        UPDATE public.lead_transfer_requests
        SET status = 'REJECTED', updated_at = NOW()
        WHERE id = p_request_id;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.teams
        WHERE id = v_req.team_id AND leader_id = v_req.from_user_id
    ) THEN
        UPDATE public.lead_transfer_requests
        SET status = 'CANCELLED', updated_at = NOW()
        WHERE id = p_request_id;
        RAISE EXCEPTION 'The requesting user is no longer team lead.';
    END IF;

    PERFORM set_config('trackment.trusted_update', 'true', true);

    UPDATE public.teams
    SET leader_id = v_req.to_user_id
    WHERE id = v_req.team_id;

    UPDATE public.profiles
    SET role = 'TEAM_LEAD'
    WHERE id = v_req.to_user_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.teams
        WHERE leader_id = v_req.from_user_id
          AND id <> v_req.team_id
    ) THEN
        UPDATE public.profiles
        SET role = 'STUDENT'
        WHERE id = v_req.from_user_id;
    END IF;

    PERFORM set_config('trackment.trusted_update', 'false', true);

    UPDATE public.lead_transfer_requests
    SET status = 'ACCEPTED', updated_at = NOW()
    WHERE id = p_request_id;

    UPDATE public.lead_transfer_requests
    SET status = 'CANCELLED', updated_at = NOW()
    WHERE team_id = v_req.team_id
      AND id <> p_request_id
      AND status = 'PENDING';
END;
$$;

REVOKE ALL ON FUNCTION public.respond_lead_transfer(BIGINT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_lead_transfer(BIGINT, BOOLEAN) TO authenticated;

-- 7.6 Revert Solo Lead to Member RPC
DROP FUNCTION IF EXISTS public.revert_lead_to_member();
CREATE OR REPLACE FUNCTION public.revert_lead_to_member()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_id      BIGINT;
    v_member_count INT;
BEGIN
    SELECT id INTO v_team_id
    FROM public.teams
    WHERE leader_id = auth.uid();

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'You are not the leader of any team.';
    END IF;

    SELECT COUNT(*) INTO v_member_count
    FROM public.team_members
    WHERE team_id = v_team_id AND user_id <> auth.uid();

    IF v_member_count > 0 THEN
        RAISE EXCEPTION 'Cannot revert while other members are in the team. Transfer leadership or remove members first.';
    END IF;

    DELETE FROM public.teams WHERE id = v_team_id;

    PERFORM set_config('trackment.trusted_update', 'true', true);
    UPDATE public.profiles SET role = 'STUDENT' WHERE id = auth.uid();
    PERFORM set_config('trackment.trusted_update', 'false', true);
END;
$$;

REVOKE ALL ON FUNCTION public.revert_lead_to_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revert_lead_to_member() TO authenticated;

-- 7.7 Leave Team RPC
DROP FUNCTION IF EXISTS public.leave_team();
CREATE OR REPLACE FUNCTION public.leave_team()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_team_id   BIGINT;
    v_joined_at TIMESTAMPTZ;
    v_profile   public.profiles%ROWTYPE;
    v_paths     TEXT[];
    v_removed   INT := 0;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT team_id, joined_at INTO v_team_id, v_joined_at
    FROM public.team_members
    WHERE user_id = v_uid;

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'You are not in a team.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.teams WHERE id = v_team_id AND leader_id = v_uid) THEN
        RAISE EXCEPTION 'A Team Lead cannot leave the team. Hand over leadership first (or revert to member if you are alone).';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;

    SELECT COALESCE(array_agg(cf.storage_path), ARRAY[]::TEXT[]) INTO v_paths
    FROM public.contribution_files cf
    JOIN public.contributions c ON c.id = cf.contribution_id
    WHERE c.team_id = v_team_id AND c.author_id = v_uid;

    DELETE FROM public.contribution_votes v
    USING public.contributions c
    WHERE v.contribution_id = c.id
      AND c.team_id = v_team_id
      AND c.status = 'PENDING'
      AND v.voter_id = v_uid;

    DELETE FROM public.contributions
    WHERE team_id = v_team_id AND author_id = v_uid;
    GET DIAGNOSTICS v_removed = ROW_COUNT;

    UPDATE public.lead_transfer_requests
    SET status = 'CANCELLED'
    WHERE team_id = v_team_id AND status = 'PENDING' AND to_user_id = v_uid;

    DELETE FROM public.join_requests WHERE student_id = v_uid AND team_id = v_team_id;
    DELETE FROM public.team_invitations WHERE student_id = v_uid AND team_id = v_team_id;

    INSERT INTO public.team_departures
        (team_id, user_id, full_name, usn, contributions_removed, joined_at)
    VALUES
        (v_team_id, v_uid, v_profile.full_name, v_profile.usn, v_removed, v_joined_at);

    DELETE FROM public.team_members WHERE user_id = v_uid AND team_id = v_team_id;

    RETURN jsonb_build_object(
        'team_id',               v_team_id,
        'contributions_removed', v_removed,
        'storage_paths',         to_jsonb(v_paths)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_team() TO authenticated;

-- 7.8 Democratic Vote on Team Lead Contribution RPC
DROP FUNCTION IF EXISTS public.vote_on_contribution(BIGINT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.vote_on_contribution(
    p_contribution_id BIGINT,
    p_verdict         TEXT,
    p_reason          TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid       UUID := auth.uid();
    v_c         public.contributions%ROWTYPE;
    v_leader    UUID;
    v_eligible  INT;
    v_required  INT;
    v_confirmed INT;
    v_rejected  INT;
    v_status    TEXT;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_verdict NOT IN ('CONFIRMED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid verdict.';
    END IF;

    IF p_verdict = 'REJECTED' AND (p_reason IS NULL OR LENGTH(TRIM(p_reason)) = 0) THEN
        RAISE EXCEPTION 'A reason is required when rejecting.';
    END IF;

    SELECT * INTO v_c FROM public.contributions WHERE id = p_contribution_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contribution not found.';
    END IF;

    SELECT leader_id INTO v_leader FROM public.teams WHERE id = v_c.team_id;

    IF v_c.author_id IS DISTINCT FROM v_leader THEN
        RAISE EXCEPTION 'Only the Team Lead''s contributions are decided by member votes.';
    END IF;

    IF v_c.status <> 'PENDING' THEN
        RAISE EXCEPTION 'This contribution has already been decided (%).', v_c.status;
    END IF;

    IF v_uid = v_c.author_id THEN
        RAISE EXCEPTION 'You cannot vote on your own contribution.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = v_c.team_id AND user_id = v_uid
    ) THEN
        RAISE EXCEPTION 'Only members of this team can vote.';
    END IF;

    BEGIN
        INSERT INTO public.contribution_votes (contribution_id, voter_id, verdict, rejection_reason)
        VALUES (p_contribution_id, v_uid, p_verdict, NULLIF(TRIM(COALESCE(p_reason, '')), ''));
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'You have already voted on this contribution.';
    END;

    SELECT COUNT(*) INTO v_eligible
    FROM public.team_members
    WHERE team_id = v_c.team_id AND user_id <> v_c.author_id;

    v_required := GREATEST(1, LEAST(2, v_eligible));

    SELECT
        COUNT(*) FILTER (WHERE verdict = 'CONFIRMED'),
        COUNT(*) FILTER (WHERE verdict = 'REJECTED')
    INTO v_confirmed, v_rejected
    FROM public.contribution_votes
    WHERE contribution_id = p_contribution_id;

    v_status := 'PENDING';
    IF v_confirmed >= v_required THEN
        v_status := 'CONFIRMED';
    ELSIF v_rejected >= v_required THEN
        v_status := 'REJECTED';
    END IF;

    IF v_status <> 'PENDING' THEN
        PERFORM set_config('trackment.trusted_contribution_status', 'true', true);
        UPDATE public.contributions
        SET status = v_status, updated_at = NOW()
        WHERE id = p_contribution_id;
        PERFORM set_config('trackment.trusted_contribution_status', 'false', true);
    END IF;

    RETURN v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.vote_on_contribution(BIGINT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_on_contribution(BIGINT, TEXT, TEXT) TO authenticated;

-- 7.9 Delete Own Account RPC
DROP FUNCTION IF EXISTS public.delete_user();
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_team_id BIGINT;
BEGIN
    SELECT id INTO v_team_id FROM public.teams WHERE leader_id = auth.uid();

    IF v_team_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = v_team_id AND user_id <> auth.uid()
        ) THEN
            RAISE EXCEPTION 'You are currently a Team Lead with members. Transfer leadership before deleting your account.';
        END IF;
        DELETE FROM public.teams WHERE id = v_team_id;
    END IF;

    DELETE FROM public.profiles WHERE id = auth.uid();
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES & COLUMN GRANTS (PHASE 2 HARDENING)
-- ==============================================================================

ALTER TABLE public.verified_faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_departures ENABLE ROW LEVEL SECURITY;

-- 8.1 Verified Faculty Policies (Read own verification status only)
DROP POLICY IF EXISTS verified_faculty_read_own ON public.verified_faculty;
CREATE POLICY verified_faculty_read_own ON public.verified_faculty
FOR SELECT TO authenticated
USING (LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', '')));

-- 8.2 Profiles Policies (Phase 2.1 & 2.3: No global USING(true) PII leakage; strict faculty check)
DROP POLICY IF EXISTS profile_read_directory ON public.profiles;
DROP POLICY IF EXISTS profile_read_self ON public.profiles;
DROP POLICY IF EXISTS profile_read_same_team ON public.profiles;
DROP POLICY IF EXISTS mentor_read_assigned_students ON public.profiles;
DROP POLICY IF EXISTS students_read_assigned_mentor ON public.profiles;
DROP POLICY IF EXISTS profile_read_team_interactions ON public.profiles;
DROP POLICY IF EXISTS insert_own_profile ON public.profiles;
DROP POLICY IF EXISTS update_own_profile ON public.profiles;

CREATE POLICY profile_read_self ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY profile_read_same_team ON public.profiles
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.team_members my_team
        JOIN public.team_members target_team ON my_team.team_id = target_team.team_id
        WHERE my_team.user_id = auth.uid()
          AND target_team.user_id = public.profiles.id
    )
);

CREATE POLICY mentor_read_assigned_students ON public.profiles
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.teams t
        JOIN public.team_members tm ON tm.team_id = t.id
        WHERE t.mentor_id = auth.uid()
          AND tm.user_id = public.profiles.id
    )
);

CREATE POLICY students_read_assigned_mentor ON public.profiles
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.team_members tm
        JOIN public.teams t ON tm.team_id = t.id
        WHERE tm.user_id = auth.uid()
          AND (t.mentor_id = public.profiles.id OR t.leader_id = public.profiles.id)
    )
);

CREATE POLICY profile_read_team_interactions ON public.profiles
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.join_requests jr
        JOIN public.teams t ON t.id = jr.team_id
        WHERE jr.student_id = public.profiles.id AND t.leader_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.team_invitations ti
        JOIN public.teams t ON t.id = ti.team_id
        WHERE (ti.student_id = public.profiles.id AND t.leader_id = auth.uid())
           OR (ti.student_id = auth.uid() AND t.leader_id = public.profiles.id)
    )
);

-- Phase 2.1: Enforce verified_faculty membership on MENTOR profile creation
CREATE POLICY insert_own_profile ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
    id = auth.uid()
    AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
    AND (
        role = 'STUDENT'
        OR (role = 'MENTOR' AND public.is_verified_faculty(email))
    )
);

CREATE POLICY update_own_profile ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 8.3 Teams Policies (Phase 2.3: Restrict team_read so team_code is only visible to leader, mentor, or members)
DROP POLICY IF EXISTS team_read ON public.teams;
DROP POLICY IF EXISTS team_lead_create ON public.teams;
DROP POLICY IF EXISTS team_lead_or_mentor_update ON public.teams;

CREATE POLICY team_read ON public.teams
FOR SELECT TO authenticated
USING (
    leader_id = auth.uid()
    OR mentor_id = auth.uid()
    OR public.is_team_member(id)
    OR EXISTS (
        SELECT 1 FROM public.team_invitations ti
        WHERE ti.team_id = public.teams.id
          AND ti.student_id = auth.uid()
    )
);

CREATE POLICY team_lead_create ON public.teams
FOR INSERT TO authenticated
WITH CHECK (leader_id = auth.uid());

CREATE POLICY team_lead_or_mentor_update ON public.teams
FOR UPDATE TO authenticated
USING (leader_id = auth.uid() OR mentor_id = auth.uid())
WITH CHECK (leader_id = auth.uid() OR mentor_id = auth.uid());

REVOKE UPDATE ON public.teams FROM authenticated;
GRANT UPDATE (team_name, project_title, project_gist, abstract, objectives, theme, current_progress_pct)
ON public.teams TO authenticated;

-- 8.4 Team Members Policies
DROP POLICY IF EXISTS team_member_read ON public.team_members;
DROP POLICY IF EXISTS team_member_insert ON public.team_members;
DROP POLICY IF EXISTS team_member_delete ON public.team_members;

CREATE POLICY team_member_read ON public.team_members
FOR SELECT TO authenticated
USING (public.can_access_team(team_id));

CREATE POLICY team_member_delete ON public.team_members
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_team_leader(team_id));

-- 8.5 Team Invitations Policies
DROP POLICY IF EXISTS invitations_read ON public.team_invitations;
DROP POLICY IF EXISTS lead_send_invitation ON public.team_invitations;
DROP POLICY IF EXISTS student_respond_invitation ON public.team_invitations;

CREATE POLICY invitations_read ON public.team_invitations
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_team_leader(team_id));

CREATE POLICY lead_send_invitation ON public.team_invitations
FOR INSERT TO authenticated
WITH CHECK (public.is_team_leader(team_id));

CREATE POLICY student_respond_invitation ON public.team_invitations
FOR UPDATE TO authenticated
USING (student_id = auth.uid() AND status = 'PENDING')
WITH CHECK (student_id = auth.uid() AND status IN ('ACCEPTED', 'REJECTED'));

REVOKE UPDATE ON public.team_invitations FROM authenticated;
GRANT UPDATE (status) ON public.team_invitations TO authenticated;

-- 8.6 Join Requests Policies
DROP POLICY IF EXISTS join_requests_select ON public.join_requests;
DROP POLICY IF EXISTS join_requests_insert ON public.join_requests;
DROP POLICY IF EXISTS join_requests_update ON public.join_requests;
DROP POLICY IF EXISTS join_requests_delete ON public.join_requests;

CREATE POLICY join_requests_select ON public.join_requests
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.is_team_leader(team_id));

CREATE POLICY join_requests_insert ON public.join_requests
FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid())
);

CREATE POLICY join_requests_update ON public.join_requests
FOR UPDATE TO authenticated
USING (public.is_team_leader(team_id))
WITH CHECK (public.is_team_leader(team_id));

CREATE POLICY join_requests_delete ON public.join_requests
FOR DELETE TO authenticated
USING (student_id = auth.uid() OR public.is_team_leader(team_id));

REVOKE UPDATE ON public.join_requests FROM authenticated;
GRANT UPDATE (status) ON public.join_requests TO authenticated;

-- 8.7 Lead Transfer Requests Policies
DROP POLICY IF EXISTS lead_transfer_select ON public.lead_transfer_requests;
DROP POLICY IF EXISTS lead_transfer_insert ON public.lead_transfer_requests;
DROP POLICY IF EXISTS lead_transfer_cancel ON public.lead_transfer_requests;

CREATE POLICY lead_transfer_select ON public.lead_transfer_requests
FOR SELECT TO authenticated
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY lead_transfer_insert ON public.lead_transfer_requests
FOR INSERT TO authenticated
WITH CHECK (
    from_user_id = auth.uid()
    AND public.is_team_leader(team_id)
    AND EXISTS (
        SELECT 1 FROM public.team_members
        WHERE team_id = public.lead_transfer_requests.team_id
          AND user_id = to_user_id
    )
);

CREATE POLICY lead_transfer_cancel ON public.lead_transfer_requests
FOR UPDATE TO authenticated
USING (from_user_id = auth.uid() AND status = 'PENDING')
WITH CHECK (status = 'CANCELLED');

-- 8.8 Contributions, Files, Reviews, Votes Policies
DROP POLICY IF EXISTS contribution_read ON public.contributions;
DROP POLICY IF EXISTS contribution_insert ON public.contributions;
DROP POLICY IF EXISTS contribution_author_update_pending ON public.contributions;
DROP POLICY IF EXISTS contribution_author_delete ON public.contributions;

CREATE POLICY contribution_read ON public.contributions
FOR SELECT TO authenticated
USING (public.can_access_team(team_id));

CREATE POLICY contribution_insert ON public.contributions
FOR INSERT TO authenticated
WITH CHECK (
    public.is_team_member(team_id)
    AND author_id = auth.uid()
    AND status = 'PENDING'
);

CREATE POLICY contribution_author_update_pending ON public.contributions
FOR UPDATE TO authenticated
USING (author_id = auth.uid() AND status = 'PENDING')
WITH CHECK (author_id = auth.uid() AND status IN ('PENDING', 'SOFT_DELETED'));

CREATE POLICY contribution_author_delete ON public.contributions
FOR DELETE TO authenticated
USING (author_id = auth.uid() AND status = 'PENDING');

DROP POLICY IF EXISTS contribution_file_read ON public.contribution_files;
DROP POLICY IF EXISTS contribution_file_insert ON public.contribution_files;

CREATE POLICY contribution_file_read ON public.contribution_files
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contributions c
        WHERE c.id = public.contribution_files.contribution_id
          AND public.can_access_team(c.team_id)
    )
);

CREATE POLICY contribution_file_insert ON public.contribution_files
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contributions c
        WHERE c.id = public.contribution_files.contribution_id
          AND c.author_id = auth.uid()
          AND c.status = 'PENDING'
    )
);

DROP POLICY IF EXISTS review_read ON public.contribution_reviews;
DROP POLICY IF EXISTS review_insert ON public.contribution_reviews;

CREATE POLICY review_read ON public.contribution_reviews
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contributions c
        WHERE c.id = public.contribution_reviews.contribution_id
          AND public.can_access_team(c.team_id)
    )
);

CREATE POLICY review_insert ON public.contribution_reviews
FOR INSERT TO authenticated
WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.contributions c
        JOIN public.teams t ON t.id = c.team_id
        WHERE c.id = public.contribution_reviews.contribution_id
          AND (t.leader_id = auth.uid() OR t.mentor_id = auth.uid())
    )
);

DROP POLICY IF EXISTS contribution_votes_read ON public.contribution_votes;
CREATE POLICY contribution_votes_read ON public.contribution_votes
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contributions c
        WHERE c.id = public.contribution_votes.contribution_id
          AND public.can_access_team(c.team_id)
    )
);

-- 8.9 Progress History, Appointments, Feedback, Ledger, Departures Policies
DROP POLICY IF EXISTS progress_read ON public.progress_history;
CREATE POLICY progress_read ON public.progress_history
FOR SELECT TO authenticated
USING (public.can_access_team(team_id));

DROP POLICY IF EXISTS appointment_read ON public.appointments;
DROP POLICY IF EXISTS lead_request_appointment ON public.appointments;
DROP POLICY IF EXISTS appointment_update ON public.appointments;

CREATE POLICY appointment_read ON public.appointments
FOR SELECT TO authenticated
USING (public.can_access_team(team_id));

CREATE POLICY lead_request_appointment ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
    public.is_team_leader(team_id)
    AND requested_by = auth.uid()
    AND status = 'REQUESTED'
    AND EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = public.appointments.team_id
          AND t.mentor_id = public.appointments.mentor_id
    )
);

CREATE POLICY appointment_update ON public.appointments
FOR UPDATE TO authenticated
USING (public.is_team_leader(team_id) OR public.is_team_mentor(team_id))
WITH CHECK (public.is_team_leader(team_id) OR public.is_team_mentor(team_id));

-- Phase 2.2: Strict Mentor Feedback Access (is_team_mentor(team_id) strictly required)
DROP POLICY IF EXISTS feedback_read ON public.feedback;
DROP POLICY IF EXISTS mentor_insert_feedback ON public.feedback;

CREATE POLICY feedback_read ON public.feedback
FOR SELECT TO authenticated
USING (public.can_access_team(team_id));

CREATE POLICY mentor_insert_feedback ON public.feedback
FOR INSERT TO authenticated
WITH CHECK (
    mentor_id = auth.uid()
    AND public.is_team_mentor(team_id)
);

DROP POLICY IF EXISTS meeting_ledger_read ON public.meeting_ledger;
DROP POLICY IF EXISTS mentor_insert_meeting_ledger ON public.meeting_ledger;
DROP POLICY IF EXISTS mentor_update_meeting_ledger ON public.meeting_ledger;

CREATE POLICY meeting_ledger_read ON public.meeting_ledger
FOR SELECT TO authenticated
USING (public.can_access_team(team_id));

CREATE POLICY mentor_insert_meeting_ledger ON public.meeting_ledger
FOR INSERT TO authenticated
WITH CHECK (public.is_team_mentor(team_id));

CREATE POLICY mentor_update_meeting_ledger ON public.meeting_ledger
FOR UPDATE TO authenticated
USING (public.is_team_mentor(team_id))
WITH CHECK (public.is_team_mentor(team_id));

DROP POLICY IF EXISTS attendance_read ON public.meeting_attendance;
DROP POLICY IF EXISTS mentor_manage_attendance ON public.meeting_attendance;

CREATE POLICY attendance_read ON public.meeting_attendance
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.meeting_ledger ml
        WHERE ml.id = public.meeting_attendance.meeting_ledger_id
          AND public.can_access_team(ml.team_id)
    )
);

CREATE POLICY mentor_manage_attendance ON public.meeting_attendance
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.meeting_ledger ml
        JOIN public.teams t ON t.id = ml.team_id
        WHERE ml.id = public.meeting_attendance.meeting_ledger_id
          AND t.mentor_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.meeting_ledger ml
        JOIN public.teams t ON t.id = ml.team_id
        WHERE ml.id = public.meeting_attendance.meeting_ledger_id
          AND t.mentor_id = auth.uid()
    )
);

DROP POLICY IF EXISTS team_departures_read ON public.team_departures;
CREATE POLICY team_departures_read ON public.team_departures
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.can_access_team(team_id)
);

-- 8.10 Restrictive RVCE Domain Enforcement Across All Application Tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'verified_faculty', 'profiles', 'teams', 'team_members', 'team_invitations',
        'join_requests', 'lead_transfer_requests', 'contributions', 'contribution_files',
        'contribution_reviews', 'contribution_votes', 'progress_history', 'appointments',
        'feedback', 'meeting_ledger', 'meeting_attendance', 'team_departures'
    ] LOOP
        EXECUTE format('DROP POLICY IF EXISTS rvce_only ON public.%I', t);
        EXECUTE format(
            'CREATE POLICY rvce_only ON public.%I AS RESTRICTIVE FOR ALL TO authenticated ' ||
            'USING (public.is_rvce_user()) WITH CHECK (public.is_rvce_user())',
            t
        );
    END LOOP;
END $$;

-- ==============================================================================
-- 9. STORAGE POLICIES (BUCKET: project-proofs)
-- ==============================================================================

DROP POLICY IF EXISTS "team and mentor read proof files" ON storage.objects;
CREATE POLICY "team and mentor read proof files"
ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'project-proofs'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT 'team_' || tm.team_id::TEXT
            FROM public.team_members tm
            WHERE tm.user_id = auth.uid()
        )
        OR (storage.foldername(name))[1] IN (
            SELECT 'team_' || t.id::TEXT
            FROM public.teams t
            WHERE t.mentor_id = auth.uid() OR t.leader_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "team members upload proof files" ON storage.objects;
CREATE POLICY "team members upload proof files"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'project-proofs'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT 'team_' || tm.team_id::TEXT
            FROM public.team_members tm
            WHERE tm.user_id = auth.uid()
        )
        OR (storage.foldername(name))[1] IN (
            SELECT 'team_' || t.id::TEXT
            FROM public.teams t
            WHERE t.leader_id = auth.uid()
        )
    )
    AND LOWER(storage.extension(name)) IN (
        'mp4', 'mov', 'mkv',
        'pdf', 'docx', 'doc', 'pptx', 'ppt',
        'jpg', 'jpeg', 'png'
    )
);

DROP POLICY IF EXISTS "authenticated owner delete proof" ON storage.objects;
CREATE POLICY "authenticated owner delete proof"
ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'project-proofs'
    AND owner_id = auth.uid()::TEXT
);

-- ==============================================================================
-- 10. REALTIME PUBLICATION
-- ==============================================================================

DO $$
DECLARE
    t TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH t IN ARRAY ARRAY[
            'team_members', 'teams', 'team_invitations',
            'join_requests', 'lead_transfer_requests', 'feedback', 'contribution_votes'
        ] LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime'
                  AND schemaname = 'public'
                  AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            END IF;
        END LOOP;
    END IF;
END $$;

ALTER TABLE public.feedback REPLICA IDENTITY FULL;

-- ==============================================================================
-- 10.5 PROJECT ABSTRACT & OBJECTIVES, AND TEAM MARKS / EVALUATIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.update_team_project_info(
    p_team_id       BIGINT,
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

DROP POLICY IF EXISTS evaluations_read ON public.team_evaluations;
CREATE POLICY evaluations_read ON public.team_evaluations
FOR SELECT TO authenticated
USING (
    public.can_access_team(team_id)
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'MENTOR')
);

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
-- 11. PRIVILEGE HARDENING (REVOKE ANON EXECUTE ON SECURITY DEFINER FUNCTIONS)
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure AS proc_sig
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
          AND prosecdef = true
    ) LOOP
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon;', r.proc_sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', r.proc_sig);
    END LOOP;
END $$;
