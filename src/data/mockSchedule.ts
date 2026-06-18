import { Artist, FestivalDay, GroupSummary, Member, Performance, Stage } from '../types/schedule';

export const festival = {
  id: 'tml-2026',
  name: 'Tomorrowland 2026',
  location: 'Boom, Belgium',
  timezone: 'Europe/Brussels',
  startDate: '2026-07-17',
  endDate: '2026-07-26',
};

export const days: FestivalDay[] = [
  { id: 'fri-1', label: 'Fri 17', date: '2026-07-17', sortOrder: 1 },
  { id: 'sat-1', label: 'Sat 18', date: '2026-07-18', sortOrder: 2 },
  { id: 'sun-1', label: 'Sun 19', date: '2026-07-19', sortOrder: 3 },
];

export const stages: Stage[] = [
  { id: 'main', name: 'Mainstage', sortOrder: 1 },
  { id: 'atmosphere', name: 'Atmosphere', sortOrder: 2 },
  { id: 'freedom', name: 'Freedom', sortOrder: 3 },
  { id: 'core', name: 'CORE', sortOrder: 4 },
];

export const artists: Artist[] = [
  { id: 'amelie', name: 'Amelie Lens', genres: ['Techno'], popularityScore: 96 },
  { id: 'charlotte', name: 'Charlotte de Witte', genres: ['Techno'], popularityScore: 98 },
  { id: 'armin', name: 'Armin van Buuren', genres: ['Trance'], popularityScore: 95 },
  { id: 'martin', name: 'Martin Garrix', genres: ['Progressive'], popularityScore: 99 },
  { id: 'lost', name: 'Lost Frequencies', genres: ['House'], popularityScore: 92 },
  { id: 'solomun', name: 'Solomun', genres: ['House'], popularityScore: 90 },
  { id: 'tale', name: 'Tale Of Us', genres: ['Melodic Techno'], popularityScore: 94 },
  { id: 'nina', name: 'Nina Kraviz', genres: ['Techno'], popularityScore: 88 },
];

const slot = (id: string, dayId: string, artistId: string, stageId: string, start: string, end: string, isCancelled = false): Performance => ({
  id,
  dayId,
  artistId,
  stageId,
  startsAt: `${days.find((d) => d.id === dayId)?.date}T${start}:00+02:00`,
  endsAt: `${days.find((d) => d.id === dayId)?.date}T${end}:00+02:00`,
  updatedAt: '2026-06-18T10:00:00Z',
  isCancelled,
});

export const performances: Performance[] = days.flatMap((day) => [
  slot(`${day.id}-lost`, day.id, 'lost', 'main', '14:00', '15:15'),
  slot(`${day.id}-nina`, day.id, 'nina', 'core', '14:30', '16:00'),
  slot(`${day.id}-armin`, day.id, 'armin', 'freedom', '16:15', '17:30'),
  slot(`${day.id}-solomun`, day.id, 'solomun', 'core', '17:00', '18:30'),
  slot(`${day.id}-amelie`, day.id, 'amelie', 'atmosphere', '19:00', '20:30'),
  slot(`${day.id}-tale`, day.id, 'tale', 'freedom', '20:00', '21:30'),
  slot(`${day.id}-charlotte`, day.id, 'charlotte', 'atmosphere', '22:00', '23:30'),
  slot(`${day.id}-martin`, day.id, 'martin', 'main', '23:15', '00:45'),
]);

export const members: Member[] = [
  { id: 'anna', name: 'Anna', avatar: 'A' },
  { id: 'ben', name: 'Ben', avatar: 'B' },
  { id: 'sam', name: 'Sam', avatar: 'S' },
  { id: 'mia', name: 'Mia', avatar: 'M' },
];

export const groupSummaries: GroupSummary[] = performances.map((performance, index) => ({
  performanceId: performance.id,
  interestedMemberIds: members.slice(0, index % 5).map((member) => member.id),
  staleMinutes: index % 3 === 0 ? 12 : undefined,
}));
