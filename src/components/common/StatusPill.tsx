import React from 'react';

interface StatusPillProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'sm' }) => {
  const norm = (status || '').toUpperCase().trim();

  let bg = '#EFF6FF';
  let text = '#1D63ED';
  let border = '#BFDBFE';

  if (['CONFIRMED', 'ACCEPTED', 'VERIFIED', 'COMPLETED', 'ON TRACK', 'PRESENT'].includes(norm)) {
    bg = '#DCFCE7';
    text = '#15803D';
    border = '#BBF7D0';
  } else if (['PENDING', 'REQUESTED', 'REVIEW', 'IN PROGRESS', 'UPCOMING', 'WARNING'].includes(norm)) {
    bg = '#FEF3C7';
    text = '#B45309';
    border = '#FDE68A';
  } else if (['REJECTED', 'CANCELLED', 'DANGER', 'NEEDS UPDATES', 'ABSENT', 'SUMMONS', 'RED FLAG'].includes(norm)) {
    bg = '#FFF1F2';
    text = '#BE123C';
    border = '#FECDD3';
  } else if (['LEAD', 'TEAM_LEAD', 'TEAM LEAD'].includes(norm)) {
    bg = '#FEF3C7';
    text = '#B45309';
    border = '#FDE68A';
  } else if (['MENTOR', 'FACULTY'].includes(norm)) {
    bg = '#EFF6FF';
    text = '#1D63ED';
    border = '#BFDBFE';
  } else if (['STUDENT', 'MEMBER'].includes(norm)) {
    bg = '#DCFCE7';
    text = '#15803D';
    border = '#BBF7D0';
  }

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide uppercase font-mono rounded-md border ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        backgroundColor: bg,
        color: text,
        borderColor: border,
      }}
    >
      {norm}
    </span>
  );
};
