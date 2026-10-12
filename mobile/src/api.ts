import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { SkinAnalysis } from './types';

// 分析服务地址，在 .env 里用 EXPO_PUBLIC_API_URL 配置（例如 http://192.168.1.10:3000）
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const MAX_SIDE = 1568;

// 手机原图往往有好几 MB，先压缩到最长边 1568px 再上传
async function toJpegBase64(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ base64: true, compress: 0.85, format: SaveFormat.JPEG });
  if (!result.base64) throw new Error('图片处理失败，请重试。');
  return result.base64;
}

export async function analyzeSkin(uri: string, width: number, height: number): Promise<SkinAnalysis> {
  const base64 = await toJpegBase64(uri, width, height);
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: `data:image/jpeg;base64,${base64}` }),
    });
  } catch {
    throw new Error('连接不上分析服务，请检查网络。');
  }
  const data = await res.json().catch(() => null);
  if (!data?.ok) throw new Error(data?.error ?? '分析失败，请稍后重试。');
  return data.result as SkinAnalysis;
}
