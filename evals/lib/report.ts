/** Collects eval rows and writes a Markdown + JSON report under evals/results/. */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Row {
  suite: string;
  id: string;
  pass: boolean;
  /** Short columns for the Markdown table, in order. */
  cells: Record<string, string>;
  /** Free-form detail kept in the JSON file. */
  detail?: unknown;
  failure?: string;
}

const RESULTS_DIR = join(__dirname, '..', 'results');

export function writeReport(name: string, title: string, rows: Row[], notes: string[] = []): string {
  mkdirSync(RESULTS_DIR, { recursive: true });
  const passed = rows.filter((r) => r.pass).length;
  const lines: string[] = [`# ${title}`, '', `Run ${new Date().toISOString()}: **${passed} of ${rows.length} passed**.`, ''];
  for (const n of notes) lines.push(`- ${n}`);
  if (notes.length) lines.push('');

  const suites = [...new Set(rows.map((r) => r.suite))];
  for (const suite of suites) {
    const sr = rows.filter((r) => r.suite === suite);
    const cols = Object.keys(sr[0]?.cells ?? {});
    lines.push(`## ${suite} (${sr.filter((r) => r.pass).length}/${sr.length})`, '');
    lines.push(`| Case | Result | ${cols.join(' | ')} |`);
    lines.push(`| --- | --- | ${cols.map(() => '---').join(' | ')} |`);
    for (const r of sr) {
      lines.push(`| ${r.id} | ${r.pass ? 'pass' : '**fail**'} | ${cols.map((c) => (r.cells[c] ?? '').replace(/\|/g, '/')).join(' | ')} |`);
    }
    const fails = sr.filter((r) => !r.pass && r.failure);
    if (fails.length) {
      lines.push('', 'Failures:', '');
      for (const r of fails) lines.push(`- **${r.id}**: ${r.failure}`);
    }
    lines.push('');
  }

  const md = join(RESULTS_DIR, `${name}.md`);
  writeFileSync(md, lines.join('\n'));
  writeFileSync(join(RESULTS_DIR, `${name}.json`), JSON.stringify(rows, null, 2));
  return md;
}

export const pct = (actual: number, expected: number): number =>
  expected === 0 ? (actual === 0 ? 0 : 1) : (actual - expected) / expected;

export const fmtPct = (p: number): string => `${p >= 0 ? '+' : ''}${Math.round(p * 100)}%`;
