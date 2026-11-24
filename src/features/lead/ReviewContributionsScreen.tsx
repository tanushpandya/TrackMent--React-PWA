import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Download,
  Check,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { StorageService } from '../../services/storage.service';
import { supabase } from '../../services/supabase';
import { ContributionModel } from '../../types';

export const ReviewContributionsScreen: React.FC = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [pendingList, setPendingList] = useState<ContributionModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [selectedContrib, setSelectedContrib] = useState<ContributionModel | null>(null);
  const [verdict, setVerdict] = useState<'CONFIRMED' | 'REJECTED'>('CONFIRMED');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPending = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = await ContributionService.fetchPendingForTeam(team.id);
      // Lead can review other members' contributions
      setPendingList(data.filter((c) => c.authorId !== user?.id));
    } catch (e) {
      console.error('Error loading pending review contributions:', e);
    } finally {
      setLoading(false);
    }
  }, [team, user]);

  useEffect(() => {
    loadPending();

    if (!team) return;
    const channel = supabase
      .channel(`realtime:lead_reviews_${team.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions', filter: `team_id=eq.${team.id}` }, () => {
        loadPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, loadPending]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContrib || !user) return;
    if (verdict === 'REJECTED' && !reason.trim()) {
      showToast('Please provide a constructive reason when requesting updates.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await ContributionService.submitReview({
        contributionId: selectedContrib.id,
        reviewerId: user.id,
        verdict,
        rejectionReason: reason.trim() || undefined,
      });

      showToast(
        verdict === 'CONFIRMED'
          ? 'Deliverable accepted and verified! 🎉'
          : 'Update request submitted to teammate.',
        'success'
      );
      setSelectedContrib(null);
      setReason('');
      loadPending();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[10px] font-bold font-mono">
              QA REVIEW
            </span>
            <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
              Peer Review Submissions
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Examine submitted proof artifacts, verify code and documentation, and recognize peer contributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Review Queue Feed */}
      <div className="surface-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-[14.5px] font-bold text-[#0A2540]">
            Awaiting Review ({pendingList.length})
          </h2>
          <span className="text-xs font-mono font-bold text-slate-400">Team Quality Assurance</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1D63ED]" />
            <div className="text-sm">Loading submissions queue...</div>
          </div>
        ) : pendingList.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-[#0A2540]">All peer deliverables reviewed!</p>
            <p className="text-xs text-slate-500">
              No pending student submissions waiting for verification right now.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingList.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-[#D6E4EE] bg-white hover:border-[#BFDBFE] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[14px] text-[#0A2540]">{c.title}</span>
                    <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10.5px] font-bold font-mono">
                      {c.contributionType || 'Module'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    By <strong className="text-slate-700">{c.authorName || 'Teammate'}</strong> •{' '}
                    {new Date(c.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                  {c.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{c.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setSelectedContrib(c);
                      setVerdict('CONFIRMED');
                    }}
                    className="h-8 px-3.5 rounded-lg bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Verify &amp; Accept ✓
                  </button>
                  <button
                    onClick={() => {
                      setSelectedContrib(c);
                      setVerdict('REJECTED');
                    }}
                    className="h-8 px-3 rounded-lg border border-[#FECDD3] bg-white hover:bg-[#FFF1F2] text-[#BE123C] text-xs font-semibold transition-colors"
                  >
                    Request Updates
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Confirmation Modal */}
      {selectedContrib && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A2540]/40 backdrop-blur-[2px]">
          <div className="surface-card rounded-xl max-w-md w-full overflow-hidden shadow-modal">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0A2540]">
                {verdict === 'CONFIRMED' ? 'Verify Deliverable' : 'Request Deliverable Updates'}
              </h3>
              <button onClick={() => setSelectedContrib(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleReviewSubmit} className="p-5 space-y-3">
              <div>
                <div className="text-xs font-bold text-[#0A2540]">{selectedContrib.title}</div>
                <div className="text-[11px] text-slate-500 font-mono">By {selectedContrib.authorName}</div>
              </div>

              {verdict === 'REJECTED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Feedback / Revision Notes *
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Specify necessary changes before accepting..."
                    className="w-full p-2.5 rounded-lg border border-[#D6E4EE] text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedContrib(null)}
                  className="h-8 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`h-8 px-4 rounded-lg text-white text-xs font-semibold transition-colors disabled:opacity-50 ${
                    verdict === 'CONFIRMED'
                      ? 'bg-[#15803D] hover:bg-emerald-800'
                      : 'bg-[#BE123C] hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Submitting...' : verdict === 'CONFIRMED' ? 'Confirm Acceptance' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
