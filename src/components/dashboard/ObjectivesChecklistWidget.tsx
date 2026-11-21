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
import { AppCard } from '../common/AppCard';

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
    <AppCard
      title="Objectives & Deliverables Checklist"
      subtitle={
        isLeader
          ? 'Check off milestones as your team delivers project objectives.'
          : 'Project goals established and tracked by your team lead.'
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Progress & Status Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '10px 14px',
            background: '#F4FAFC',
            borderRadius: 12,
            border: '1px solid #D5E8EF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#E5F3FA',
                color: '#0B4D88',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <ListTodo size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#102F48' }}>
                Milestone Progress
              </div>
              <div style={{ fontSize: 11, color: '#5E788C' }}>
                {completedCount} of {items.length} tasks completed
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSaving && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#0B4D88', fontWeight: 600 }}>
                <Loader2 size={13} className="spin" />
                Saving...
              </span>
            )}
            <span
              className="badge badge-confirmed"
              style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px' }}
            >
              {progressPct}% Done
            </span>
          </div>
        </div>

        {/* Progress Fill Bar */}
        {items.length > 0 && (
          <div
            style={{
              width: '100%',
              height: 7,
              borderRadius: 99,
              background: '#D5E8EF',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #0B4D88, #22B6C5)',
                borderRadius: 99,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              background: '#FBECEB',
              border: '1px solid rgba(179, 79, 92, 0.3)',
              color: '#B34F5C',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Items Checklist List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                borderRadius: 12,
                border: '1px dashed #D5E8EF',
                background: '#FFFFFF',
                color: '#5E788C',
                fontSize: 13,
              }}
            >
              <CheckCircle2 size={28} color="#7992A1" style={{ margin: '0 auto 8px' }} />
              <div>No checklist objectives recorded yet.</div>
              {isLeader && (
                <div style={{ fontSize: 11.5, color: '#0B4D88', marginTop: 4, fontWeight: 600 }}>
                  Add your first project milestone using the input below!
                </div>
              )}
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: item.completed ? '1px solid #E2E8F0' : '1px solid #D5E8EF',
                  background: item.completed ? '#F8FAFC' : '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(12, 64, 101, 0.04)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  onClick={() => handleToggle(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                    cursor: isLeader && !isSaving ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  title={isLeader ? 'Click to toggle completion' : 'Read-only milestone'}
                >
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    {item.completed ? (
                      <CheckSquare size={18} color="#16A34A" />
                    ) : (
                      <Square size={18} color="#7992A1" />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: item.completed ? '#7992A1' : '#102F48',
                      textDecoration: item.completed ? 'line-through' : 'none',
                      fontWeight: item.completed ? 500 : 600,
                      wordBreak: 'break-word',
                    }}
                  >
                    {item.text}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}>
                  {!isLeader && (
                    <span title="Editable by Team Lead" style={{ color: '#7992A1' }}>
                      <Lock size={14} />
                    </span>
                  )}
                  {isLeader && (
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      disabled={isSaving}
                      title="Remove objective"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: 'none',
                        background: 'transparent',
                        color: '#7992A1',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        transition: 'color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#B34F5C';
                        e.currentTarget.style.background = '#FBECEB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#7992A1';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add New Milestone Form (Team Lead Only) */}
        {isLeader && (
          <form
            onSubmit={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
            }}
          >
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              disabled={isSaving}
              placeholder="Add a new milestone or deliverable..."
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1.5px solid #D5E8EF',
                background: '#FFFFFF',
                fontSize: 13,
                color: '#102F48',
                outline: 'none',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
              }}
            />
            <button
              type="submit"
              disabled={isSaving || !newText.trim()}
              className="btn btn-primary btn-sm"
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 12,
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          </form>
        )}
      </div>
    </AppCard>
  );
};
