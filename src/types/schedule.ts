export type TabKey = 'Now' | 'Schedule' | 'My Plan' | 'Group' | 'Profile';

export type FestivalDay = { id: string; label: string; date: string; sortOrder: number };
export type Stage = { id: string; name: string; sortOrder: number };
export type Artist = { id: string; name: string; genres: string[]; imageUrl?: string; popularityScore?: number };
export type Performance = {
  id: string;
  dayId: string;
  artistId: string;
  stageId: string;
  startsAt: string;
  endsAt: string;
  isCancelled?: boolean;
  updatedAt: string;
};
export type Member = { id: string; name: string; avatar: string };
export type GroupSummary = { performanceId: string; interestedMemberIds: string[]; staleMinutes?: number };
