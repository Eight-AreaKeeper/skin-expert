import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6EFE9', card: '#FFFFFF', text: '#2B2420', muted: '#8A7D74', border: '#EADFD7',
  accent: '#D9776A', accentSoft: '#FBE6E1', ok: '#4F9A74', warn: '#D79A2B', bad: '#C9503F',
};
const dark: typeof light = {
  bg: '#1D1916', card: '#2A2420', text: '#F1E8E2', muted: '#A99B91', border: '#3B322C',
  accent: '#E8897C', accentSoft: '#3D2C28', ok: '#5DAE85', warn: '#E0A93F', bad: '#E06753',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
