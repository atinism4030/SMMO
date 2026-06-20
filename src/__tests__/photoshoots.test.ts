/**
 * Manual test checklist — Photoshooting Day Flow
 *
 * Run the dev server and verify each case manually in the browser.
 * Automated API tests below use fetch against the local server.
 *
 * Environment: NEXT_PUBLIC_BASE_URL=http://localhost:3000
 */

// @ts-nocheck
// Run with: npx vitest or npx jest

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function login(email: string, password: string) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = r.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/smmo_token=([^;]+)/);
  return match ? match[1] : '';
}

function authHeaders(token: string) {
  return { Cookie: `smmo_token=${token}`, 'Content-Type': 'application/json' };
}

// ─── Test State ───────────────────────────────────────────────────────────────

let ceoToken  = '';
let wrkToken  = '';
let sessionId = '';
let shotId    = '';

const CEO_EMAIL = process.env.TEST_CEO_EMAIL ?? 'ceo@test.com';
const CEO_PASS  = process.env.TEST_CEO_PASS  ?? 'password';
const WRK_EMAIL = process.env.TEST_WRK_EMAIL ?? 'worker@test.com';
const WRK_PASS  = process.env.TEST_WRK_PASS  ?? 'password';
let   workerId  = '';
let   clientId  = '';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Photoshooting Day Flow', () => {

  beforeAll(async () => {
    ceoToken = await login(CEO_EMAIL, CEO_PASS);
    wrkToken = await login(WRK_EMAIL, WRK_PASS);

    // Resolve worker id
    const ur = await fetch(`${BASE}/api/users?role=WORKER`, { headers: authHeaders(ceoToken) });
    const ud = await ur.json();
    workerId = ud.users?.[0]?._id ?? '';

    // Resolve client id
    const cr = await fetch(`${BASE}/api/clients`, { headers: authHeaders(ceoToken) });
    const cd = await cr.json();
    clientId = cd.clients?.[0]?._id ?? '';
  });

  // Test 1 — Unauthenticated access is rejected
  it('T01: unauthenticated GET /api/photoshoots returns 401', async () => {
    const r = await fetch(`${BASE}/api/photoshoots`);
    expect(r.status).toBe(401);
  });

  // Test 2 — CEO can create a session
  it('T02: CEO can create a photoshoot session', async () => {
    expect(clientId).toBeTruthy(); // Need at least one client
    const r = await fetch(`${BASE}/api/photoshoots`, {
      method: 'POST',
      headers: authHeaders(ceoToken),
      body: JSON.stringify({
        clientId,
        title:     'Test Photoshoot Session',
        shootDate: new Date(Date.now() + 86_400_000).toISOString(),
        startTime: '09:00',
        location:  'Studio A',
        priority:  'HIGH',
        assignedWorkers: workerId ? [workerId] : [],
        shotList: [
          { title: 'Test shot 1', category: 'Food',    required: true,  priority: 'HIGH'   },
          { title: 'Test shot 2', category: 'Product', required: false, priority: 'MEDIUM' },
        ],
      }),
    });
    const d = await r.json();
    expect(r.status).toBe(201);
    expect(d.session).toBeDefined();
    expect(d.session.title).toBe('Test Photoshoot Session');
    sessionId = d.session._id;
    expect(sessionId).toBeTruthy();
  });

  // Test 3 — Worker cannot create a session
  it('T03: WORKER cannot create a photoshoot session (403)', async () => {
    const r = await fetch(`${BASE}/api/photoshoots`, {
      method: 'POST',
      headers: authHeaders(wrkToken),
      body: JSON.stringify({
        clientId, title: 'Worker Attempt', shootDate: new Date().toISOString(),
        startTime: '10:00', location: 'Anywhere',
      }),
    });
    expect(r.status).toBe(403);
  });

  // Test 4 — CEO can read the session
  it('T04: CEO can GET the session by id', async () => {
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}`, { headers: authHeaders(ceoToken) });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d.session._id).toBe(sessionId);
    expect(d.session.shotList.length).toBe(2);
    shotId = d.session.shotList[0]._id;
  });

  // Test 5 — Assigned worker can read the session
  it('T05: assigned WORKER can GET the session', async () => {
    if (!workerId) return; // Skip if no worker exists
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}`, { headers: authHeaders(wrkToken) });
    expect(r.status).toBe(200);
  });

  // Test 6 — CEO can add a shot
  it('T06: CEO can add a shot to the list', async () => {
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}/shots`, {
      method: 'POST',
      headers: authHeaders(ceoToken),
      body: JSON.stringify({ title: 'Added shot', category: 'Reel', priority: 'MEDIUM' }),
    });
    const d = await r.json();
    expect(r.status).toBe(201);
    const newLen = d.session.shotList.length;
    expect(newLen).toBe(3);
  });

  // Test 7 — Worker can toggle a shot (shared checklist)
  it('T07: WORKER can toggle a shot completion', async () => {
    if (!workerId || !shotId) return;
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}/shots/${shotId}/toggle`, {
      method: 'PATCH',
      headers: authHeaders(wrkToken),
    });
    const d = await r.json();
    expect(r.status).toBe(200);
    const toggled = d.session.shotList.find((s: { _id: string; completed: boolean }) => s._id === shotId);
    expect(toggled?.completed).toBe(true);
  });

  // Test 8 — Toggle again un-completes the shot
  it('T08: toggling again un-completes the shot', async () => {
    if (!workerId || !shotId) return;
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}/shots/${shotId}/toggle`, {
      method: 'PATCH',
      headers: authHeaders(wrkToken),
    });
    const d = await r.json();
    expect(r.status).toBe(200);
    const toggled = d.session.shotList.find((s: { _id: string; completed: boolean }) => s._id === shotId);
    expect(toggled?.completed).toBe(false);
  });

  // Test 9 — CEO can update session status
  it('T09: CEO can change session status to IN_PROGRESS', async () => {
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}`, {
      method: 'PATCH',
      headers: authHeaders(ceoToken),
      body: JSON.stringify({ status: 'IN_PROGRESS' }),
    });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d.session.status).toBe('IN_PROGRESS');
  });

  // Test 10 — CEO can delete the session (cleanup)
  it('T10: CEO can delete the session', async () => {
    const r = await fetch(`${BASE}/api/photoshoots/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders(ceoToken),
    });
    const d = await r.json();
    expect(r.status).toBe(200);
    expect(d.success).toBe(true);

    // Confirm deletion
    const r2 = await fetch(`${BASE}/api/photoshoots/${sessionId}`, { headers: authHeaders(ceoToken) });
    expect(r2.status).toBe(404);
  });

});

/**
 * ─── Manual UI Test Checklist ────────────────────────────────────────────────
 *
 * CEO Flow
 * [ ] /photoshoots page loads; shows stat cards (Total / Planned / In Progress / Completed)
 * [ ] Status tabs filter cards correctly
 * [ ] "New Session" button navigates to /photoshoots/new
 * [ ] Create form: selecting a template populates the shot list
 * [ ] Create form: can add/remove/edit shot rows manually
 * [ ] Create form: worker checkboxes work; equipment chips toggle
 * [ ] Submitting form redirects to /photoshoots/[id] detail page
 * [ ] Detail page: progress ring updates as shots are toggled
 * [ ] Detail page: "Start Shoot" changes status to IN_PROGRESS
 * [ ] Detail page: "Mark Completed" changes status to COMPLETED
 * [ ] Detail page: Add Shot form adds shot to list immediately
 * [ ] Detail page: Edit pencil opens inline edit form, saves changes
 * [ ] Detail page: Delete shot removes it from list
 * [ ] Detail page: Delete session (danger zone) removes and redirects
 *
 * Worker Flow
 * [ ] /worker/photoshoots shows only assigned sessions
 * [ ] Card shows correct progress bar
 * [ ] Clicking a card navigates to /worker/photoshoots/[id]
 * [ ] Detail page shows "Live — auto-refreshes every 10s" badge when IN_PROGRESS
 * [ ] Manual refresh button works
 * [ ] Tapping a shot toggles it; progress bar updates immediately
 * [ ] Completed shot shows "Completed by [name]" text
 * [ ] Toggling again un-completes; the shot moves back to pending section
 * [ ] Completing all shots shows the 🎉 celebration message
 * [ ] A second browser/worker sees the same completion state after refresh
 */
