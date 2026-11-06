import { useCallback } from 'react';

/**
 * Closes the tooltip of the chart in `area` the way a mouse leaving it would:
 * Recharts keeps a tooltip opened by touch until then. React turns this
 * mouseout towards <body> into the chart's mouse leave.
 */
function closeTooltip(area: HTMLElement) {
  area.querySelector('.recharts-wrapper')?.dispatchEvent(
    new MouseEvent('mouseout', {
      bubbles: true,
      relatedTarget: document.body,
    }),
  );
}

/**
 * Makes a touched chart tooltip go away: a press anywhere outside the chart
 * closes it, as does going back. A press on the chart picks another bar or
 * point, as before. Returns a ref for an element around the chart; it hooks
 * up when that element appears, after the loading skeleton.
 */
export function useChartTooltip() {
  return useCallback((area: HTMLDivElement | null) => {
    if (!area) return;
    let isOpen = false;

    const open = () => {
      isOpen = true;
    };
    const close = () => {
      if (!isOpen) return;
      isOpen = false;
      closeTooltip(area);
    };
    const closeIfOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && area.contains(event.target)) return;
      close();
    };

    area.addEventListener('pointerdown', open);
    document.addEventListener('pointerdown', closeIfOutside, true);
    window.addEventListener('popstate', close);
    return () => {
      area.removeEventListener('pointerdown', open);
      document.removeEventListener('pointerdown', closeIfOutside, true);
      window.removeEventListener('popstate', close);
    };
  }, []);
}
