const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const scheduleHtml = fs.readFileSync(path.join(root, 'schedule.html'), 'utf8');
const configScript = fs.readFileSync(path.join(root, 'js/integration-config.js'), 'utf8');
const integrationsScript = fs.readFileSync(path.join(root, 'js/integrations.js'), 'utf8');

const expected = {
  intro: {
    title: 'Private Session Request | John Zarcaro',
    label: 'Private Cryptocurrency Education Session',
    price: '$249',
    heading: 'Request the Private Cryptocurrency Education Session',
    button: 'Request the $249 Session',
    offer: 'offer-intro',
    description: 'One private session lasting up to 90 minutes.',
    invoice: 'Payment is processed securely through Calendly and Stripe after the agreement is confirmed.'
  },
  'complete-package': {
    title: 'Complete Package Request | John Zarcaro',
    label: 'Complete Cryptocurrency Education Package',
    price: '$799',
    heading: 'Request the Complete Cryptocurrency Education Package',
    button: 'Request the $799 Complete Package',
    offer: 'offer-complete-package',
    description: 'Three private sessions totaling up to four hours.',
    invoice: 'Two client-specific Stripe invoices: $399.50 after signing and $399.50 before session two.'
  },
  custom: {
    title: 'Custom Plan Request | John Zarcaro',
    label: 'Custom Cryptocurrency Education',
    price: 'Custom',
    heading: 'Request a Custom Cryptocurrency Education Plan',
    button: 'Request a Custom Plan',
    offer: 'offer-custom',
    description: 'A custom educational scope for an individual, family, or group.',
    invoice: 'A client-specific Stripe invoice is sent after the scope and price are agreed in writing.'
  }
};

function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadSchedule(service = 'intro') {
  const dom = new JSDOM(scheduleHtml, {
    url: `http://127.0.0.1:8000/schedule.html?service=${service}#lead-form`,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });

  dom.window.console.warn = () => {};
  dom.window.fetch = async () => ({
    ok: false,
    json: async () => ({ success: false, message: 'Submission failed in test.' })
  });

  dom.window.eval(configScript);
  dom.window.eval(integrationsScript);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
  await nextTick();
  return dom;
}

function text(document, selector) {
  const element = document.querySelector(selector);
  assert.ok(element, `Missing element ${selector}`);
  return element.textContent.trim().replace(/\s+/g, ' ');
}

function assertState(dom, service) {
  const document = dom.window.document;
  const state = expected[service];
  assert.equal(document.title, state.title);
  assert.equal(document.querySelector('#service_interest').value, service);
  assert.equal(document.querySelector('#selected_service_key').value, service);
  assert.equal(document.querySelector('#selected_service_label').value, state.label);
  assert.equal(document.querySelector('#selected_service_price').value, state.price);
  assert.equal(text(document, '[data-selected-service-heading]'), state.heading);
  assert.equal(text(document, '[data-selected-service-label]'), state.label);
  assert.equal(text(document, '[data-selected-service-price]'), state.price);
  assert.equal(text(document, '[data-selected-service-description]'), state.description);
  assert.equal(text(document, '[data-selected-service-invoice]'), state.invoice);
  assert.equal(text(document, '#submit-button'), state.button);

  const selectedCard = document.querySelector(`#${state.offer}`);
  assert.ok(selectedCard.classList.contains('selected-service-card'));
  assert.equal(selectedCard.getAttribute('aria-current'), 'true');

  for (const other of document.querySelectorAll('[data-selected-service-card]')) {
    if (other.id === state.offer) continue;
    assert.equal(other.classList.contains('selected-service-card'), false, `${other.id} should not be selected`);
    assert.equal(other.hasAttribute('aria-current'), false, `${other.id} should not have aria-current`);
  }
}

for (const service of Object.keys(expected)) {
  test(`query parameter selects consistent ${service} page state`, async () => {
    const dom = await loadSchedule(service);
    assertState(dom, service);
    if (service !== 'intro') {
      const summary = text(dom.window.document, '.selected-service-summary');
      assert.equal(summary.includes('$249'), false, `${service} summary must not include $249`);
      assert.equal(text(dom.window.document, '#submit-button').includes('$249'), false, `${service} submit must not include $249`);
    }
  });
}

test('changing dropdown updates state and URL without reload', async () => {
  const dom = await loadSchedule('intro');
  const select = dom.window.document.querySelector('#service_interest');
  select.value = 'complete-package';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assertState(dom, 'complete-package');
  assert.equal(dom.window.location.search, '?service=complete-package');
});

test('form submission failure restores the service-specific button label', async () => {
  const dom = await loadSchedule('complete-package');
  const form = dom.window.document.querySelector('#lead-form');
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await nextTick();
  await nextTick();
  assertState(dom, 'complete-package');
  assert.equal(text(dom.window.document, '#submit-button'), expected['complete-package'].button);
});

test('send another request keeps the active service state', async () => {
  const dom = await loadSchedule('custom');
  const document = dom.window.document;
  document.querySelector('#lead-form').style.display = 'none';
  document.querySelector('#sent-panel').classList.add('active');
  document.querySelector('#send-another').click();
  assertState(dom, 'custom');
  assert.equal(document.querySelector('#lead-form').style.display, 'grid');
});
