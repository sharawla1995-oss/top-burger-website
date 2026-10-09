// Run with: node --test tests/top-chicken-beta-safety.test.cjs
// Static regression checks only; NOT a browser, Supabase or POS E2E test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
test('Beta project and tenant are explicitly isolated', () => {
  assert.match(app, /xihcxydjnzemflhedzor\.supabase\.co/);
  assert.match(app, /5358328c-9724-49aa-affc-1bce8be90f92/);
  assert.doesNotMatch(app, /kzokretuuigjhxjzdlmk/);
});
test('Missing branch settings fail closed', () => {
  assert.match(app, /function branchSetting\(/);
  assert.match(app, /orders_open:false/);
  assert.match(app, /if\(r\.orders_open===false\)return false/);
});
test('Checkout and order submission refresh branch state', () => {
  assert.match(app, /async function refreshBranchOpenState\(/);
  assert.match(app, /\$\('#checkoutBtn'\)\.onclick=async\(\)=>\{[^\n]*await refreshBranchOpenState\(\)/);
  assert.match(app, /\$\('#submitOrder'\)\.onclick=async\(\)=>\{\s*await refreshBranchOpenState\(\)/);
});
test('Required branch settings, hours, payment and zones do not swallow fetch errors', () => {
  for (const endpoint of ['branch_website_settings', 'branch_website_hours', 'payment_methods', 'branch_payment_methods', 'delivery_zones']) {
    const line = app.split('\n').find(x => x.includes("get('"+endpoint+'?'));
    assert.ok(line, endpoint+' missing');
    assert.ok(!line.includes('.catch(()=>[])'), endpoint+' masks errors');
  }
});
test('Failure is recoverable from branch gate', () => {
  assert.match(app, /const gate=\$\('#branchGateOptions'\)/);
  assert.match(app, /data-retry-site/);
});
test('PWA cache and presentation are Top Chicken scoped', () => {
  assert.match(sw, /top-chicken-beta-/);
  assert.match(sw, /k\.startsWith\('top-chicken-beta-'\)/);
  assert.match(html, /Top Chicken|توب تشيكن/);
  assert.match(JSON.stringify(manifest), /Top Chicken|توب تشيكن/i);
});
