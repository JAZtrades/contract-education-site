(() => {
  const portrait = document.getElementById('john-portrait');
  if (!portrait) return;

  const parts = Array.from(
    { length: 7 },
    (_, index) => `assets/portrait-v11-part-${String(index + 1).padStart(2, '0')}.b64?v=12`
  );

  const showFallback = () => {
    portrait.src = 'assets/john-photo.jpg?v=3';
    portrait.classList.remove('portrait-loading');
    portrait.classList.add('portrait-ready');
  };

  Promise.all(
    parts.map(async (path) => {
      const response = await fetch(path, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Unable to load ${path}`);
      return response.text();
    })
  )
    .then((chunks) => chunks.join('').replace(/\s+/g, ''))
    .then((encoded) => {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }

      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      const testImage = new Image();

      testImage.onload = () => {
        portrait.onload = () => {
          portrait.classList.remove('portrait-loading');
          portrait.classList.add('portrait-ready');
          URL.revokeObjectURL(objectUrl);
        };
        portrait.src = objectUrl;
      };

      testImage.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        showFallback();
      };

      testImage.src = objectUrl;
    })
    .catch(showFallback);
})();
