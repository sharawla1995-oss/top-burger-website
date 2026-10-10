// Run with: node --test tests/top-chicken-beta-safety.test.cjs
// Static regression checks only; NOT a browser, Supabase or POS E2E test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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
test('Checkout refreshes state; stale and concurrent submissions fail closed', async () => {
  assert.match(app, /async function refreshBranchOpenState\(/);
  assert.match(app, /\$\('#checkoutBtn'\)\.onclick=async\(\)=>\{[^\n]*await refreshBranchOpenState\(\)/);
  const start = app.indexOf("$('#submitOrder').onclick=async()=>{");
  const end = app.indexOf('\n};', start);
  assert.ok(start >= 0 && end > start, 'Order submission handler missing');
  const button = {disabled: false, textContent: 'تأكيد الطلب'};
  const alerts = [];
  let open = true, refreshes = 0;
  const context = {
    $: selector => {
      assert.equal(selector, '#submitOrder', 'Closed branch accessed checkout data');
      return button;
    },
    refreshBranchOpenState: async () => { refreshes++; open = false; },
    branchOpen: () => open,
    alert: message => alerts.push(message),
    rpc: () => assert.fail('Closed branch submitted an order'),
  };
  vm.runInNewContext('let websiteOrderSubmitting=false;\n'+app.slice(start,end+3), context);
  await button.onclick();
  assert.equal(refreshes, 1);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /لم يتم إرسال الطلب/);
  assert.equal(button.disabled, false);

  let finishRefresh;
  open = true;
  context.refreshBranchOpenState = () => {
    refreshes++;
    return new Promise(resolve => { finishRefresh = () => {open=false; resolve();}; });
  };
  const first = button.onclick();
  assert.equal(button.disabled, true);
  const second = button.onclick();
  assert.equal(refreshes, 2, 'Concurrent click started another request');
  finishRefresh();
  await Promise.all([first, second]);
  assert.equal(alerts.length, 2);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'تأكيد الطلب');
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
