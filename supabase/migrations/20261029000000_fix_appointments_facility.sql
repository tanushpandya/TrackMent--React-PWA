-- ==============================================================================
-- TRACKMENT - FIX MENTOR APPOINTMENT FACILITY, PERMISSIONS & NOTIFICATION GUARDS
-- Migration: 20261029000000_fix_appointments_facility.sql
-- ==============================================================================

-- 1. Relax appointment read policy so allocated mentor and requester can always view
DROP POLICY IF EXISTS appointment_read ON public.appointments;
CREATE POLICY appointment_read ON public.appointments
FOR SELECT TO authenticated
USING (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.can_access_team(team_id)
);

-- 2. Relax appointment update policy so allocated mentor and leader can update
DROP POLICY IF EXISTS appointment_update ON public.appointments;
CREATE POLICY appointment_update ON public.appointments
FOR UPDATE TO authenticated
USING (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.is_team_leader(team_id)
    OR public.is_team_mentor(team_id)
)
WITH CHECK (
    mentor_id = auth.uid()
    OR requested_by = auth.uid()
    OR public.is_team_leader(team_id)
    OR public.is_team_mentor(team_id)
);

-- 3. Enhance Appointment State Machine Trigger
-- - Allows actor = assigned_mentor OR actor = OLD.mentor_id
-- - Allows actor = team_leader OR actor = OLD.requested_by
-- - Allows Team Lead to accept mentor-proposed reschedule (RESCHEDULED -> CONFIRMED)
-- - Allows direct completion from CONFIRMED or IN_MEETING
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

        -- Allow Lead to accept a mentor's proposed reschedule
        IF NEW.status = 'CONFIRMED' AND OLD.status = 'RESCHEDULED' THEN
            -- Lead accepts the slot proposed by the mentor
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
CREATE TRIGGER trg_appointment_permissions
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_appointment_permissions();


-- 4. Defensive Exception Handling on Notification Webhooks
-- Never let external HTTP notification errors roll back core DB appointment changes
CREATE OR REPLACE FUNCTION public.fn_notify_team_on_appointment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_recipients   text[];
    v_mentor_name  text;
    v_team_name    text;
    v_slot         text;
    v_bearer_token text;
BEGIN
    v_bearer_token := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcGplaHNicGplcW9td2xzaG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE1MzYsImV4cCI6MjA3NjY0NzUzNn0.2YQ0k0dJ1N_rU7Z7N6y0RzXz8qX5i8t8j9v9w0x1y2z'
    );

    IF NEW.status IN ('CONFIRMED', 'RESCHEDULED')
       AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.confirmed_slot IS DISTINCT FROM NEW.confirmed_slot) THEN
        BEGIN
            SELECT array_agg(DISTINCT p.email)
            INTO v_recipients
            FROM public.profiles p
            WHERE p.id IN (
                SELECT user_id FROM public.team_members WHERE team_id = NEW.team_id
                UNION
                SELECT leader_id FROM public.teams WHERE id = NEW.team_id
            )
            AND p.email IS NOT NULL AND p.email <> '';

            SELECT full_name INTO v_mentor_name FROM public.profiles WHERE id = NEW.mentor_id;
            SELECT team_name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;
            v_slot := to_char(NEW.confirmed_slot, 'YYYY-MM-DD HH24:MI');

            IF v_recipients IS NOT NULL AND array_length(v_recipients, 1) > 0 THEN
                IF NEW.status = 'CONFIRMED' THEN
                    PERFORM net.http_post(
                        url := 'https://cqpjehsbpjeqomwlshob.supabase.co/functions/v1/send-team-notification',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || v_bearer_token,
                            'apikey', v_bearer_token
                        ),
                        body := jsonb_build_object(
                            'recipients', v_recipients,
                            'subject', '✅ [TrackMent] Meeting Confirmed with ' || COALESCE(v_mentor_name, 'Faculty Mentor'),
                            'htmlContent', '<p>Your meeting request has been <b>accepted</b> by ' || COALESCE(v_mentor_name, 'your mentor') || '.</p><p><b>Confirmed Time:</b> ' || v_slot || '</p>'
                        )
                    );
                ELSIF NEW.status = 'RESCHEDULED' THEN
                    PERFORM net.http_post(
                        url := 'https://cqpjehsbpjeqomwlshob.supabase.co/functions/v1/send-team-notification',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer ' || v_bearer_token,
                            'apikey', v_bearer_token
                        ),
                        body := jsonb_build_object(
                            'recipients', v_recipients,
                            'subject', '📅 [TrackMent] Meeting Rescheduled by ' || COALESCE(v_mentor_name, 'Faculty Mentor'),
                            'htmlContent', '<p>Your mentor ' || COALESCE(v_mentor_name, 'Faculty') || ' has proposed a new meeting time.</p><p><b>New Slot:</b> ' || v_slot || '</p><p><b>Notes:</b> ' || COALESCE(NEW.mentor_notes, 'None') || '</p>'
                        )
                    );
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Appointment status email notification failed: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on appointments
DROP TRIGGER IF EXISTS trg_email_on_appointment_status ON public.appointments;
CREATE TRIGGER trg_email_on_appointment_status
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_team_on_appointment_status();

