/**
 * Input status flags shared by the pro forma calculator and the Method
 * page, so a label or chip class can only be changed in one place.
 */

export type InputStatus = 'VERIFIED' | 'VERIFIED_RANGE' | 'DERIVED' | 'ESTIMATE' | 'ASSUMPTION';

export const STATUS_LABEL: Record<InputStatus, string> = {
  VERIFIED: 'Verified',
  VERIFIED_RANGE: 'Verified range',
  DERIVED: 'Derived',
  ESTIMATE: 'Estimate',
  ASSUMPTION: 'Assumption',
};

/** Class names defined in SourcedProForma.css. */
export function statusChipClass(status: InputStatus): string {
  return `spf-chip spf-chip--${status.toLowerCase().replace('_', '-')}`;
}
