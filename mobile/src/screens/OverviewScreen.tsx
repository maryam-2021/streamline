import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { request } from '../api';
import { Theme, radius, spacing } from '../theme';

export default function OverviewScreen({ theme, user }: { theme: Theme; user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => request('/dashboard/stats').then(setStats).catch(() => {});
  useEffect(() => { load(); }, []);

  const s = styles(theme);
  const cards = [
    ['Clients', stats?.clients],
    ['Workflows', stats ? `${stats.active_workflows}/${stats.workflows}` : null],
    ['Runs', stats?.runs],
  ];

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
    >
      <Text style={s.title}>Welcome, {user?.name?.split(' ')[0]}</Text>
      <View style={s.row}>
        {cards.map(([label, value]) => (
          <View key={label as string} style={s.card}>
            <Text style={s.value}>{value ?? '—'}</Text>
            <Text style={s.label}>{label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.section}>Recent activity</Text>
      {(stats?.recent_runs || []).map((run: any) => (
        <View key={run.id} style={s.runRow}>
          <Text style={[s.runStatus, { color: run.status === 'success' ? theme.primary : '#ef4444' }]}>●</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.runName}>{run.workflow_name}</Text>
            <Text style={s.runMeta}>{run.triggered_by} · {run.duration_ms}ms</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background, padding: spacing(5) },
  title: { fontSize: 26, color: t.foreground, fontWeight: '600', marginBottom: spacing(5) },
  row: { flexDirection: 'row', gap: spacing(3), marginBottom: spacing(6) },
  card: { flex: 1, backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing(4) },
  value: { fontSize: 22, color: t.primary, fontWeight: '700' },
  label: { fontSize: 12, color: t.muted, marginTop: 4 },
  section: { fontSize: 18, color: t.foreground, fontWeight: '600', marginBottom: spacing(3) },
  runRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(3), backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing(3), marginBottom: spacing(2) },
  runStatus: { fontSize: 14 },
  runName: { color: t.foreground, fontSize: 14 },
  runMeta: { color: t.muted, fontSize: 12 },
});
