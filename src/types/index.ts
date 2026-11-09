export type Role = 'STUDENT' | 'TEAM_LEAD' | 'MENTOR';

export interface ProfileModel {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  usn?: string;
  branch?: string;
  section?: string;
  semester?: number;
  skills: string[];
  interests: string[];
  department?: string;
  facultyCode?: string;
}

export interface TeamModel {
  id: number;
  teamCode: string;
  teamName: string;
  projectTitle: string;
  projectGist: string;
  abstractText?: string;
  objectives?: string;
  theme: string;
  branch: string;
  leaderId: string;
  mentorId?: string | null;
  currentProgressPct: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ContributionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'SOFT_DELETED';

export interface ContributionModel {
  id: number;
  teamId: number;
  authorId: string;
  authorName?: string;
  authorUsn?: string;
  studentName?: string;
  studentUsn?: string;
  title: string;
  description: string;
  links: string[];
  proofUrl?: string;
  status: ContributionStatus;
  createdAt?: string;
  updatedAt?: string;
  files?: ContributionFile[];
}

export interface ContributionFile {
  id: number;
  contributionId: number;
  storagePath: string;
  fileName: string;
  fileType: 'VIDEO' | 'IMAGE' | 'DOCUMENT' | 'ARCHIVE';
  fileSizeBytes: number;
  createdAt?: string;
}

export interface ContributionReview {
  id: number;
  contributionId: number;
  reviewerId: string;
  verdict: 'CONFIRMED' | 'REJECTED';
  rejectionReason?: string;
  reviewedAt: string;
}

export interface ContributionVote {
  contributionId: number;
  voterId: string;
  verdict: 'CONFIRMED' | 'REJECTED';
  reason?: string;
}

export interface VoteTally {
  votes: ContributionVote[];
  required: number;
  confirms: number;
  rejects: number;
}

export type AppointmentStatus =
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'IN_MEETING'
  | 'COMPLETED';

export interface AppointmentModel {
  id: number;
  teamId: number;
  requestedBy: string;
  mentorId: string;
  requestedSlot: string;
  confirmedSlot?: string | null;
  status: AppointmentStatus;
  agenda: string;
  mentorNotes?: string | null;
  queuePosition?: number | null;
  createdAt?: string;
  updatedAt?: string;
  teamName?: string;
}

export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  usn: string;
  isPresent: boolean;
}

export interface MeetingLedgerEntry {
  id: string;
  teamId: string;
  meetingNumber: number;
  meetingDate: string;
  summaryNotes: string;
  attendance: AttendanceRecord[];
}

export type FeedbackType = 'COMMENT' | 'THUMBS_UP' | 'MEET_ME';

export interface FeedbackModel {
  id: number;
  teamId: number;
  mentorId: string;
  mentorName?: string;
  contributionId?: number | null;
  appointmentId?: number | null;
  feedbackType: FeedbackType;
  content?: string | null;
  createdAt: string;
}

export interface TeamEvaluation {
  id: number;
  teamId: number;
  evaluatorId: string;
  evaluatorName?: string;
  phaseName: string;
  totalMarks: number;
  maxMarks: number;
  memberMarks: Record<string, number>;
  remarks?: string | null;
  createdAt: string;
}

export interface TeamDeparture {
  id: number;
  teamId: number;
  userId: string;
  fullName: string;
  usn?: string;
  contributionsRemoved: number;
  joinedAt?: string;
  leftAt: string;
}

export interface TeamInvitationModel {
  id: number;
  teamId: number;
  teamName?: string;
  projectTitle?: string;
  leaderName?: string;
  leaderBranch?: string;
  studentId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
}

export interface JoinRequestModel {
  id: number;
  teamId: number;
  studentId: string;
  studentName?: string;
  studentUsn?: string;
  studentBranch?: string;
  skills?: string[];
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  isAlreadyTeammate?: boolean;
  createdAt: string;
}

export interface LeadTransferRequestModel {
  id: number;
  teamId: number;
  teamName?: string;
  fromUserId: string;
  fromUserName?: string;
  toUserId: string;
  toUserName?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

export interface MentorRequestModel {
  id: number;
  teamId: number;
  mentorId: string;
  mentorName?: string;
  teamName?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  message?: string;
  createdAt: string;
}

export interface TeamDirectoryEntry {
  team: TeamModel;
  leaderName?: string;
  leaderUsn?: string;
  leaderEmail?: string;
}

export interface ProgressHistoryEntry {
  id: number;
  teamId: number;
  updatedBy: string;
  progressPct: number;
  milestoneNote: string;
  recordedAt: string;
}
