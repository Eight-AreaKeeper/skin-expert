export type Severity = '轻微' | '中等' | '明显';

export interface SkinIssue {
  name: string;
  area: string;
  severity: Severity;
  description: string;
  advice: string;
}

export interface SkinAnalysis {
  image_ok: boolean;
  image_feedback: string;
  skin_type: string;
  skin_type_reason: string;
  overall_score: number;
  summary: string;
  issues: SkinIssue[];
  routine: { morning: string[]; evening: string[]; weekly: string[] };
  lifestyle_tips: string[];
  see_doctor: { recommended: boolean; reason: string };
}
