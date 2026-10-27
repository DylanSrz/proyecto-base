/**
 * [ES] Tests de la máquina de estados. it.each ejecuta el mismo test con una tabla
 * de casos: 4 transiciones válidas y 9 inválidas (todas deben dar 409).
 */
import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MaintenanceStatus } from '../../common/enums/maintenance-status.enum.js';
import { assertTransition, canTransition } from './maintenance-transitions.js';

const { SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED } = MaintenanceStatus;

describe('maintenance transitions', () => {
  it.each([
    [SCHEDULED, IN_PROGRESS],
    [SCHEDULED, CANCELLED],
    [IN_PROGRESS, COMPLETED],
    [IN_PROGRESS, CANCELLED],
  ])('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([
    [SCHEDULED, COMPLETED],
    [SCHEDULED, SCHEDULED],
    [IN_PROGRESS, SCHEDULED],
    [COMPLETED, SCHEDULED],
    [COMPLETED, IN_PROGRESS],
    [COMPLETED, CANCELLED],
    [CANCELLED, IN_PROGRESS],
    [CANCELLED, COMPLETED],
    [CANCELLED, SCHEDULED],
  ])('rejects %s → %s with ConflictException', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(ConflictException);
  });

  it('explains why a completed maintenance cannot go back', () => {
    expect(() => assertTransition(COMPLETED, IN_PROGRESS)).toThrow(
      'Cannot change maintenance status from COMPLETED to IN_PROGRESS: a completed maintenance cannot go back to a previous status',
    );
  });

  it('explains that a maintenance must be started before completing it', () => {
    expect(() => assertTransition(SCHEDULED, COMPLETED)).toThrow(
      /must be IN_PROGRESS before it can be completed/,
    );
  });
});
