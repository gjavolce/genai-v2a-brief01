import { parseStreamJsonEvent } from '../lib.mjs';

/**
 * Claude Code engine. It drives the canonical `.claude/` skills, commands, and agents.
 *
 * Read-only actions are held to `--disallowed-tools`, and write actions run with
 * `--permission-mode acceptEdits` because a headless run has nobody to approve a prompt.
 * Neither is a filesystem sandbox. Unlike `codex exec --sandbox`, this engine relies on
 * the throwaway clone and on the post-run ownership check in ActionRunner. Override the
 * defaults with PAYFLOW_CLAUDE_READ_ARGS and PAYFLOW_CLAUDE_WRITE_ARGS if your install
 * needs different permission flags.
 */
const READ_ONLY_ARGS = ['--permission-mode', 'acceptEdits', '--disallowed-tools', 'Edit', 'Write', 'NotebookEdit'];
const WRITE_ARGS = ['--permission-mode', 'acceptEdits'];

function splitArgs(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim().split(/\s+/);
}

export default {
  id: 'claude',
  label: 'Claude Code CLI',
  defaultBin: 'claude',
  defaultModel: 'opus',

  // `/name` is how the Claude client invokes a skill or command.
  skill(name, argument) {
    return `/${name} ${argument}`;
  },

  plannerAgent: 'the Plan subagent',

  requiredSkills: [
    { name: 'business-analyst', path: '.claude/skills/business-analyst/SKILL.md' },
    { name: 'architect', path: '.claude/skills/architect/SKILL.md' },
  ],

  securityReviewerPaths: ['.claude/agents/security-reviewer.md', '.codex/agents/security-reviewer.toml'],

  // The final message arrives in the stream as the `result` event.
  usesLastMessageFile: false,

  buildArgs({ prompt, sessionId, readOnly, model, environment = process.env }) {
    const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--model', model];
    if (sessionId) args.push('--resume', sessionId);
    const permission = readOnly
      ? splitArgs(environment.PAYFLOW_CLAUDE_READ_ARGS, READ_ONLY_ARGS)
      : splitArgs(environment.PAYFLOW_CLAUDE_WRITE_ARGS, WRITE_ARGS);
    return [...args, ...permission];
  },

  parseEvent(line) {
    return parseStreamJsonEvent(line);
  },

  healthArgs: { version: ['--version'], auth: ['auth', 'status'] },
};
