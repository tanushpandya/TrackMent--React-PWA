import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Calendar, Send, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FeedbackService } from '../../services/feedback.service';
import { Modal } from '../../components/common/Modal';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  onFeedbackSent?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  teamId,
  teamName,
  onFeedbackSent,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [feedbackType, setFeedbackType] = useState<'COMMENT' | 'THUMBS_UP' | 'MEET_ME'>('COMMENT');
  const [content, setContent] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = content.trim();
    if (feedbackType === 'COMMENT' && !trimmed) {
      setError('Please enter feedback text.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Feedback cannot exceed 500 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const defaultContent =
      feedbackType === 'MEET_ME'
        ? 'Please come meet me at the department/staff room to discuss your project progress.'
        : feedbackType === 'THUMBS_UP'
        ? 'Great progress, keep up the good work! 👍'
        : trimmed;

    try {
      await FeedbackService.submitFeedback({
        teamId,
        mentorId: user.id,
        feedbackType,
        content: trimmed || defaultContent,
        sendEmailNotification: sendEmail,
      });

      showToast(`Feedback published to ${teamName}!`, 'success');
      setContent('');
      if (onFeedbackSent) onFeedbackSent();
      onClose();
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError(err?.message || 'Could not send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Publish Feedback — ${teamName}`}>
      <form onSubmit={handleSubmit}>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
          Send direct feedback, endorsement, or consultation requests to the team.
        </p>

        {/* Feedback Type Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setFeedbackType('COMMENT')}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: '1.5px solid',
              borderColor: feedbackType === 'COMMENT' ? 'var(--color-primary)' : 'var(--color-border)',
              background: feedbackType === 'COMMENT' ? 'rgba(11, 77, 136, 0.1)' : 'white',
              color: feedbackType === 'COMMENT' ? 'var(--color-primary)' : 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MessageSquare size={16} />
            Note / Advice
          </button>

          <button
            type="button"
            onClick={() => setFeedbackType('THUMBS_UP')}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: '1.5px solid',
              borderColor: feedbackType === 'THUMBS_UP' ? 'var(--color-confirmed)' : 'var(--color-border)',
              background: feedbackType === 'THUMBS_UP' ? 'rgba(50, 143, 129, 0.1)' : 'white',
              color: feedbackType === 'THUMBS_UP' ? 'var(--color-confirmed)' : 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ThumbsUp size={16} />
            Endorse 👍
          </button>

          <button
            type="button"
            onClick={() => setFeedbackType('MEET_ME')}
            style={{
              padding: '10px 8px',
              borderRadius: '8px',
              border: '1.5px solid',
              borderColor: feedbackType === 'MEET_ME' ? 'var(--color-pending)' : 'var(--color-border)',
              background: feedbackType === 'MEET_ME' ? 'rgba(166, 120, 39, 0.1)' : 'white',
              color: feedbackType === 'MEET_ME' ? 'var(--color-pending)' : 'var(--color-text-primary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Calendar size={16} />
            Meet Me
          </button>
        </div>

        {/* Text Area */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            Feedback Notes {feedbackType === 'COMMENT' && <span style={{ color: 'var(--color-danger)' }}>*</span>}
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              feedbackType === 'MEET_ME'
                ? 'Optional notes: Please meet me on Thursday between 2 PM and 4 PM...'
                : feedbackType === 'THUMBS_UP'
                ? 'Optional comments celebrating this milestone...'
                : 'Write your constructive feedback, corrections, or suggestions...'
            }
            maxLength={500}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--color-border)',
              fontSize: '13.5px',
              color: 'var(--color-text-primary)',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {content.length}/500
          </div>
        </div>

        {/* Email Notification Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <input
            type="checkbox"
            id="sendEmailCheck"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          />
          <label
            htmlFor="sendEmailCheck"
            style={{
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Mail size={14} color="var(--color-text-secondary)" />
            Send email notification to all team members
          </label>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(179, 79, 92, 0.08)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px',
              borderRadius: '8px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 0 #07335c',
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
            Publish Feedback
          </button>
        </div>
      </form>
    </Modal>
  );
};
