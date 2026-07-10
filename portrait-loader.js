(() => {
  const portrait = document.getElementById('john-portrait');
  if (!portrait) return;

  const parts = Array.from(
    { length: 7 },
    (_, index) => `assets/portrait-v11-part-${String(index + 1).padStart(2, '0')}.b64?v=13`
  );

  const reveal = () => {
    portrait.classList.remove('portrait-loading');
    portrait.classList.add('portrait-ready');
  };

  const showFallback = () => {
    portrait.onload = reveal;
    portrait.onerror = () => {
      portrait.style.display = 'none';
    };
    portrait.src = 'assets/john-hero-avatar.svg?v=1';
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

      const validJpeg =
        bytes.length === 91422 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[bytes.length - 2] === 0xff &&
        bytes[bytes.length - 1] === 0xd9;

      if (!validJpeg) {
        throw new Error('Portrait data failed validation.');
      }

      const objectUrl = URL.createObjectURL(
        new Blob([bytes], { type: 'image/jpeg' })
      );
      const testImage = new Image();

      testImage.onload = () => {
        if (testImage.naturalWidth !== 600 || testImage.naturalHeight !== 750) {
          URL.revokeObjectURL(objectUrl);
          showFallback();
          return;
        }

        portrait.onload = () => {
          reveal();
          URL.revokeObjectURL(objectUrl);
        };
        portrait.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          showFallback();
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
