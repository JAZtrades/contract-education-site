(function () {
  'use strict';

  const config = window.JOHN_SITE_INTEGRATIONS || {};
  const warned = new Set();

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

  function applyServiceQueryDefaults() {
    const serviceSelect = document.getElementById('service_interest');
    if (!serviceSelect) return;

    const params = new URLSearchParams(window.location.search);
    const service = params.get('service');
    const values = {
      'complete-package': {
        option: 'Complete Education Package - $799',
        heading: 'Request the Complete Cryptocurrency Education Package',
        message: 'You selected the $799 complete package path. John will confirm the agreement and send the two client-specific Stripe invoices: $399.50 after signing and $399.50 before session two.',
        button: 'Request the Complete Package',
        offerBadge: 'Complete package',
        offerTitle: 'Complete Cryptocurrency Education Package',
        offerDetail: 'Three private sessions · up to four total hours',
        offerPrice: '$799',
        offerButton: 'Request the Complete Package',
        offerHref: 'schedule.html?service=complete-package#lead-form',
        offerNote: 'The complete package uses two client-specific Stripe invoices: $399.50 after signing and $399.50 before session two.'
      },
      custom: {
        option: 'Custom education for a family or group',
        heading: 'Request a Custom Cryptocurrency Education Plan',
        message: 'You selected the custom plan path. John will confirm the written scope and send a client-specific Stripe invoice for the approved custom amount.',
        button: 'Request a Custom Plan',
        offerBadge: 'Custom scope',
        offerTitle: 'Custom Cryptocurrency Education',
        offerDetail: 'Scope and price confirmed before payment',
        offerPrice: 'Custom',
        offerButton: 'Request a Custom Plan',
        offerHref: 'schedule.html?service=custom#lead-form',
        offerNote: 'Custom education uses a written scope and a client-specific Stripe invoice for the approved amount.'
      },
      intro: {
        option: 'Intro Crypto Education - $249',
        heading: 'Request the Private Cryptocurrency Education Session',
        message: 'You selected the $249 private session path. If the paid Calendly link is not configured yet, use this form and John will confirm the agreement before payment.',
        button: 'Request the $249 Session',
        offerBadge: 'Private session',
        offerTitle: 'Private Cryptocurrency Education Session',
        offerDetail: 'Up to 90 minutes',
        offerPrice: '$249',
        offerButton: 'Book and Pay Securely',
        offerHref: 'schedule.html?service=intro#lead-form',
        offerNote: 'Available after the service scope and agreement are confirmed. Payment is processed securely through Stripe. John does not receive or store your card details.'
      }
    };

    const selected = values[service];
    if (!selected) return;

    Array.from(serviceSelect.options).forEach((option) => {
      if (option.textContent === selected.option) {
        option.selected = true;
      }
    });

    const heading = document.getElementById('request-form-heading');
    if (heading) {
      heading.textContent = selected.heading;
    }

    const intent = document.getElementById('service-intent-message');
    if (intent) {
      intent.textContent = selected.message;
      intent.hidden = false;
    }

    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
      submitButton.textContent = selected.button;
      submitButton.dataset.defaultText = selected.button;
    }

    const offerBadge = document.getElementById('selected-offer-badge');
    if (offerBadge) offerBadge.textContent = selected.offerBadge;

    const offerTitle = document.getElementById('selected-offer-title');
    if (offerTitle) offerTitle.textContent = selected.offerTitle;

    const offerDetail = document.getElementById('selected-offer-detail');
    if (offerDetail) offerDetail.textContent = selected.offerDetail;

    const offerPrice = document.getElementById('selected-offer-price');
    if (offerPrice) offerPrice.textContent = selected.offerPrice;

    const offerNote = document.getElementById('selected-offer-note');
    if (offerNote) offerNote.textContent = selected.offerNote;

    const offerLink = document.getElementById('selected-offer-link');
    if (offerLink) {
      offerLink.textContent = selected.offerButton;

      if (service === 'intro') {
        offerLink.dataset.integrationFallbackUrl = selected.offerHref;
        return;
      }

      offerLink.setAttribute('href', selected.offerHref);
      offerLink.removeAttribute('data-integration-link');
      offerLink.removeAttribute('data-integration-fallback-url');
      offerLink.removeAttribute('data-integration-target');
      offerLink.removeAttribute('target');
      offerLink.removeAttribute('rel');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    configureLinks();
    configureCalendlyEmbeds();
    applyServiceQueryDefaults();
  });
})();
