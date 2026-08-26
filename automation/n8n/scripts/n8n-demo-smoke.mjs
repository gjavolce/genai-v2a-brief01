const baseUrl = process.env.N8N_URL ?? 'http://127.0.0.1:5678';
const email = process.env.N8N_OWNER_EMAIL;
const password = process.env.N8N_OWNER_PASSWORD;
if (!email || !password) throw new Error('Set N8N_OWNER_EMAIL and N8N_OWNER_PASSWORD for the local owner account');

const login = await fetch(`${baseUrl}/rest/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ emailOrLdapLoginId: email, password }),
});
if (!login.ok) throw new Error(`n8n login failed with ${login.status}`);
const cookie = login.headers.get('set-cookie')?.split(';', 1)[0];
if (!cookie) throw new Error('n8n login did not return an authentication cookie');

const scenario = process.env.N8N_DEMO_SCENARIO ?? 'happy-path';
const initial = new FormData();
for (const [name, value] of Object.entries({
  'field-0': 'new-demo',
  'field-1': '04',
  'field-2': 'origin/main',
  'field-3': '',
  'field-4': scenario,
})) initial.append(name, value);
let waitingUrl = await submit(`${baseUrl}/form/payflow`, initial);
process.stdout.write(`Started demo execution at ${waitingUrl}\n`);
const visited = [];

for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
  const html = await waitForForm(waitingUrl);
  const title = decode(html.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
  if (!html.includes("name='n8n-form'")) {
    if (html.includes("body: {}")) {
      await submit(waitingUrl, new FormData());
      break;
    }
    if (/complete/i.test(title)) break;
    throw new Error(`execution ended without a completion page: ${title}`);
  }
  const decision = decisionFor(title);
  visited.push(title);
  process.stdout.write(`Submitting ${title}: ${decision}\n`);
  const fields = new FormData();
  fields.append('field-0', decision);
  for (const match of html.matchAll(/<input type="hidden" id="(field-\d+)" name="field-\d+" value="([^"]*)"/g)) {
    fields.append(match[1], decode(match[2]));
  }
  waitingUrl = await submit(waitingUrl, fields);
}

const REQUIRED_PAGES = {
  'happy-path': ['Preflight', 'Acceptance', 'ADR', 'Plan', 'Coverage', 'Build Task 1', 'Tests', 'Security review unavailable', 'Review Findings'],
  // A failing action must reach the recovery form instead of ending the execution in red.
  'repeated-failure': ['Preflight', 'Action failed'],
  'no-go-revision': ['Preflight', 'Acceptance', 'ADR', 'Plan', 'Coverage'],
};
for (const expected of REQUIRED_PAGES[scenario] ?? REQUIRED_PAGES['happy-path']) {
  if (!visited.some((title) => title.includes(expected))) throw new Error(`the ${scenario} demo did not visit ${expected}`);
}
process.stdout.write(`n8n ${scenario} smoke passed through ${visited.length} wait forms:\n${visited.map((title) => `- ${title}`).join('\n')}\n`);

async function submit(url, form) {
  const response = await fetch(localUrl(url), { method: 'POST', headers: { Cookie: cookie }, body: form });
  const text = await response.text();
  if (!response.ok) throw new Error(`form POST failed with ${response.status}: ${text.slice(0, 500)}`);
  try {
    const value = JSON.parse(text);
    if (value.formWaitingUrl) return value.formWaitingUrl;
    if (value.code !== undefined) throw new Error(JSON.stringify(value));
  } catch (error) {
    if (error instanceof SyntaxError) return url;
    throw error;
  }
  return url;
}

async function waitForForm(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    let html;
    try {
      const response = await fetch(localUrl(url), { headers: { Cookie: cookie }, signal: AbortSignal.timeout(5000) });
      html = await response.text();
    } catch (error) {
      if (error.name === 'TimeoutError') continue;
      throw error;
    }
    if (/finished with error|Problem loading form/.test(html)) throw new Error(html.match(/<p>(.*?)<\/p>/)?.[1] ?? 'n8n execution failed');
    if (html.includes("name='n8n-form'") || html.includes("body: {}") || /complete/i.test(html.match(/<h1>(.*?)<\/h1>/)?.[1] ?? '')) return html;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('n8n did not produce the next form');
}

let revisionsRequested = 0;

function decisionFor(title) {
  // A failed action must offer a decision, not a dead execution.
  if (title.includes('Action failed')) return 'stop';
  if (title.includes('Preflight')) return 'create-task-branch';
  if (title.includes('Acceptance')) return 'accept';
  if (title.includes('ADR')) return 'accept';
  if (title.includes('Planner clarification')) return 'Return the original result.';
  if (title.includes('Coverage')) {
    // Revise once, then take the GO. Revising every time would never converge.
    if (scenario === 'no-go-revision' && revisionsRequested++ === 0) return 'revise-plan';
    return 'accept-go';
  }
  if (title.includes('Plan')) return 'approve';
  if (title.includes('Build Task 1')) return 'waive-remaining';
  if (title.includes('Build Task')) return 'continue';
  if (title.includes('Tests')) return 'accept-green';
  if (title.includes('Security review unavailable')) return 'continue-without-security-review';
  if (title.includes('Review Findings')) return 'none';
  if (title.includes('Resume retained run')) return 'stop';
  throw new Error(`no demo decision is defined for ${title}`);
}

function localUrl(url) {
  const parsed = new URL(url);
  return `${baseUrl}${parsed.pathname}${parsed.search}`;
}

function decode(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}
