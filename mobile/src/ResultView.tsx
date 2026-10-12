import { StyleSheet, Text, View } from 'react-native';
import type { Severity, SkinAnalysis } from './types';
import type { Theme } from './theme';

function Card({ t, children, danger }: { t: Theme; children: React.ReactNode; danger?: boolean }) {
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: danger ? t.bad : t.border }]}>
      {children}
    </View>
  );
}

function BulletList({ t, items }: { t: Theme; items?: string[] }) {
  if (!items?.length) return <Text style={[styles.small, { color: t.muted }]}>暂无</Text>;
  return (
    <View>
      {items.map((item, i) => (
        <Text key={i} style={[styles.body, { color: t.text }]}>• {item}</Text>
      ))}
    </View>
  );
}

export default function ResultView({ result: r, t }: { result: SkinAnalysis; t: Theme }) {
  if (!r.image_ok) {
    return (
      <Card t={t}>
        <Text style={[styles.h2, { color: t.text }]}>需要重新拍一张</Text>
        <Text style={[styles.body, { color: t.text }]}>{r.image_feedback}</Text>
      </Card>
    );
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(r.overall_score) || 0)));
  const severityColor: Record<Severity, string> = { 轻微: t.ok, 中等: t.warn, 明显: t.bad };

  return (
    <View>
      {r.see_doctor?.recommended && (
        <Card t={t} danger>
          <Text style={[styles.h2, { color: t.bad }]}>⚠️ 建议就医</Text>
          <Text style={[styles.body, { color: t.text }]}>{r.see_doctor.reason}</Text>
        </Card>
      )}

      <Card t={t}>
        <View style={styles.row}>
          <View style={[styles.score, { borderColor: t.accent, backgroundColor: t.accentSoft }]}>
            <Text style={[styles.scoreNum, { color: t.accent }]}>{score}</Text>
            <Text style={[styles.tiny, { color: t.muted }]}>综合评分</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tag, { backgroundColor: t.accentSoft, color: t.accent }]}>{r.skin_type}</Text>
            <Text style={[styles.body, { color: t.text, marginTop: 6 }]}>{r.summary}</Text>
          </View>
        </View>
        <Text style={[styles.small, { color: t.muted, marginTop: 12 }]}>{r.skin_type_reason}</Text>
      </Card>

      <Card t={t}>
        <Text style={[styles.h2, { color: t.text }]}>发现的问题</Text>
        {r.issues?.length ? (
          r.issues.map((issue, i) => (
            <View key={i} style={[styles.issue, i > 0 && { borderTopWidth: 1, borderTopColor: t.border }]}>
              <View style={styles.issueHead}>
                <Text style={[styles.issueName, { color: t.text }]}>{issue.name}</Text>
                <Text style={[styles.sev, { backgroundColor: severityColor[issue.severity] ?? t.muted }]}>
                  {issue.severity}
                </Text>
              </View>
              <Text style={[styles.small, { color: t.muted }]}>{issue.area} · {issue.description}</Text>
              <Text style={[styles.body, { color: t.text, marginTop: 4 }]}>💡 {issue.advice}</Text>
            </View>
          ))
        ) : (
          <Text style={[styles.small, { color: t.muted }]}>没有发现明显问题，继续保持！</Text>
        )}
      </Card>

      <Card t={t}>
        <Text style={[styles.h2, { color: t.text }]}>养护方案</Text>
        <Text style={[styles.h3, { color: t.muted }]}>☀️ 早间</Text>
        <BulletList t={t} items={r.routine?.morning} />
        <Text style={[styles.h3, { color: t.muted }]}>🌙 晚间</Text>
        <BulletList t={t} items={r.routine?.evening} />
        <Text style={[styles.h3, { color: t.muted }]}>📅 每周</Text>
        <BulletList t={t} items={r.routine?.weekly} />
      </Card>

      <Card t={t}>
        <Text style={[styles.h2, { color: t.text }]}>生活习惯</Text>
        <BulletList t={t} items={r.lifestyle_tips} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  score: { width: 84, height: 84, borderRadius: 42, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  tiny: { fontSize: 10 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 99, overflow: 'hidden', fontSize: 14, fontWeight: '600' },
  h2: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  h3: { fontSize: 15, fontWeight: '600', marginTop: 10, marginBottom: 4 },
  body: { fontSize: 15, lineHeight: 23 },
  small: { fontSize: 14, lineHeight: 21 },
  issue: { paddingVertical: 12 },
  issueHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  issueName: { fontSize: 16, fontWeight: '600', flex: 1 },
  sev: { color: '#fff', fontSize: 13, paddingHorizontal: 8, paddingVertical: 1, borderRadius: 99, overflow: 'hidden' },
});
