export type SuspiciousFlags = {
  unnaturalMouseMoves: boolean;
  bigClipboardPaste: boolean;
  lowFPSDetected: boolean;
  delayedClickDetected: boolean;
};

type SuspicionCallback = (flags: SuspiciousFlags) => void;

export function monitorRemoteControlSuspicion(onSuspiciousDetected: SuspicionCallback): void {
  try {
    const flags: SuspiciousFlags = {
      unnaturalMouseMoves: false,
      bigClipboardPaste: false,
      lowFPSDetected: false,
      delayedClickDetected: false,
    };

    const previousFlags: SuspiciousFlags = {...flags};

    function hasChanged(): boolean {
      return (
        flags.unnaturalMouseMoves !== previousFlags.unnaturalMouseMoves ||
        flags.bigClipboardPaste !== previousFlags.bigClipboardPaste ||
        flags.lowFPSDetected !== previousFlags.lowFPSDetected ||
        flags.delayedClickDetected !== previousFlags.delayedClickDetected
      );
    }

    function triggerIfChanged(): void {
      try {
        if (hasChanged()) {
          previousFlags.unnaturalMouseMoves = flags.unnaturalMouseMoves;
          previousFlags.bigClipboardPaste = flags.bigClipboardPaste;
          previousFlags.lowFPSDetected = flags.lowFPSDetected;
          previousFlags.delayedClickDetected = flags.delayedClickDetected;
          onSuspiciousDetected({...flags});
        }
      } catch {
      }
    }

    let lastX: number | null = null;
    let lastY: number | null = null;
    let unnaturalCount = 0;

    window.addEventListener('mousemove', (e: MouseEvent) => {
      try {
        if (lastX !== null && lastY !== null) {
          const dx = Math.abs(e.clientX - lastX);
          const dy = Math.abs(e.clientY - lastY);
          if ((dx > 100 || dy > 100) || (dx === 0 && dy === 0)) unnaturalCount++;
          if (unnaturalCount > 5 && !flags.unnaturalMouseMoves) {
            flags.unnaturalMouseMoves = true;
            triggerIfChanged();
          }
        }
        lastX = e.clientX;
        lastY = e.clientY;
      } catch {
      }
    });

    window.addEventListener('paste', (e: Event) => {
      try {
        const clipboardEvent = e as ClipboardEvent;
        const text = clipboardEvent.clipboardData?.getData('text') || '';
        if (text.length > 5000 && !flags.bigClipboardPaste) {
          flags.bigClipboardPaste = true;
          triggerIfChanged();
        }
      } catch {

      }
    });

    document.addEventListener('click', () => {
      try {
        const start = performance.now();
        setTimeout(() => {
          try {
            const delay = performance.now() - start;
            if (delay > 150 && !flags.delayedClickDetected) {
              flags.delayedClickDetected = true;
              triggerIfChanged();
            }
          } catch {
          }
        }, 0);
      } catch {
      }
    });

    let lastFrame = performance.now();
    let lowFPSCount = 0;

    function monitorFPS(): void {
      try {
        const now = performance.now();
        const delta = now - lastFrame;
        if (delta > 250) lowFPSCount++;
        if (lowFPSCount > 10 && !flags.lowFPSDetected) {
          flags.lowFPSDetected = true;
          triggerIfChanged();
        }
        lastFrame = now;
      } catch {
      }
      requestAnimationFrame(monitorFPS);
    }

    monitorFPS();
  } catch {
  }
}
