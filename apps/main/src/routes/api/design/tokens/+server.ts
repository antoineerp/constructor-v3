import { tokensToCss, themeOverrides } from '../../../../lib/design/tokens';
import { text } from '@sveltejs/kit';

export function GET(){
  const base = tokensToCss();
  const dark = themeOverrides('dark');
  const css = `${base}\n${dark}`;
  return text(css, { status:200, headers: { 'Content-Type':'text/css; charset=utf-8', 'Cache-Control':'no-store' } });
}