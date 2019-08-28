import { SupportedSignals, RoutineCleanup, ExceptionCleanup } from './types';
import { DefaultRoutineSignals, ExtendedRoutineSignals } from './constants';
import { Guard } from './guard';

type SignalPresets = 'default' | 'extended';

export interface CreateGuardOptions {
  routineCleanupEnabled: boolean,
  signals?: SignalPresets | SupportedSignals[],
  routineCleanups?: RoutineCleanup[],
  exceptionCleanupEnabled: boolean,
  exceptionCleanups?: ExceptionCleanup[],
}

export function createGuard(options: CreateGuardOptions) {
  return new Guard({
    routineCleanupEnabled: options.routineCleanupEnabled,
    exceptionCleanupEnabled: options.exceptionCleanupEnabled,
    routineCleanupSignals: getRoutineSignalsForOptions(options),
    routineCleanups: options.routineCleanups !== undefined ? options.routineCleanups : [],
    exceptionCleanups: options.exceptionCleanups !== undefined ? options.exceptionCleanups : [],
  });
}

export function getRoutineSignalsForOptions(options: CreateGuardOptions): SupportedSignals[] {
  if (options.routineCleanupEnabled === false) {
    return [];
  }

  if (Array.isArray(options.signals)) {
    return options.signals;
  }

  const preset = options.signals !== undefined ? options.signals : 'default';
  switch (preset) {
    case 'default':
      return DefaultRoutineSignals;
      break;
    case 'extended':
      return ExtendedRoutineSignals;
      break;
    default:
      throw new Error('Undefined signal preset (should be one of: `default`, `extended`).');
  }
}
