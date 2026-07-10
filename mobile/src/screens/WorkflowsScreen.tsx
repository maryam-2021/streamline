import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { request } from '../api';
import { Theme, radius, spacing } from '../theme';

export default function WorkflowsScreen({ theme }: { theme: Theme }) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const load = () => request('/workflows').then(setWorkflows).catch(() => {});
  useEffect(() => { load(); }, []);

  const run = async (id: string) => {
    try { await request(`/workflows/${id}/run`, { method: 'POST' }); load(); } catch {}
  };

  const s = styles(theme);
  return (
    <View style={s.container}>
      <Text style={s.title}>Workflows</Text>
      <FlatList
        data={workflows}
        keyExtractor={(w) => w.id}
        ListEmptyComponent={<Text style={s.empty}>No workflows yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.meta}>{item.trigger} · {item.runs_count} runs · {item.status}</Text>
            </View>
            <TouchableOpacity style={s.runBtn} onPress={() => run(item.id)}>
              <Text style={s.runText}>Run</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background, padding: spacing(5) },
  title: { fontSize: 26, color: t.foreground, fontWeight: '600', marginBottom: spacing(5) },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing(4), marginBottom: spacing(2) },
  name: { color: t.foreground, fontSize: 15 },
  meta: { color: t.muted, fontSize: 12, marginTop: 2 },
  runBtn: { backgroundColor: t.accent, borderRadius: radius.xl, paddingVertical: spacing(2), paddingHorizontal: spacing(4) },
  runText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { color: t.muted, fontSize: 14 },
});
