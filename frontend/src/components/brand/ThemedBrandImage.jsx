import { useEffect, useState } from 'react';
import { usePreferences } from '../../context/PreferencesContext';

const cache = new Map();

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

/**
 * Brand PNGs use white letters that disappear on light backgrounds.
 * In light mode, replace near-white pixels with a brand blue, drop the dark
 * counters inside letters (o, A, g, e) and cache the result.
 */
export default function ThemedBrandImage({ src, alt = '', className = '', blue = '#1e3a8a' }) {
  const { theme } = usePreferences();
  const [resolvedSrc, setResolvedSrc] = useState(src);

  useEffect(() => {
    if (theme !== 'light') {
      setResolvedSrc(src);
      return undefined;
    }

    const key = `${src}:${blue}`;
    if (cache.has(key)) {
      setResolvedSrc(cache.get(key));
      return undefined;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const [rTarget, gTarget, bTarget] = hexToRgb(blue);
      const data = pixels.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 232 && g > 232 && b > 232) {
          data[i] = rTarget;
          data[i + 1] = gTarget;
          data[i + 2] = bTarget;
        } else if (r <= 90 && g <= 90 && b <= 90) {
          // Dark counters/shadows look like filled holes on a light background.
          data[i + 3] = 0;
        }
      }
      context.putImageData(pixels, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      cache.set(key, dataUrl);
      if (!cancelled) setResolvedSrc(dataUrl);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, theme, blue]);

  return <img src={resolvedSrc} alt={alt} className={className} />;
}
