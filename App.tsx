import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlashList } from '@shopify/flash-list';
import { StatusBar } from 'expo-status-bar';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { artists, days, festival, groupSummaries, members, performances, stages } from './src/data/mockSchedule';
import { Performance, TabKey } from './src/types/schedule';

const tabs: TabKey[] = ['Now', 'Schedule', 'My Plan', 'Group', 'Profile'];
const STORAGE_KEY = 'tomorrowland.scheduler.mvp.state';

type AppState = {
  isSignedIn: boolean;
  tab: TabKey;
  selectedDayId: string;
  savedIds: string[];
  pendingIds: string[];
  query: string;
  stageIds: string[];
  isOffline: boolean;
};

const initialState: AppState = {
  isSignedIn: false,
  tab: 'Schedule',
  selectedDayId: days[0].id,
  savedIds: [],
  pendingIds: [],
  query: '',
  stageIds: [],
  isOffline: false,
};

const artistById = new Map(artists.map((artist) => [artist.id, artist]));
const stageById = new Map(stages.map((stage) => [stage.id, stage]));
const groupByPerformanceId = new Map(groupSummaries.map((summary) => [summary.performanceId, summary]));

function time(value: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: festival.timezone }).format(new Date(value));
}

function statusFor(performance: Performance) {
  if (performance.isCancelled) return 'Cancelled';
  const now = new Date('2026-07-17T19:45:00+02:00');
  const starts = new Date(performance.startsAt);
  const ends = new Date(performance.endsAt);
  if (starts <= now && now <= ends) return 'Live now';
  if (starts > now) return 'Upcoming';
  return 'Ended';
}

function overlaps(a: Performance, b: Performance) {
  const overlapMs = Math.min(+new Date(a.endsAt), +new Date(b.endsAt)) - Math.max(+new Date(a.startsAt), +new Date(b.startsAt));
  return overlapMs > 5 * 60 * 1000;
}

const PerformanceCard = memo(function PerformanceCard({ performance, saved, pending, conflict, onToggle }: {
  performance: Performance;
  saved: boolean;
  pending: boolean;
  conflict?: string;
  onToggle: (id: string) => void;
}) {
  const artist = artistById.get(performance.artistId)!;
  const stage = stageById.get(performance.stageId)!;
  const group = groupByPerformanceId.get(performance.id);
  const interested = group?.interestedMemberIds.map((id) => members.find((member) => member.id === id)!).filter(Boolean) ?? [];
  const names = interested.map((member) => member.name);
  const avatarLabel = names.length === 0 ? 'No one in your group has picked this yet.' : `${names.slice(0, 2).join(', ')}${names.length > 2 ? `, and ${names.length - 2} others` : ''} want to go.`;

  return (
    <Pressable accessibilityRole="button" style={styles.card} onPress={() => Alert.alert(artist.name, `${stage.name} · ${time(performance.startsAt)}–${time(performance.endsAt)}\n${avatarLabel}`)}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.artist}>{artist.name}</Text>
          <Text style={styles.meta}>{stage.name} · {time(performance.startsAt)}–{time(performance.endsAt)} · {statusFor(performance)}</Text>
          <Text style={styles.genre}>{artist.genres.join(', ')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mark this set as one I want to go to." onPress={() => onToggle(performance.id)} style={[styles.wantButton, saved && styles.wantButtonSaved]}>
          <Text style={styles.wantText}>{saved ? 'Going' : 'I want to go'}</Text>
        </Pressable>
      </View>
      <View style={styles.signalRow} accessibilityLabel={avatarLabel}>
        {interested.slice(0, 3).map((member) => <Text key={member.id} style={styles.avatar}>{member.avatar}</Text>)}
        <Text style={styles.signalText}>{interested.length ? `${interested.length} interested` : 'No group picks yet'}</Text>
        {group?.staleMinutes ? <Text style={styles.pending}>Last updated {group.staleMinutes} min ago</Text> : null}
        {pending ? <Text style={styles.pending}>Pending sync</Text> : null}
        {conflict ? <Text style={styles.conflict}>⚠ {conflict}</Text> : null}
      </View>
    </Pressable>
  );
});

export default function App() {
  const [state, setState] = useState(initialState);
  const [oauthBusy, setOauthBusy] = useState(false);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((raw) => raw && setState(JSON.parse(raw))).catch(() => undefined); }, []);
  useEffect(() => { AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined); }, [state]);

  const dayPerformances = useMemo(() => performances.filter((p) => p.dayId === state.selectedDayId), [state.selectedDayId]);
  const savedPerformances = useMemo(() => performances.filter((p) => state.savedIds.includes(p.id)), [state.savedIds]);
  const conflicts = useMemo(() => new Map(savedPerformances.flatMap((a) => savedPerformances.filter((b) => a.id !== b.id && overlaps(a, b)).map((b) => [a.id, `Conflicts with ${artistById.get(b.artistId)?.name}, ${time(b.startsAt)}–${time(b.endsAt)} at ${stageById.get(b.stageId)?.name}.`]))), [savedPerformances]);

  const toggleSaved = (id: string) => setState((current) => ({
    ...current,
    savedIds: current.savedIds.includes(id) ? current.savedIds.filter((savedId) => savedId !== id) : [...current.savedIds, id],
    pendingIds: current.isOffline ? Array.from(new Set([...current.pendingIds, id])) : current.pendingIds.filter((pendingId) => pendingId !== id),
  }));

  const visible = dayPerformances.filter((performance) => {
    const artist = artistById.get(performance.artistId)!;
    const stage = stageById.get(performance.stageId)!;
    const search = `${artist.name} ${stage.name} ${artist.genres.join(' ')}`.toLowerCase().includes(state.query.toLowerCase());
    const stageMatch = state.stageIds.length === 0 || state.stageIds.includes(stage.id);
    return search && stageMatch;
  });

  if (!state.isSignedIn) {
    return <SafeAreaView style={styles.shell}><StatusBar style="light" /><View style={styles.welcome}><Text style={styles.logo}>Tomorrowland Scheduler</Text><Text style={styles.subtitle}>Plan your festival days with friends.</Text><Text style={styles.body}>Sign in to save your schedule and coordinate with your group.</Text><Pressable disabled={oauthBusy} style={styles.primary} onPress={() => { setOauthBusy(true); setTimeout(() => setState((s) => ({ ...s, isSignedIn: true, tab: 'Now' })), 500); }}><Text style={styles.primaryText}>{oauthBusy ? 'Signing you in…' : 'Continue with Google'}</Text></Pressable><Pressable onPress={() => setState((s) => ({ ...s, isOffline: true }))}><Text style={styles.warning}>Internet is required the first time you sign in.</Text></Pressable></View></SafeAreaView>;
  }

  const renderCard = ({ item }: { item: Performance }) => <PerformanceCard performance={item} saved={state.savedIds.includes(item.id)} pending={state.pendingIds.includes(item.id)} conflict={conflicts.get(item.id)} onToggle={toggleSaved} />;

  return <SafeAreaView style={styles.shell}><StatusBar style="light" /><View style={styles.header}><Text style={styles.logoSmall}>Tomorrowland</Text><Text style={styles.chip}>{state.isOffline ? 'Offline — showing saved schedule' : `Synced · ${festival.timezone}`}</Text></View>{state.tab !== 'Profile' ? <View style={styles.dayRow}>{days.map((day) => <Pressable key={day.id} onPress={() => setState((s) => ({ ...s, selectedDayId: day.id }))} style={[styles.dayPill, day.id === state.selectedDayId && styles.activePill]}><Text style={styles.pillText}>{day.label}</Text></Pressable>)}</View> : null}<Content tab={state.tab} visible={visible} renderCard={renderCard} state={state} setState={setState} savedPerformances={savedPerformances} conflicts={conflicts} /><View style={styles.tabs}>{tabs.map((tab) => <Pressable key={tab} onPress={() => setState((s) => ({ ...s, tab }))} style={styles.tab}><Text style={[styles.tabText, tab === state.tab && styles.activeTab]}>{tab}</Text></Pressable>)}</View></SafeAreaView>;
}

function Content({ tab, visible, renderCard, state, setState, savedPerformances, conflicts }: any) {
  if (tab === 'Now') return <ScrollView style={styles.content}><Text style={styles.section}>Playing now</Text>{visible.filter((p: Performance) => statusFor(p) === 'Live now').map((p: Performance) => <View key={p.id}>{renderCard({ item: p })}</View>)}<Text style={styles.section}>Starting soon</Text>{visible.slice(0, 3).map((p: Performance) => <View key={`soon-${p.id}`}>{renderCard({ item: p })}</View>)}<Text style={styles.section}>Popular with your group today</Text>{[...visible].sort((a,b)=>(groupByPerformanceId.get(b.id)?.interestedMemberIds.length ?? 0)-(groupByPerformanceId.get(a.id)?.interestedMemberIds.length ?? 0)).slice(0,3).map((p: Performance) => <View key={`top-${p.id}`}>{renderCard({ item: p })}</View>)}</ScrollView>;
  if (tab === 'Schedule') return <View style={styles.content}><TextInput placeholder="Search artists, stages, genres" placeholderTextColor="#9aa" value={state.query} onChangeText={(query) => setState((s: AppState) => ({ ...s, query }))} style={styles.search} /><ScrollView horizontal showsHorizontalScrollIndicator={false}>{stages.map((stage) => <Pressable key={stage.id} style={[styles.filter, state.stageIds.includes(stage.id) && styles.activePill]} onPress={() => setState((s: AppState) => ({ ...s, stageIds: s.stageIds.includes(stage.id) ? s.stageIds.filter((id) => id !== stage.id) : [...s.stageIds, stage.id] }))}><Text style={styles.pillText}>{stage.name}</Text></Pressable>)}</ScrollView>{visible.length ? <FlashList data={visible} renderItem={renderCard} estimatedItemSize={156} /> : <Text style={styles.empty}>{state.query ? 'No artists found for this day.' : 'No sets match these filters.'}</Text>}</View>;
  if (tab === 'My Plan') return <ScrollView style={styles.content}><Text style={styles.section}>{savedPerformances.length} saved sets · {conflicts.size} conflicts · {state.pendingIds.length} pending</Text>{savedPerformances.length ? savedPerformances.map((p: Performance) => <View key={p.id}>{renderCard({ item: p })}</View>) : <Text style={styles.empty}>You have not picked any sets for this day yet. Browse schedule</Text>}</ScrollView>;
  if (tab === 'Group') return <ScrollView style={styles.content}><Text style={styles.section}>Rave Crew · 5 members</Text><Text style={styles.body}>Invite code: TML-2026 · Only the active group drives counts, avatars, rankings, and top picks.</Text><Text style={styles.section}>Top group picks</Text>{visible.slice(0, 5).map((p: Performance) => <View key={p.id}>{renderCard({ item: p })}</View>)}</ScrollView>;
  return <ScrollView style={styles.content}><Text style={styles.section}>Google account</Text><Text style={styles.body}>Alex Festivalgoer · alex@example.com</Text><Text style={styles.body}>Active festival: {festival.name}</Text><Text style={styles.body}>Pending mutation count: {state.pendingIds.length}</Text><Text style={styles.body}>Cache status: cached schedule and picks available</Text><Pressable style={styles.danger} onPress={() => Alert.alert('Log out?', 'You have unsynced picks. Logging out will discard them from this device.', [{ text: 'Cancel' }, { text: 'Logout', onPress: () => setState(initialState) }])}><Text style={styles.primaryText}>Logout</Text></Pressable></ScrollView>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#081018' }, welcome: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 }, logo: { color: 'white', fontSize: 34, fontWeight: '900' }, logoSmall: { color: 'white', fontSize: 24, fontWeight: '900' }, subtitle: { color: '#d8f3ff', fontSize: 22, fontWeight: '700' }, body: { color: '#c8d3dc', fontSize: 16, lineHeight: 23 }, primary: { minHeight: 52, borderRadius: 18, backgroundColor: '#18d2ff', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#041018', fontWeight: '900', fontSize: 16 }, warning: { color: '#ffd166', marginTop: 8 }, header: { padding: 16, gap: 8 }, chip: { alignSelf: 'flex-start', color: '#061018', backgroundColor: '#b8f7d4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, fontWeight: '800' }, dayRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 }, dayPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#172432', minHeight: 44 }, activePill: { backgroundColor: '#7c4dff' }, pillText: { color: 'white', fontWeight: '800' }, content: { flex: 1, padding: 12 }, section: { color: 'white', fontSize: 20, fontWeight: '900', marginVertical: 12 }, search: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, color: 'white', backgroundColor: '#172432', marginBottom: 10 }, filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#172432', marginRight: 8 }, card: { backgroundColor: '#101c28', borderRadius: 22, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#24384a' }, cardTop: { flexDirection: 'row', gap: 12 }, artist: { color: 'white', fontSize: 19, fontWeight: '900' }, meta: { color: '#d8f3ff', marginTop: 5, fontWeight: '700' }, genre: { color: '#9eb0bd', marginTop: 4 }, wantButton: { minWidth: 104, minHeight: 48, borderRadius: 16, backgroundColor: '#24384a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, wantButtonSaved: { backgroundColor: '#18d2ff' }, wantText: { color: 'white', fontWeight: '900' }, signalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 12 }, avatar: { color: '#061018', backgroundColor: '#ffd166', width: 28, height: 28, borderRadius: 14, textAlign: 'center', paddingTop: 5, fontWeight: '900' }, signalText: { color: '#c8d3dc', fontWeight: '800' }, pending: { color: '#ffd166', fontWeight: '800' }, conflict: { color: '#ff8fa3', fontWeight: '800' }, empty: { color: '#c8d3dc', textAlign: 'center', padding: 24, fontSize: 16 }, tabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#24384a', backgroundColor: '#0b1420' }, tab: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center' }, tabText: { color: '#9eb0bd', fontSize: 12, fontWeight: '800' }, activeTab: { color: '#18d2ff' }, danger: { minHeight: 52, borderRadius: 18, backgroundColor: '#ff8fa3', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
});
