import { SupportedSignals } from './types';

export const DefaultRoutineSignals: SupportedSignals[] = [
  'SIGTERM',
  'SIGHUP',
  'SIGINT',
];
export const ExtendedRoutineSignals: SupportedSignals[] = [
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'SIGQUIT',
];