import React from 'react';
import { UserMinus } from 'lucide-react';
import { TeamDeparture } from '../../types';

interface DepartedMembersSectionProps {
  departures: TeamDeparture[];
}

export const DepartedMembersSection: React.FC<DepartedMembersSectionProps> = ({ departures }) => {
  if (!departures || departures.length === 0) return null;

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      <div className="flex items-center gap-2">
        <UserMinus className="w-4 h-4 text-slate-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Departed Members &amp; Audit Log ({departures.length})
        </h4>
      </div>

      <div className="space-y-2">
        {departures.map((d) => (
          <div
            key={d.id}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
          >
            <div>
              <div className="font-semibold text-slate-700">{d.fullName}</div>
              <div className="text-[11px] text-slate-500 font-mono">
                {d.usn ? `${d.usn} • ` : ''}Departed on {new Date(d.leftAt).toLocaleDateString()}
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold font-mono">
              FORMER MEMBER
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
