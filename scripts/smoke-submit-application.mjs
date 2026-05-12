import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const shouldStartServer = process.env.SMOKE_START_SERVER !== 'false';
const testId = Date.now().toString().slice(-8);

function loadDotEnv() {
  const envPath = join(rootDir, '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (process.env[key]) continue;
    process.env[key] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

async function waitForServer(url, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.status < 500) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function isServerReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.status < 500;
  } catch {
    return false;
  }
}

function startServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    shell: process.platform === 'win32',
  });

  child.stdout.on('data', (data) => process.stdout.write(`[dev] ${data}`));
  child.stderr.on('data', (data) => process.stderr.write(`[dev] ${data}`));

  return child;
}

async function fillByLabel(page, label, value) {
  await page.getByLabel(label).fill(value);
}

async function goToStep(page, step) {
  await page.getByRole('button', { name: `Step ${step}`, exact: true }).click();
}

async function loginAsAdmin(page) {
  const adminEmail = process.env.SMOKE_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD in the shell.');
  }

  await page.goto(`${baseUrl}/admin/login`);
  const csrfResponse = await page.request.get(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfResponse.json();
  const authResponse = await page.request.post(`${baseUrl}/api/auth/callback/credentials`, {
    form: {
      csrfToken,
      callbackUrl: `${baseUrl}/admin`,
      json: 'true',
      email: adminEmail,
      password: adminPassword,
      loginRole: 'admin',
    },
  });
  const authBody = await authResponse.text();
  if (!authResponse.ok() || authBody.includes('csrf=true') || authBody.includes('CredentialsSignin')) {
    throw new Error(`Admin login failed with HTTP ${authResponse.status()}: ${authBody}`);
  }
  const session = await page.evaluate(() => fetch('/api/auth/session').then((response) => response.json()));
  if (session?.user?.role !== 'admin') {
    const cookieNames = (await page.context().cookies()).map((cookie) => cookie.name);
    throw new Error(`Admin login did not create an admin session. Session: ${JSON.stringify(session)} Cookies: ${cookieNames.join(', ') || 'none'} Auth response: ${authBody}`);
  }
  await page.goto(`${baseUrl}/admin`);
  await page.getByText('Admin Portal').waitFor({ timeout: 30000 });
}

async function fillApplication(page) {
  await page.goto(`${baseUrl}/applications/new`);
  await page.waitForLoadState('networkidle');

  await goToStep(page, 1);
  await fillByLabel(page, /Registration Number/i, `SMOKE-${testId}`);
  await fillByLabel(page, /Collector Name/i, 'Smoke Test Collector');
  await fillByLabel(page, /Project/i, 'Smoke Test Project');
  await fillByLabel(page, /Collector CNIC/i, '4210112345671');
  await fillByLabel(page, /Collector Address/i, 'Smoke Test Address');
  await fillByLabel(page, /Collector Contact/i, '03001234567');

  await goToStep(page, 2);
  await fillByLabel(page, /Father Name/i, 'Smoke Father');
  await fillByLabel(page, /Father DOB/i, '1980-01-01');
  await fillByLabel(page, /Father Age/i, '44');
  await fillByLabel(page, /Father CNIC/i, '4210112345672');
  await fillByLabel(page, /Father Education/i, 'Matric');
  await fillByLabel(page, /Father Occupation/i, 'Laborer');
  await fillByLabel(page, /Father Date of Death/i, '2020-01-01');
  await fillByLabel(page, /Father Cause of Death/i, 'Illness');

  await goToStep(page, 3);
  await fillByLabel(page, /Mother Name/i, 'Smoke Mother');
  await fillByLabel(page, /Mother DOB/i, '1985-01-01');
  await fillByLabel(page, /Mother Age/i, '39');
  await fillByLabel(page, /Mother CNIC/i, '4210112345673');
  await fillByLabel(page, /Mother Education/i, 'Primary');
  await fillByLabel(page, /Mother Tongue/i, 'Urdu');
  await fillByLabel(page, /Mother Native Area/i, 'Karachi');
  await fillByLabel(page, /Mother Contact/i, '03001234568');
  await fillByLabel(page, /Mother Occupation/i, 'Household');
  await fillByLabel(page, /Monthly Income/i, '0');

  await goToStep(page, 4);
  await fillByLabel(page, /Guardian Name/i, 'Smoke Guardian');
  await fillByLabel(page, /Guardian Relationship/i, 'Uncle');
  await fillByLabel(page, /Guardian CNIC/i, '4210112345674');
  await fillByLabel(page, /Guardian Education/i, 'Intermediate');
  await fillByLabel(page, /Guardian Mother Tongue/i, 'Urdu');
  await fillByLabel(page, /Guardian Native Area/i, 'Karachi');
  await fillByLabel(page, /Guardian Contact/i, '03001234569');
  await fillByLabel(page, /Guardian Zakat Status/i, 'Eligible');
  await fillByLabel(page, /Guardian Occupation/i, 'Shopkeeper');
  await fillByLabel(page, /Guardian Monthly Income/i, '30000');

  await goToStep(page, 6);
  await fillByLabel(page, /City/i, 'Karachi');
  await fillByLabel(page, /District/i, 'Central');
  await fillByLabel(page, /Tehsil/i, 'North Nazimabad');
  await fillByLabel(page, /Residential Area/i, 'Block A');
  await fillByLabel(page, /Full Address/i, 'House 1, Street 2');
  await fillByLabel(page, /Longitude/i, '67.0011');
  await fillByLabel(page, /Latitude/i, '24.8607');
  await fillByLabel(page, /House Ownership Status/i, 'Rented');
  await fillByLabel(page, /Monthly Rent/i, '12000');
  await fillByLabel(page, /House Owner\)/i, 'Landlord');
  await fillByLabel(page, /House Condition/i, 'Average');
  await fillByLabel(page, /Furnishing Condition/i, 'Basic');

  await goToStep(page, 8);
  await fillByLabel(page, /Caste/i, 'Smoke Caste');
  await fillByLabel(page, /Sect/i, 'Smoke Sect');
  await fillByLabel(page, /Total Brothers/i, '1');
  await fillByLabel(page, /Total Sisters/i, '1');
  await fillByLabel(page, /Registered Brothers/i, '0');
  await fillByLabel(page, /Registered Sisters/i, '0');
  await fillByLabel(page, /Siblings Under 12/i, '1');
  await fillByLabel(page, /Living Situation Notes/i, 'Lives with mother.');

  await goToStep(page, 9);
  await fillByLabel(page, /Health Status/i, 'Healthy');
  await fillByLabel(page, /Disability Details/i, 'None');
  await fillByLabel(page, /Treatment Place/i, 'Local clinic');
  await fillByLabel(page, /Monthly Medical Expenses/i, '500');
  await fillByLabel(page, /Not Studying Reason/i, 'N/A');
  await fillByLabel(page, /Education Start Condition/i, 'Ready');
  await fillByLabel(page, /Current Class/i, '3');
  await fillByLabel(page, /School Name/i, 'Smoke School');
  await fillByLabel(page, /School Address/i, 'School Road');
  await fillByLabel(page, /Madrasa Name/i, 'N/A');
  await fillByLabel(page, /Madrasa Education Details/i, 'N/A');
  await fillByLabel(page, /Education Fee Status/i, 'Pending');
  await fillByLabel(page, /Monthly School Fee/i, '1500');

  await goToStep(page, 10);
  await fillByLabel(page, /Career Goal/i, 'Teacher');
  await fillByLabel(page, /Technical Interest/i, 'Computer');
  await fillByLabel(page, /Learning Skill/i, 'Reading');
  await fillByLabel(page, /Child Monthly Income/i, '0');
  await fillByLabel(page, /Household Earners Count/i, '1');
  await fillByLabel(page, /Total Household Income/i, '30000');
  await fillByLabel(page, /Other Aid Source/i, 'None');
  await fillByLabel(page, /Monthly Aid Amount/i, '0');
  await fillByLabel(page, /Not Applied Elsewhere Reason/i, 'No other program.');

  await goToStep(page, 11);
  await fillByLabel(page, /Principal Name/i, 'Smoke Principal');
  await fillByLabel(page, /Institution Name/i, 'Smoke Institution');
  await fillByLabel(page, /Verified Student Name/i, 'Smoke Student');
  await fillByLabel(page, /Verified Father Name/i, 'Smoke Father');
  await fillByLabel(page, /Verified Class/i, '3');
  await fillByLabel(page, /Verified Monthly Fee/i, '1500');

  await goToStep(page, 12);
  await fillByLabel(page, /Imam Name/i, 'Smoke Imam');
  await fillByLabel(page, /Mosque Name/i, 'Smoke Mosque');
  await fillByLabel(page, /Neighborhood\/City/i, 'Karachi');
  await fillByLabel(page, /Imam Mobile/i, '03001234570');
  await fillByLabel(page, /Mother Zakat Status/i, 'Eligible');

  await goToStep(page, 14);
  const terms = page.getByLabel(/Terms Accepted/i);
  if (!(await terms.isChecked())) await terms.check();

  await page.getByRole('button', { name: 'Submit Application' }).click();
  await page.getByText('Application submitted successfully.').waitFor({ timeout: 30000 });
}

let server;
let browser;

try {
  loadDotEnv();
  if (shouldStartServer) {
    if (await isServerReady(`${baseUrl}/signin`)) {
      console.log(`Using existing server at ${baseUrl}`);
    } else {
      server = startServer();
    }
  }
  await waitForServer(`${baseUrl}/signin`);

  browser = await chromium.launch({ headless: process.env.SMOKE_HEADLESS !== 'false' });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  await loginAsAdmin(page);
  await fillApplication(page);

  console.log(`Smoke submit passed. Registration: SMOKE-${testId}`);
} catch (error) {
  console.error('Smoke submit failed.');
  console.error(error);
  if (browser) {
    const page = browser.contexts()[0]?.pages()[0];
    if (page) {
      await page.screenshot({ path: 'test-results/smoke-submit-failure.png', fullPage: true });
      console.error('Failure screenshot: test-results/smoke-submit-failure.png');
    }
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      server.kill('SIGTERM');
    }
  }
  if (process.exitCode) process.exit(process.exitCode);
}
