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
      'complete-package': 'Complete Education Package - $799',
      custom: 'Custom education for a family or group',
      intro: 'Intro Crypto Education - $249'
    };

    if (!values[service]) return;

    Array.from(serviceSelect.options).forEach((option) => {
      if (option.textContent === values[service]) {
        option.selected = true;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    configureLinks();
    configureCalendlyEmbeds();
    applyServiceQueryDefaults();
  });
})();
