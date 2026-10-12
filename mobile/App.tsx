import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { analyzeSkin } from './src/api';
import ResultView from './src/ResultView';
import { useTheme } from './src/theme';
import type { SkinAnalysis } from './src/types';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
};

function Home() {
  const t = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SkinAnalysis | null>(null);

  async function pick(source: 'camera' | 'library') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('需要权限', source === 'camera' ? '请在系统设置中允许皮肤专家使用相机。' : '请在系统设置中允许皮肤专家访问相册。');
      return;
    }
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...PICKER_OPTIONS, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (picked.canceled || !picked.assets[0]) return;

    const asset = picked.assets[0];
    setPhoto(asset.uri);
    setResult(null);
    setError('');
    setBusy(true);
    try {
      setResult(await analyzeSkin(asset.uri, asset.width, asset.height));
      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 300);
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: t.bg }]} edges={['top']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: t.text }]}>皮肤专家</Text>
        <Text style={[styles.sub, { color: t.muted }]}>拍一张照片，AI 帮你看看皮肤状态</Text>

        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {photo && <Image source={{ uri: photo }} style={styles.preview} />}
          <Pressable
            disabled={busy}
            onPress={() => pick('camera')}
            style={({ pressed }) => [styles.btn, { backgroundColor: t.accent, opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.btnText}>📷 拍照分析</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => pick('library')}
            style={({ pressed }) => [styles.btn, styles.btnGap, { backgroundColor: t.accentSoft, opacity: busy ? 0.5 : pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.btnText, { color: t.accent }]}>从相册选择</Text>
          </Pressable>

          {busy ? (
            <View style={styles.loading}>
              <ActivityIndicator color={t.accent} size="large" />
              <Text style={[styles.tip, { color: t.muted, marginTop: 10 }]}>正在分析，请稍候…</Text>
            </View>
          ) : (
            <View style={styles.tips}>
              {['素颜、在自然光下拍摄效果最好', '镜头离脸约 30 厘米，保持对焦清晰', '避免美颜、滤镜和强烈的阴影'].map((tip) => (
                <Text key={tip} style={[styles.tip, { color: t.muted }]}>• {tip}</Text>
              ))}
            </View>
          )}
          {!!error && <Text style={[styles.tip, { color: t.bad, marginTop: 10 }]}>{error}</Text>}
        </View>

        {result && <ResultView result={result} t={t} />}

        <Text style={[styles.disclaimer, { color: t.muted }]}>
          分析结果仅供护肤参考，不构成医疗诊断。如有持续或严重的皮肤问题，请咨询皮肤科医生。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  sub: { fontSize: 15, marginTop: 2, marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 14, marginBottom: 12 },
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  btnGap: { marginTop: 10 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  loading: { alignItems: 'center', paddingVertical: 20 },
  tips: { marginTop: 14 },
  tip: { fontSize: 14, lineHeight: 22 },
  disclaimer: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
