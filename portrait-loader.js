(() => {
  const portrait = document.getElementById('john-portrait');
  if (!portrait) return;

  const parts = Array.from(
    { length: 7 },
    (_, index) => `assets/portrait-v11-part-${String(index + 1).padStart(2, '0')}.b64?v=14`
  );

  const reveal = () => {
    portrait.classList.remove('portrait-loading');
    portrait.classList.add('portrait-ready');
  };

  const showRealPhotoFallback = () => {
    portrait.onload = reveal;
    portrait.onerror = () => {
      portrait.style.display = 'none';
    };
    portrait.src = 'assets/john-photo-hq.webp?v=4';
  };

  Promise.all(
    parts.map(async (path) => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load ${path}`);
      return response.text();
    })
  )
    .then((chunks) => chunks.join('').replace(/\s+/g, ''))
    .then((encoded) => {
      if (!encoded.startsWith('/9j/') || encoded.length < 100000) {
        throw new Error('Portrait data is incomplete.');
      }

      portrait.onload = reveal;
      portrait.onerror = showRealPhotoFallback;
      portrait.src = `data:image/jpeg;base64,${encoded}`;
    })
    .catch(showRealPhotoFallback);
})();
