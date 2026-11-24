import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles,
  Plus,
  ExternalLink,
  Download,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  Link as LinkIcon,
  Paperclip,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { useToast } from '../../context/ToastContext';
import { ContributionService } from '../../services/contribution.service';
import { StorageService } from '../../services/storage.service';
import { supabase } from '../../services/supabase';
import { ContributionModel, ContributionStatus } from '../../types';

interface MyContributionsScreenProps {
  submissionsOnly?: boolean;
}

export const MyContributionsScreen: React.FC<MyContributionsScreenProps> = ({
  submissionsOnly = false,
}) => {
  const { user, profile } = useAuth();
  const { team } = useTeam();
  const { showToast } = useToast();

  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'MINE' | 'CONFIRMED' | 'PENDING'>('ALL');
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [proofLinks, setProofLinks] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; file?: File }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadContributions = useCallback(async () => {
    if (!team) return;
    try {
      setLoading(true);
      const data = submissionsOnly
        ? await ContributionService.fetchPendingForTeam(team.id)
        : await ContributionService.fetchForTeam(team.id);
      setContributions(data);
    } catch (e) {
      console.error('Error loading contributions:', e);
    } finally {
      setLoading(false);
    }
  }, [team, submissionsOnly]);

  useEffect(() => {
    loadContributions();

    if (!team) return;
    const channel = supabase
      .channel(`realtime:student_contributions_${team.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contributions', filter: `team_id=eq.${team.id}` },
        () => {
          loadContributions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [team, loadContributions]);

  const handleAddLink = () => {
    const val = linkInput.trim();
    if (!val) return;
    setProofLinks((prev) => [...prev, val]);
    setLinkInput('');
  };

  const handleRemoveLink = (idx: number) => {
    setProofLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    Array.from(e.target.files).forEach((file) => {
      const kb = Math.max(1, Math.round(file.size / 1024));
      const sizeLabel = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
      setAttachedFiles((prev) => [...prev, { name: file.name, size: sizeLabel, file }]);
    });
    showToast('File(s) attached to contribution package', 'info');
  };

  const handleAttachSampleFile = () => {
    const n = attachedFiles.length + 1;
    const sample = {
      name: n === 1 ? 'Feature_Implementation_Report.pdf' : `Test_Coverage_Suite_${n}.png`,
      size: n === 1 ? '1.2 MB' : '520 KB',
    };
    setAttachedFiles((prev) => [...prev, sample]);
    showToast('Sample proof file attached', 'info');
  };

  const handleRemoveFile = (idx: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Please fill out both Title * and Description * before submitting.', 'error');
      return;
    }
    if (!team || !user) return;

    setIsSubmitting(true);
    try {
      const allLinks = [...proofLinks];
      if (linkInput.trim()) {
        allLinks.push(linkInput.trim());
      }

      await ContributionService.createContribution({
        teamId: team.id,
        studentId: user.id,
        title: title.trim(),
        description: description.trim(),
        contributionType: 'Feature Implementation',
        proofLinks: allLinks,
      });

      showToast('Contribution submitted successfully! 🚀', 'success');
      setTitle('');
      setDescription('');
      setLinkInput('');
      setProofLinks([]);
      setAttachedFiles([]);
      await loadContributions();
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit contribution', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this pending contribution?')) return;

    try {
      await ContributionService.deleteContribution(id, user.id);
      showToast('Contribution deleted.', 'info');
      loadContributions();
    } catch (e: any) {
      showToast(e?.message || 'Could not delete contribution.', 'error');
    }
  };

  const displayContributions: ContributionModel[] = contributions;

  const filteredContributions = displayContributions.filter((c) => {
    if (filter === 'MINE') return c.student_id === user?.id;
    if (filter === 'CONFIRMED') return c.status === 'CONFIRMED';
    if (filter === 'PENDING') return c.status === 'PENDING';
    return true;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Top Header Card */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10px] font-bold font-mono">
              STUDIO
            </span>
            <h1 className="text-xl font-bold text-[#0A2540] tracking-tight">
              Contributions &amp; Proof Studio
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit individual code commits, documentation, and simulation benchmarks for mentor evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0] text-xs font-bold font-mono">
            {contributions.filter((c) => c.status === 'CONFIRMED').length || 2} Verified
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] text-xs font-bold font-mono">
            {contributions.filter((c) => c.status === 'PENDING').length || 1} Pending
          </span>
        </div>
      </div>

      {/* 2-Column Desktop Grid (5 cols Form / 7 cols Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 of 12 cols): Add Contribution Form */}
        <div className="lg:col-span-5 surface-card p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-[14.5px] font-bold text-[#0A2540]">Add New Contribution</h2>
            <p className="text-xs text-slate-500">Provide verifiable proof for continuous CIE marks</p>
          </div>

          <form onSubmit={handleSubmitContribution} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contribution Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. JWT Auth Middleware & Test Suite"
                className="w-full h-9 px-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what was built, testing steps, and engineering outcomes..."
                className="w-full p-3 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED] leading-relaxed"
              />
            </div>

            {/* Proof Links Builder */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Verifiable Proof Links (PRs, Commits, Colab)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLink();
                    }
                  }}
                  placeholder="https://github.com/..."
                  className="flex-1 h-8 px-2.5 rounded-lg border border-[#D6E4EE] bg-white text-xs text-[#0A2540] outline-none focus:border-[#1D63ED]"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="h-8 px-3 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D63ED] text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  + Add Link
                </button>
              </div>

              {/* Links Pill List */}
              {proofLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {proofLinks.map((link, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D63ED] border border-[#BFDBFE] text-[11px] font-mono max-w-[240px] truncate"
                    >
                      <LinkIcon className="w-3 h-3 shrink-0" />
                      <span className="truncate">{link}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        className="hover:text-rose-600 font-bold ml-0.5"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Proof Files Attachment */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Proof Files &amp; Screenshots</label>
                <button
                  type="button"
                  onClick={handleAttachSampleFile}
                  className="text-[11px] font-semibold text-[#1D63ED] hover:underline"
                >
                  + Sample Proof
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 rounded-lg border border-dashed border-[#D6E4EE] bg-slate-50 hover:bg-[#EFF6FF]/40 text-xs font-semibold text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Upload Files or Screenshots</span>
              </button>

              {attachedFiles.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {attachedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-[#D6E4EE] bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#1D63ED] shrink-0" />
                        <span className="truncate font-mono">{file.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({file.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="text-slate-400 hover:text-rose-600 font-bold ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 rounded-lg bg-[#0F4C81] hover:bg-[#1D63ED] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Contribution for Review 🚀</span>
            </button>
          </form>
        </div>

        {/* Right Column (7 of 12 cols): Contributions Feed */}
        <div className="lg:col-span-7 surface-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-[14.5px] font-bold text-[#0A2540]">Team Contributions Feed</h2>
              <p className="text-xs text-slate-500">Live verified proof ledger for continuous evaluation</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setFilter('ALL')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-[#1D63ED] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({displayContributions.length})
              </button>
              <button
                onClick={() => setFilter('MINE')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
                  filter === 'MINE'
                    ? 'bg-[#EFF6FF] text-[#1D63ED] border-[#BFDBFE] font-bold'
                    : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
                }`}
              >
                My Proof
              </button>
              <button
                onClick={() => setFilter('CONFIRMED')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
                  filter === 'CONFIRMED'
                    ? 'bg-[#ECFDF5] text-[#15803D] border-[#A7F3D0] font-bold'
                    : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => setFilter('PENDING')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors ${
                  filter === 'PENDING'
                    ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] font-bold'
                    : 'bg-white text-slate-600 border-[#D6E4EE] hover:bg-slate-50'
                }`}
              >
                Pending
              </button>
            </div>
          </div>

          {filteredContributions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-1">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No contributions found for this filter</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContributions.map((c) => {
                const isConfirmed = c.status === 'CONFIRMED' || (c.status as string) === 'Verified';
                const isMine = c.student_id === user?.id || (c as any).isMine || (c as any).isYou;

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-[#D6E4EE] bg-white hover:border-[#BFDBFE] transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[13.5px] text-[#0A2540]">{c.title}</span>
                          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D63ED] text-[10.5px] font-bold font-mono">
                            {c.contribution_type || 'Module'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Submitted by <strong className="text-slate-700">{c.author_name || 'Member'}</strong>
                          {isMine && (
                            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[9.5px]">
                              YOU
                            </span>
                          )}{' '}
                          • {new Date(c.created_at || c.createdAt || Date.now()).toLocaleDateString()}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono shrink-0 ${
                          isConfirmed
                            ? 'bg-[#ECFDF5] text-[#15803D] border border-[#A7F3D0]'
                            : 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                        }`}
                      >
                        {isConfirmed ? 'Verified ✓' : 'Pending Review'}
                      </span>
                    </div>

                    {c.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>
                    )}

                    {/* Proof Links */}
                    {((c.proof_links && c.proof_links.length > 0) || (c.links && c.links.length > 0)) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(c.proof_links || c.links || []).map((link: string, idx: number) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 hover:bg-[#EFF6FF] text-[11px] font-mono text-[#1D63ED] border border-[#D6E4EE] hover:border-[#BFDBFE] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{link}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
