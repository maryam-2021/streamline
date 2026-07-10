import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { request } from '../api';
import { Theme, radius, spacing } from '../theme';

export default function ClientsScreen({ theme }: { theme: Theme }) {
  const [clients, setClients] = useState<any[]>([]);
  useEffect(() => { request('/clients').then(setClients).catch(() => {}); }, []);

  const s = styles(theme);
  return (
    <View style={s.container}>
      <Text style={s.title}>Clients</Text>
      <FlatList
        data={clients}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<Text style={s.empty}>No clients yet.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.meta}>{item.email}{item.company ? ` · ${item.company}` : ''}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background, padding: spacing(5) },
  title: { fontSize: 26, color: t.foreground, fontWeight: '600', marginBottom: spacing(5) },
  card: { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing(4), marginBottom: spacing(2) },
  name: { color: t.foreground, fontSize: 15 },
  meta: { color: t.muted, fontSize: 12, marginTop: 2 },
  empty: { color: t.muted, fontSize: 14 },
});
