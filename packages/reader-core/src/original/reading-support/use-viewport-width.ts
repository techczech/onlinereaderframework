import { useEffect, useState } from 'react';
/** Window width in CSS pixels (so browser zoom is already counted), kept current across resizes. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => typeof window === 'undefined' ? 1440 : window.innerWidth);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return width;
}
