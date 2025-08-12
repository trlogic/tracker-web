/**
 * Suspicious activity flags
 */

export interface SuspiciousFlags {
  unnaturalMouseMoves:  boolean;
  bigClipboardPaste:    boolean;
  lowFPSDetected:       boolean;
  delayedClickDetected: boolean;
}
