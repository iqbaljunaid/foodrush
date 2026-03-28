/**
 * T04 — Accessibility contrast ratio checker
 *
 * Validates WCAG 2.1 AA color contrast ratios for all token color pairs
 * used across the FoodRush customer and driver apps.
 *
 * WCAG AA thresholds:
 *  - Normal text (< 18pt / < 14pt bold): ≥ 4.5:1
 *  - Large text (≥ 18pt / ≥ 14pt bold):  ≥ 3.0:1
 *  - UI components & graphical objects:   ≥ 3.0:1
 */

interface ColorPair {
  name: string;
  foreground: string;
  background: string;
  context: 'normal' | 'large' | 'ui';
}

interface ContrastResult {
  pair: ColorPair;
  ratio: number;
  required: number;
  passed: boolean;
}

// ── Color parsing ─────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  // Handle 3-char, 6-char, and 8-char (with alpha) hex
  const fullHex = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean.slice(0, 6);

  const num = parseInt(fullHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const srgb = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Design token color pairs ──────────────────────────────────────

const CUSTOMER_PAIRS: ColorPair[] = [
  { name: 'primary on surface', foreground: '#FF6B35', background: '#FFFFFF', context: 'large' },
  { name: 'text on surface', foreground: '#0D0D0D', background: '#FFFFFF', context: 'normal' },
  { name: 'textMuted on surface', foreground: '#6B7280', background: '#FFFFFF', context: 'normal' },
  { name: 'text on surfaceMid', foreground: '#0D0D0D', background: '#F7F7F7', context: 'normal' },
  { name: 'textMuted on surfaceMid', foreground: '#6B7280', background: '#F7F7F7', context: 'normal' },
  { name: 'white on primary (button)', foreground: '#FFFFFF', background: '#FF6B35', context: 'large' },
  { name: 'white on secondary (button)', foreground: '#FFFFFF', background: '#1A1A2E', context: 'large' },
  { name: 'white on danger (button)', foreground: '#FFFFFF', background: '#EF233C', context: 'large' },
  { name: 'primary on surface (ghost)', foreground: '#FF6B35', background: '#FFFFFF', context: 'normal' },
  { name: 'success on success-bg', foreground: '#06D6A0', background: '#06D6A020', context: 'normal' },
  { name: 'danger on danger-bg', foreground: '#EF233C', background: '#EF233C20', context: 'normal' },
  { name: 'accent on accent-bg (warning)', foreground: '#FFD166', background: '#FFD16630', context: 'normal' },
];

const DRIVER_PAIRS: ColorPair[] = [
  { name: 'primary on surface', foreground: '#00C896', background: '#111111', context: 'large' },
  { name: 'text on surface', foreground: '#F5F5F5', background: '#111111', context: 'normal' },
  { name: 'textMuted on surface', foreground: '#9CA3AF', background: '#111111', context: 'normal' },
  { name: 'text on surfaceMid', foreground: '#F5F5F5', background: '#1C1C1C', context: 'normal' },
  { name: 'textMuted on secondary', foreground: '#9CA3AF', background: '#0A0A0A', context: 'normal' },
  { name: 'white on primary (button)', foreground: '#FFFFFF', background: '#00C896', context: 'large' },
  { name: 'accent on surface', foreground: '#FFBE0B', background: '#111111', context: 'large' },
  { name: 'danger on surface', foreground: '#FF3A5C', background: '#111111', context: 'large' },
];

// ── Check runner ──────────────────────────────────────────────────

function getRequiredRatio(context: ColorPair['context']): number {
  switch (context) {
    case 'normal':
      return 4.5;
    case 'large':
    case 'ui':
      return 3.0;
  }
}

function checkPairs(appName: string, pairs: ColorPair[]): ContrastResult[] {
  return pairs.map((pair) => {
    const ratio = contrastRatio(pair.foreground, pair.background);
    const required = getRequiredRatio(pair.context);
    return { pair, ratio, required, passed: ratio >= required };
  });
}

function printResults(appName: string, results: ContrastResult[]): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${appName} — Color Contrast Results`);
  console.log(`${'═'.repeat(60)}`);

  const maxNameLen = Math.max(...results.map((r) => r.pair.name.length));

  for (const r of results) {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const name = r.pair.name.padEnd(maxNameLen);
    const ratio = r.ratio.toFixed(2).padStart(6);
    const req = r.required.toFixed(1);
    console.log(`  ${status}  ${name}  ${ratio}:1  (need ${req}:1)  [${r.pair.context}]`);
  }

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0) {
    console.log(`\n  ⚠️  ${failures.length} FAILING pair(s):`);
    for (const f of failures) {
      console.log(`     → ${f.pair.name}: ${f.pair.foreground} on ${f.pair.background}`);
    }
  } else {
    console.log(`\n  ✅ All ${results.length} pairs pass WCAG 2.1 AA`);
  }
}

// ── Main ──────────────────────────────────────────────────────────

function main(): void {
  const customerResults = checkPairs('Customer App', CUSTOMER_PAIRS);
  const driverResults = checkPairs('Driver App', DRIVER_PAIRS);

  printResults('Customer App', customerResults);
  printResults('Driver App', driverResults);

  const allResults = [...customerResults, ...driverResults];
  const totalFails = allResults.filter((r) => !r.passed).length;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  Total: ${allResults.length} pairs checked, ${totalFails} failures`);
  console.log(`${'─'.repeat(60)}\n`);

  if (totalFails > 0) {
    process.exitCode = 1;
  }
}

main();
