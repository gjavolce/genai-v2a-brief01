import { parseThreadEvent } from '../lib.mjs';

/**
 * Codex CLI engine. It drives the `.agents/` and `.codex/` shim layer.
 *
 * `codex exec --sandbox` gives a real filesystem sandbox, so a write action cannot
 * touch anything outside the clone even before the ownership check runs.
 */
export default {
  id: 'codex',
  label: 'Codex CLI',
  defaultBin: 'codex',
  defaultModel: 'gpt-5.6-sol',

  // `$name` is how the Codex client invokes a project skill.
  skill(name, argument) {
    return `$${name} ${argument}`;
  },

  plannerAgent: 'the project planner agent',

  requiredSkills: [
    { name: 'business-analyst', path: '.agents/skills/business-analyst/SKILL.md' },
    { name: 'architect', path: '.agents/skills/architect/SKILL.md' },
  ],

  securityReviewerPaths: ['.codex/agents/security-reviewer.toml', '.claude/agents/security-reviewer.md'],

  // Codex writes the final assistant message to the -o file.
  usesLastMessageFile: true,

  buildArgs({ prompt, repoPath, sessionId, readOnly, model, lastMessagePath }) {
    if (sessionId) {
      return ['exec', 'resume', '--json', '--model', model, '-o', lastMessagePath, sessionId, prompt];
    }
    return [
      'exec', '--json', '--model', model,
      '--sandbox', readOnly ? 'read-only' : 'workspace-write',
      '-C', repoPath, '-o', lastMessagePath, prompt,
    ];
  },

  parseEvent(line) {
    const parsed = parseThreadEvent(line);
    const item = parsed.event?.type === 'item.completed' ? parsed.event.item : null;
    const command = item?.type === 'command_execution' && typeof item.command === 'string' ? item.command : null;
    return { sessionId: parsed.threadId, commands: command ? [command] : [], finalMessage: null };
  },

  healthArgs: { version: ['--version'], auth: ['login', 'status'] },
};
