import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle2,
  ListTodo,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { TeamModel } from '../../types';
import { TeamService } from '../../services/team.service';

export interface ObjectiveChecklistItem {
  text: string;
  completed: boolean;
}

export function parseObjectives(raw?: string): ObjectiveChecklistItem[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ObjectiveChecklistItem[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith('- [x] ') || lower.startsWith('[x] ')) {
      const text = line.replace(/^(- )?\[[xX]\]\s*/, '').trim();
      if (text) items.push({ text, completed: true });
    } else if (lower.startsWith('- [ ] ') || lower.startsWith('[ ] ')) {
      const text = line.replace(/^(- )?\[\s*\]\s*/, '').trim();
      if (text) items.push({ text, completed: false });
    } else {
      const cleaned = line.replace(/^[-•*]\s+/, '').trim();
      if (cleaned) items.push({ text: cleaned, completed: false });
    }
  }
  return items;
}

export function serializeObjectives(items: ObjectiveChecklistItem[]): string {
  return items.map((i) => `${i.completed ? '[x]' : '[ ]'} ${i.text.trim()}`).join('\n');
}

interface Props {
  team: TeamModel;
  isLeader?: boolean;
  onUpdated?: () => void;
  compact?: boolean;
}

export const ObjectivesChecklistWidget: React.FC<Props> = ({
  team,
  isLeader = false,
  onUpdated,
  compact = false,
}) => {
  const [items, setItems] = useState<ObjectiveChecklistItem[]>(() =>
    parseObjectives(team.objectives)
  );
  const [newText, setNewText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSaving) {
      setItems(parseObjectives(team.objectives));
    }
  }, [team.objectives, isSaving]);

  const completedCount = items.filter((i) => i.completed).length;
  const progressPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handlePersist = async (newItems: ObjectiveChecklistItem[]) => {
    const prev = [...items];
    setItems(newItems);
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const serialized = serializeObjectives(newItems);
      await TeamService.updateProjectInfo({
        teamId: team.id,
        projectTitle: team.projectTitle,
        projectGist: team.projectGist,
        theme: team.theme,
        branch: team.branch,
        abstractText: team.abstractText,
        objectives: serialized,
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setItems(prev);
      setErrorMsg(err.message || 'Failed to save objectives update.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (index: number) => {
    if (!isLeader || isSaving) return;
    const next = [...items];
    next[index] = { ...next[index], completed: !next[index].completed };
    handlePersist(next);
  };

  const handleDelete = (index: number) => {
    if (!isLeader || isSaving) return;
    const next = items.filter((_, i) => i !== index);
    handlePersist(next);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLeader || isSaving || !newText.trim()) return;
    const next = [...items, { text: newText.trim(), completed: false }];
    setNewText('');
    handlePersist(next);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Objectives Checklist
              {items.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {completedCount}/{items.length} Done ({progressPct}%)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {isLeader
                ? 'Check off milestones as your team achieves project deliverables'
                : 'Project goals established and tracked by your team lead'}
            </p>
          </div>
        </div>

        {isSaving && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-xl bg-slate-800/20">
            <CheckCircle2 className="w-7 h-7 text-slate-500 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">
              No objectives recorded yet.{' '}
              {isLeader ? 'Add your first project goal below!' : 'Team lead has not added milestones.'}
            </p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              className={`group flex items-start justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                item.completed
                  ? 'bg-slate-900/40 border-white/5 opacity-80'
                  : 'bg-slate-800/40 border-white/10 hover:border-white/20'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(idx)}
                disabled={!isLeader || isSaving}
                className={`flex items-start gap-2.5 text-left flex-1 min-w-0 ${
                  isLeader ? 'cursor-pointer' : 'cursor-default'
                }`}
                title={isLeader ? 'Click to toggle' : 'Only team lead can toggle milestones'}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {item.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  )}
                </span>
                <span
                  className={`text-xs ${
                    item.completed
                      ? 'line-through text-slate-400'
                      : 'text-slate-200 font-medium'
                  }`}
                >
                  {item.text}
                </span>
              </button>

              <div className="flex items-center gap-1">
                {!isLeader && (
                  <span title="Only team lead can modify" className="text-slate-600">
                    <Lock className="w-3 h-3" />
                  </span>
                )}
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    disabled={isSaving}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Item Input (Leader Only) */}
      {isLeader && (
        <form onSubmit={handleAdd} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            disabled={isSaving}
            placeholder="Add a new milestone or objective..."
            className="flex-1 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isSaving || !newText.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>
      )}
    </div>
  );
};
