export type SupportedSignals = 'SIGTERM' | 'SIGINT' | 'SIGHUP' | 'SIGQUIT';

type CleanupResult = void | any;

export type RoutineCleanup = (signal: SupportedSignals) => Promise<CleanupResult> | CleanupResult;
export type ExceptionCleanup = (err: Error | any) => Promise<CleanupResult> | CleanupResult;
