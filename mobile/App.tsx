import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { light, dark, spacing } from './src/theme';
import { request, setToken } from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import WorkflowsScreen from './src/screens/WorkflowsScreen';

const tabs = ['Overview', 'Clients', 'Workflows'] as const;

export default function App() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? dark : light;
  const [user, setUser] = useState<any>(undefined);
  const [tab, setTab] = useState<(typeof tabs)[number]>('Overview');

  useEffect(() => {
    request('/auth/me').then(setUser).catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  if (user === undefined) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  if (!user) return <LoginScreen theme={theme} onLogin={setUser} />;

  const s = styles(theme);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        {tab === 'Overview' && <OverviewScreen theme={theme} user={user} />}
        {tab === 'Clients' && <ClientsScreen theme={theme} />}
        {tab === 'Workflows' && <WorkflowsScreen theme={theme} />}
      </View>
      <View style={s.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity key={t} style={s.tab} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && { color: theme.primary }]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.tab} onPress={logout}>
          <Text style={s.tabText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = (t: any) => StyleSheet.create({
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.card },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing(3) },
  tabText: { fontSize: 12, color: t.muted },
});
