(function () {
  'use strict';

  const config = window.JOHN_SITE_INTEGRATIONS || {};
  const warned = new Set();

  const SERVICE_OPTIONS = Object.freeze({
    intro: Object.freeze({
      key: 'intro',
      label: 'Private Cryptocurrency Education Session',
      shortLabel: 'Private Session',
      price: '$249',
      formOption: 'Intro Crypto Education - $249',
      heading: 'Request the Private Cryptocurrency Education Session',
      message: 'You selected the $249 private session. John will confirm the agreement before payment.',
      submitLabel: 'Request the $249 Session',
      offerId: 'offer-intro',
      paymentDescription: 'One private session lasting up to 90 minutes.',
      invoiceDescription: 'Payment is processed securely through Calendly and Stripe after the agreement is confirmed.'
    }),
    'complete-package': Object.freeze({
      key: 'complete-package',
      label: 'Complete Cryptocurrency Education Package',
      shortLabel: 'Complete Package',
      price: '$799',
      formOption: 'Complete Education Package - $799',
      heading: 'Request the Complete Cryptocurrency Education Package',
      message: 'You selected the $799 complete package. John will confirm the agreement and send two client-specific Stripe invoices: $399.50 after signing and $399.50 before session two.',
      submitLabel: 'Request the $799 Complete Package',
      offerId: 'offer-complete-package',
      paymentDescription: 'Three private sessions totaling up to four hours.',
      invoiceDescription: 'Two client-specific Stripe invoices: $399.50 after signing and $399.50 before session two.'
    }),
    custom: Object.freeze({
      key: 'custom',
      label: 'Custom Cryptocurrency Education',
      shortLabel: 'Custom Plan',
      price: 'Custom',
      formOption: 'Custom education for a family or group',
      heading: 'Request a Custom Cryptocurrency Education Plan',
      message: 'You selected a custom education plan. John will confirm the written scope and send a client-specific Stripe invoice for the approved amount.',
      submitLabel: 'Request a Custom Plan',
      offerId: 'offer-custom',
      paymentDescription: 'A custom educational scope for an individual, family, or group.',
      invoiceDescription: 'A client-specific Stripe invoice is sent after the scope and price are agreed in writing.'
    })
  });

  let activeServiceKey = 'intro';

  function warnOnce(key, message) {
    if (warned.has(key)) return;
    warned.add(key);
    console.warn(`[John site integrations] ${message}`);
  }

  function isHttpsUrl(value) {
    if (!value || typeof value !== 'string') return false;
    try {
      return new URL(value).protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function getConfiguredUrl(key) {
    const value = config[key];
    if (!value) return '';
    if (!isHttpsUrl(value)) {
      warnOnce(key, `${key} must be an https URL.`);
      return '';
    }
    return value;
  }

  function getFallbackUrl(element) {
    if (element.dataset.integrationFallbackUrl) {
      return element.dataset.integrationFallbackUrl;
    }

    const fallbackKey = element.dataset.integrationFallback || 'bookingFallbackUrl';
    return config[fallbackKey] || 'schedule.html';
  }

  function setLink(element, url, opensNewWindow) {
    element.setAttribute('href', url);
    if (opensNewWindow) {
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
    } else {
      element.removeAttribute('target');
      element.removeAttribute('rel');
    }
    element.removeAttribute('aria-disabled');
  }

  function configureLinks() {
    document.querySelectorAll('[data-integration-link]').forEach((element) => {
      const key = element.dataset.integrationLink;
      const configuredUrl = getConfiguredUrl(key);
      const fallbackUrl = getFallbackUrl(element);
      const isOptional = element.hasAttribute('data-integration-optional');

      if (configuredUrl) {
        setLink(element, configuredUrl, element.dataset.integrationTarget === 'blank');
        element.hidden = false;
        return;
      }

      warnOnce(key, `${key} is not configured; using the existing request flow instead.`);

      if (isOptional) {
        element.hidden = true;
        return;
      }

      setLink(element, fallbackUrl, false);
    });
  }

  function loadCalendlyAssets() {
    if (!document.querySelector('link[data-calendly-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.dataset.calendlyCss = 'true';
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[data-calendly-widget]')) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      script.dataset.calendlyWidget = 'true';
      document.body.appendChild(script);
    }
  }

  function configureCalendlyEmbeds() {
    document.querySelectorAll('[data-calendly-embed]').forEach((embed) => {
      const key = embed.dataset.calendlyEmbed;
      const configuredUrl = getConfiguredUrl(key);
      const wrapper = embed.closest('[data-calendly-section]');
      const fallback = wrapper ? wrapper.querySelector('[data-calendly-fallback]') : null;

      if (!configuredUrl) {
        warnOnce(key, `${key} is not configured; keeping the request form fallback visible.`);
        if (wrapper) wrapper.hidden = true;
        return;
      }

      embed.classList.add('calendly-inline-widget');
      embed.dataset.url = configuredUrl;
      embed.setAttribute('role', 'region');
      embed.setAttribute('aria-label', 'Calendly intro call scheduler');
      embed.textContent = 'Loading secure Calendly scheduler…';

      if (fallback) {
        setLink(fallback, configuredUrl, true);
      }

      if (wrapper) wrapper.hidden = false;
      loadCalendlyAssets();
    });
  }

  function getServiceFromUrl() {
    const service = new URLSearchParams(window.location.search).get('service');
    return SERVICE_OPTIONS[service] || SERVICE_OPTIONS.intro;
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function setHiddenValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  function updateUrl(serviceKey) {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    url.searchParams.set('service', serviceKey);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function setSelectedOfferCard(selectedService) {
    document.querySelectorAll('[data-selected-service-card]').forEach((card) => {
      const isSelected = card.id === selectedService.offerId;
      card.classList.toggle('selected-service-card', isSelected);

      if (isSelected) {
        card.setAttribute('aria-current', 'true');
      } else {
        card.removeAttribute('aria-current');
      }

      const action = card.querySelector('.btn');
      if (!action) return;

      if (isSelected) {
        action.setAttribute('aria-current', 'true');
      } else {
        action.removeAttribute('aria-current');
      }
    });
  }

  function applyServiceState(service, options) {
    const selectedService = SERVICE_OPTIONS[service] || SERVICE_OPTIONS.intro;
    const settings = options || {};
    activeServiceKey = selectedService.key;

    if (settings.updateUrl) {
      updateUrl(selectedService.key);
    }

    document.title = `${selectedService.shortLabel} Request | John Zarcaro`;

    setText('[data-selected-service-label]', selectedService.label);
    setText('[data-selected-service-price]', selectedService.price);
    setText('[data-selected-service-heading]', selectedService.heading);
    setText('[data-selected-service-message]', selectedService.message);
    setText('[data-selected-service-description]', selectedService.paymentDescription);
    setText('[data-selected-service-invoice]', selectedService.invoiceDescription);
    setText('[data-selected-service-submit]', selectedService.submitLabel);

    const serviceSelect = document.getElementById('service_interest');
    if (serviceSelect) serviceSelect.value = selectedService.key;

    setHiddenValue('selected_service_key', selectedService.key);
    setHiddenValue('selected_service_label', selectedService.label);
    setHiddenValue('selected_service_price', selectedService.price);

    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
      submitButton.dataset.defaultText = selectedService.submitLabel;
      submitButton.textContent = selectedService.submitLabel;
    }

    setSelectedOfferCard(selectedService);
  }

  function initializeServiceState() {
    if (!document.getElementById('lead-form')) return;

    applyServiceState(getServiceFromUrl().key);

    const serviceSelect = document.getElementById('service_interest');
    if (serviceSelect) {
      serviceSelect.addEventListener('change', () => {
        const selectedService = SERVICE_OPTIONS[serviceSelect.value] || SERVICE_OPTIONS.intro;
        applyServiceState(selectedService.key, { updateUrl: true });
      });
    }
  }

  function initializeLeadForm() {
    const leadForm = document.getElementById('lead-form');
    if (!leadForm) return;

    const submitButton = document.getElementById('submit-button');
    const formMessage = document.getElementById('form-message');
    const sentPanel = document.getElementById('sent-panel');
    const sendAnother = document.getElementById('send-another');

    leadForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      formMessage.className = 'form-message';
      formMessage.textContent = '';
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';

      const formData = new FormData(leadForm);
      const payload = Object.fromEntries(formData);

      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Submission failed.');
        }

        leadForm.reset();
        applyServiceState(activeServiceKey);
        leadForm.style.display = 'none';
        sentPanel.classList.add('active');
        formMessage.className = 'form-message success';
        formMessage.textContent = 'Request received. I will follow up with the next step.';
      } catch (error) {
        formMessage.className = 'form-message error';
        formMessage.textContent = 'The form did not submit. Please check the required fields and try again.';
        applyServiceState(activeServiceKey);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.defaultText || 'Request Intro Call';
      }
    });

    sendAnother.addEventListener('click', function () {
      sentPanel.classList.remove('active');
      formMessage.className = 'form-message';
      formMessage.textContent = '';
      leadForm.style.display = 'grid';
      applyServiceState(activeServiceKey);
    });
  }

  window.JohnBookingState = Object.freeze({
    reapply: () => applyServiceState(activeServiceKey),
    setService: (serviceKey) => applyServiceState(serviceKey, { updateUrl: true }),
    getService: () => activeServiceKey,
    options: SERVICE_OPTIONS
  });

  document.addEventListener('DOMContentLoaded', () => {
    configureLinks();
    configureCalendlyEmbeds();
    initializeServiceState();
    initializeLeadForm();
  });
})();
