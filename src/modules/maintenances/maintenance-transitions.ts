import { ConflictException } from '@nestjs/common';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';

const { SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED } = MaintenanceStatus;

/**
 * Maintenance lifecycle. Anything not listed here is an invalid transition:
 * COMPLETED and CANCELLED are final states, and a maintenance has to be
 * IN_PROGRESS before it can be COMPLETED.
 */
export const ALLOWED_TRANSITIONS: Record<
  MaintenanceStatus,
  readonly MaintenanceStatus[]
> = {
  [SCHEDULED]: [IN_PROGRESS, CANCELLED],
  [IN_PROGRESS]: [COMPLETED, CANCELLED],
  [COMPLETED]: [],
  [CANCELLED]: [],
};

export const canTransition = (from: MaintenanceStatus, to: MaintenanceStatus) =>
  ALLOWED_TRANSITIONS[from].includes(to);

/** Throws 409 with a descriptive message when the transition is not allowed. */
export function assertTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): void {
  if (canTransition(from, to)) return;

  const base = `Cannot change maintenance status from ${from} to ${to}`;
  let reason: string;
  if (from === to) reason = `the maintenance is already ${to}`;
  else if (from === COMPLETED)
    reason = 'a completed maintenance cannot go back to a previous status';
  else if (from === CANCELLED) reason = 'a cancelled maintenance is closed';
  else if (from === SCHEDULED && to === COMPLETED)
    reason = 'the maintenance must be IN_PROGRESS before it can be completed';
  else reason = `allowed: ${ALLOWED_TRANSITIONS[from].join(', ')}`;

  throw new ConflictException(`${base}: ${reason}`);
}
