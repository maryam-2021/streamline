import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { request, setToken } from '../api';
import { Theme, radius, spacing } from '../theme';

export default function LoginScreen({ theme, onLogin }: { theme: Theme; onLogin: (user: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      await setToken(user.token);
      onLogin(user);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);
  return (
    <View style={s.container}>
      <View style={s.logo}><Text style={s.logoText}>⚡</Text></View>
      <Text style={s.title}>StreamLine</Text>
      <Text style={s.subtitle}>Sign in to your dashboard</Text>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={theme.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor={theme.muted} secureTextEntry value={password} onChangeText={setPassword} />
      {error ? <Text style={s.error}>{error}</Text> : null}
      <TouchableOpacity style={s.button} onPress={submit} disabled={loading}>
        <Text style={s.buttonText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background, justifyContent: 'center', padding: spacing(6) },
  logo: { width: 56, height: 56, borderRadius: radius.xl, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing(4) },
  logoText: { fontSize: 28 },
  title: { fontSize: 32, color: t.foreground, textAlign: 'center', fontWeight: '600' },
  subtitle: { fontSize: 14, color: t.muted, textAlign: 'center', marginBottom: spacing(8) },
  input: { backgroundColor: t.card, borderColor: t.border, borderWidth: 1, borderRadius: radius.xl, padding: spacing(4), color: t.foreground, marginBottom: spacing(3) },
  error: { color: '#ef4444', fontSize: 13, marginBottom: spacing(2) },
  button: { backgroundColor: t.primary, borderRadius: radius.xl, padding: spacing(4), alignItems: 'center', marginTop: spacing(2) },
  buttonText: { color: t.primaryFg, fontWeight: '600' },
});
