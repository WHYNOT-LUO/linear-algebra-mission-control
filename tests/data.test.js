// Checks on the study plan and quiz data. Run with: node --test
// The site's scripts are plain browser scripts (no modules), so the data files
// are loaded into a sandbox the same way the page loads them.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  `${read('js/curriculum.js')};${read('js/quiz-data.js')};
   globalThis.data = JSON.stringify({ WEEKS, PS, BADGE, BDOT, FLASHCARDS, MC_QUESTIONS });`,
  sandbox,
);
const { WEEKS, PS, BADGE, BDOT, FLASHCARDS, MC_QUESTIONS } = JSON.parse(sandbox.data);
const days = WEEKS.flatMap((week) => week.days);
const tasks = days.flatMap((day) => day.tasks.map((task) => ({ day: day.day, ...task })));

const isLink = (value) => typeof value === 'string' && /^https:\/\/\S+$/.test(value) && !value.includes('undefined');
const filled = (value) => typeof value === 'string' && value.trim().length > 0;

test('every script the page loads exists and parses', () => {
  const scripts = [...read('index.html').matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0, 'index.html loads no scripts');
  for (const src of scripts) {
    assert.ok(fs.existsSync(path.join(root, src)), `${src} is missing`);
    assert.doesNotThrow(() => new vm.Script(read(src), { filename: src }), `${src} has a syntax error`);
  }
});

test('every local file index.html points to exists', () => {
  const refs = [...read('index.html').matchAll(/(?:href|src)="([^"#]+)"/g)]
    .map((m) => m[1])
    .filter((ref) => !/^(https?:|data:|mailto:)/.test(ref));
  for (const ref of refs) {
    assert.ok(fs.existsSync(path.join(root, ref.split('?')[0])), `${ref} is missing`);
  }
});

test('the plan has four numbered weeks with a title and a theme', () => {
  assert.deepEqual(WEEKS.map((week) => week.number), [1, 2, 3, 4]);
  for (const week of WEEKS) {
    assert.ok(filled(week.title) && filled(week.theme), `week ${week.number} lacks a title or theme`);
    assert.ok(week.days.length > 0, `week ${week.number} has no days`);
  }
});

test('days are numbered 1, 2, 3… with no gaps or repeats', () => {
  assert.deepEqual(days.map((day) => day.day), days.map((_, index) => index + 1));
});

test('every day has a topic and at least one task', () => {
  for (const day of days) {
    assert.ok(filled(day.topic), `day ${day.day} has no topic`);
    // Review and practice days have no summary; the page skips the box for them.
    if (day.summary) assert.ok(filled(day.summary.geo), `day ${day.day} has an empty summary`);
    assert.ok(day.tasks.length > 0, `day ${day.day} has no tasks`);
  }
});

test('every task has a title, a known source and somewhere to go', () => {
  for (const task of tasks) {
    const where = `day ${task.day} "${task.t}"`;
    assert.ok(filled(task.t), `day ${task.day} has a task with no title`);
    assert.ok(task.r in BADGE && task.r in BDOT, `${where} has unknown source "${task.r}"`);
    if (task.ps !== undefined) {
      assert.ok(task.ps in PS, `${where} points to problem set "${task.ps}", which does not exist`);
    } else {
      assert.ok(isLink(task.url), `${where} has a broken link: ${task.url}`);
    }
  }
});

test('every problem set has a problems link, a solutions link and a name', () => {
  for (const [key, [problems, solutions, name]] of Object.entries(PS)) {
    assert.ok(isLink(problems), `problem set "${key}" has a broken problems link`);
    assert.ok(isLink(solutions), `problem set "${key}" has a broken solutions link`);
    assert.ok(filled(name), `problem set "${key}" has no name`);
  }
});

test('every flashcard has a question, an answer and a week from the plan', () => {
  assert.ok(FLASHCARDS.length > 0);
  for (const card of FLASHCARDS) {
    assert.ok(filled(card.q) && filled(card.a), `flashcard "${card.q}" lacks a question or answer`);
    assert.ok(WEEKS.some((week) => week.number === card.week), `flashcard "${card.q}" has week ${card.week}`);
  }
});

test('every quiz question has distinct options and a correct answer among them', () => {
  assert.ok(MC_QUESTIONS.length > 0);
  for (const question of MC_QUESTIONS) {
    const where = `question "${question.q}"`;
    assert.ok(filled(question.q) && filled(question.exp), `${where} lacks text or an explanation`);
    assert.ok(question.opts.length >= 2, `${where} has fewer than two options`);
    assert.equal(new Set(question.opts).size, question.opts.length, `${where} repeats an option`);
    assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < question.opts.length,
      `${where} marks option ${question.correct} as correct, which does not exist`);
    assert.ok(WEEKS.some((week) => week.number === question.week), `${where} has week ${question.week}`);
  }
});
