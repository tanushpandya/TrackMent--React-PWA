-- supabase/migrations/20261025000000_email_notification_triggers.sql
-- Enables pg_net for HTTP webhook triggers to Supabase Edge Functions.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Notify all team members on Faculty Feedback ('MEET_ME', 'COMMENT', or team-level 'THUMBS_UP')
CREATE OR REPLACE FUNCTION public.fn_notify_team_on_meet_me()
RETURNS TRIGGER AS $$
DECLARE
    v_recipients text[];
    v_team_name text;
    v_mentor_name text;
    v_subject text;
    v_html text;
    v_bearer_token text;
BEGIN
    v_bearer_token := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcGplaHNicGplcW9td2xzaG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE1MzYsImV4cCI6MjA3NjY0NzUzNn0.2YQ0k0dJ1N_rU7Z7N6y0RzXz8qX5i8t8j9v9w0x1y2z'
    );

    IF NEW.feedback_type IN ('MEET_ME', 'COMMENT')
       OR (NEW.feedback_type = 'THUMBS_UP' AND NEW.contribution_id IS NULL) THEN
        -- Collect emails of ALL students in this team (members + leader)
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

        IF NEW.feedback_type = 'MEET_ME' THEN
            v_subject := '🚨 [TrackMent] Immediate Summon: COME MEET ME from ' || COALESCE(v_mentor_name, 'Faculty Mentor');
            v_html := '<h3>Urgent Mentor Notification</h3>' ||
                      '<p>Your faculty mentor <b>' || COALESCE(v_mentor_name, 'Faculty Mentor') || '</b> has summoned <b>' || COALESCE(v_team_name, 'your team') || '</b> for an immediate meeting.</p>' ||
                      '<p><b>Notes from mentor:</b> ' || COALESCE(NEW.content, 'Please report to the faculty cabin immediately.') || '</p>';
        ELSIF NEW.feedback_type = 'THUMBS_UP' THEN
            v_subject := '👍 [TrackMent] Milestone Acknowledged by ' || COALESCE(v_mentor_name, 'Faculty Mentor');
            v_html := '<h3>Faculty Mentor Acknowledgement</h3>' ||
                      '<p>Your faculty mentor <b>' || COALESCE(v_mentor_name, 'Faculty Mentor') || '</b> sent a positive acknowledgement to <b>' || COALESCE(v_team_name, 'your team') || '</b>.</p>' ||
                      '<p><b>Message from mentor:</b> ' || COALESCE(NEW.content, 'Great work team! Keep it up! 👍') || '</p>';
        ELSE
            v_subject := '💬 [TrackMent] New Mentor Feedback from ' || COALESCE(v_mentor_name, 'Faculty Mentor');
            v_html := '<h3>New Faculty Mentor Guidance</h3>' ||
                      '<p>Your faculty mentor <b>' || COALESCE(v_mentor_name, 'Faculty Mentor') || '</b> has shared new feedback and guidance for <b>' || COALESCE(v_team_name, 'your team') || '</b>.</p>' ||
                      '<p><b>Feedback from mentor:</b> ' || COALESCE(NEW.content, 'Please check your TrackMent dashboard for details.') || '</p>';
        END IF;

        IF v_recipients IS NOT NULL AND array_length(v_recipients, 1) > 0 THEN
            PERFORM net.http_post(
                url := 'https://cqpjehsbpjeqomwlshob.supabase.co/functions/v1/send-team-notification',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_bearer_token,
                    'apikey', v_bearer_token
                ),
                body := jsonb_build_object(
                    'recipients', v_recipients,
                    'subject', v_subject,
                    'htmlContent', v_html
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_email_on_meet_me ON public.feedback;
CREATE TRIGGER trg_email_on_meet_me
AFTER INSERT ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_team_on_meet_me();


-- 2. Notify all team members on Meeting Confirmed or Rescheduled
CREATE OR REPLACE FUNCTION public.fn_notify_team_on_appointment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_recipients text[];
    v_mentor_name text;
    v_team_name text;
    v_slot text;
    v_bearer_token text;
BEGIN
    v_bearer_token := COALESCE(
        NULLIF(current_setting('app.settings.service_role_key', true), ''),
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcGplaHNicGplcW9td2xzaG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE1MzYsImV4cCI6MjA3NjY0NzUzNn0.2YQ0k0dJ1N_rU7Z7N6y0RzXz8qX5i8t8j9v9w0x1y2z'
    );

    IF NEW.status IN ('CONFIRMED', 'RESCHEDULED') AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.confirmed_slot IS DISTINCT FROM NEW.confirmed_slot) THEN
        -- Collect emails of ALL students in this team (members + leader)
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_email_on_appointment_status ON public.appointments;
CREATE TRIGGER trg_email_on_appointment_status
AFTER UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_team_on_appointment_status();
