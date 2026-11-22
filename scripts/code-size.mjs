import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

/**
 * The size facts `docs/CODE_QUALITY.md` states, measured the way the lint limits count: lines of
 * code, so blank lines and comments do not count. `npm run check:repo` fails when the doc and
 * this measurement disagree; `node scripts/code-size.mjs` prints the rows to paste.
 */

const CODE_LINES = { skipBlankLines: true, skipComments: true };

/** @param {string} file */
const isTest = (file) => /\.test\.tsx?$/.test(file) || /^e2e\/.*\.spec\.ts$/.test(file);

/** @param {string} file */
const isSource = (file) =>
  /^(src|api)\/.*\.tsx?$/.test(file) && !isTest(file) && !/\/(test|fixtures)\//.test(file);

/** @param {string} message */
const countIn = (message) => Number(/\((\d+)\)/.exec(message)?.[1] ?? 0);

/**
 * Lines of code in each file and in each function, from ESLint's own `max-lines` and
 * `max-lines-per-function` rules set to report everything.
 * @param {string[]} files
 */
async function lineCounts(files) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: {
        'max-lines': ['error', { max: 0, ...CODE_LINES }],
        'max-lines-per-function': ['error', { max: 0, ...CODE_LINES }],
      },
    },
  });
  const results = await eslint.lintFiles(files);
  return results.map((result) => {
    const file = relative(process.cwd(), result.filePath).replace(/\\/g, '/');
    const fileLines = result.messages.find((m) => m.ruleId === 'max-lines');
    const functions = result.messages
      .filter((m) => m.ruleId === 'max-lines-per-function')
      .map((m) => ({ file, lines: countIn(m.message) }));
    return { file, lines: fileLines === undefined ? 0 : countIn(fileLines.message), functions };
  });
}

/**
 * Lines of CSS that are not blank and not comments.
 * @param {string} file
 */
function cssLines(file) {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  return text.split('\n').filter((line) => line.trim() !== '').length;
}

/**
 * The largest item of a list by a numeric key.
 * @template T
 * @param {T[]} items
 * @param {(item: T) => number} size
 */
function largest(items, size) {
  return items.reduce((best, item) => (size(item) > size(best) ? item : best));
}

/**
 * The size facts as [label, value] rows, in the order the doc lists them.
 * @returns {Promise<[string, string][]>}
 */
export async function measureCode() {
  const tracked = execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean);
  const sourceFiles = tracked.filter(isSource);
  const source = await lineCounts(sourceFiles);
  const unexplained = sourceFiles.filter(
    (file) => !/^(\/\*\*|\/\/)/.test(readFileSync(file, 'utf8')),
  );
  const tests = await lineCounts(tracked.filter(isTest));
  const styles = tracked.filter((file) => file.startsWith('src/') && file.endsWith('.css'));

  const bigFile = largest(source, (item) => item.lines);
  const bigTest = largest(tests, (item) => item.lines);
  const longest = largest(
    source.flatMap((item) => item.functions),
    (fn) => fn.lines,
  );
  const bigStyle = largest(styles, cssLines);
  return [
    ['Source files / test files', `${source.length} / ${tests.length}`],
    ['Source files without a purpose comment at the top', String(unexplained.length)],
    ['Largest source file (lines of code)', `${bigFile.lines} (\`${bigFile.file}\`)`],
    ['Longest function (lines of code)', `${longest.lines} (in \`${longest.file}\`)`],
    ['Largest test file (lines of code)', `${bigTest.lines} (\`${bigTest.file}\`)`],
    ['Largest stylesheet (lines of code)', `${cssLines(bigStyle)} (\`${bigStyle}\`)`],
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [label, value] of await measureCode()) {
    console.log(`| ${label} | ${value} |`);
  }
}
