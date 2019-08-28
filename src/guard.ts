import { DefaultRoutineSignals } from './constants';
import { executeInSerial } from './functions';
import { SupportedSignals, RoutineCleanup, ExceptionCleanup } from './types';

export type SignalHandler = (signal: SupportedSignals) => void;
export type GeneralExceptionHandler = (err: Error | any) => void;
export type UncaughtExceptionHandler = (err: Error) => void;
export type UnhandledRejectionHandler = (reason: Error | any, promise: Promise<any>) => void;

export interface GuardConstructorOptions {
  routineCleanupEnabled: boolean,
  routineCleanupSignals?: SupportedSignals[],
  routineCleanups?: RoutineCleanup[],
  exceptionCleanupEnabled: boolean,
  exceptionCleanups?: ExceptionCleanup[],
}

/**
 * Guard
 */
export class Guard {

  private guarded: boolean;

  private routineCleanupEnabled: boolean;
  private routineCleanupSignals: SupportedSignals[];
  private routineCleanups: RoutineCleanup[];

  private exceptionCleanupEnabled: boolean;
  private exceptionCleanups: ExceptionCleanup[];

  private signalHandler?: SignalHandler;
  private signalHandlerExecuting: boolean;
  private generalExceptionHandler?: GeneralExceptionHandler;
  private uncaughtExceptionHandler?: UncaughtExceptionHandler;
  private unhandledRejectionHandler?: UnhandledRejectionHandler;
  private exceptionHandlerExecuting: boolean;

  constructor(options: GuardConstructorOptions) {
    this.routineCleanupEnabled = options.routineCleanupEnabled;
    this.routineCleanupSignals = options.routineCleanupSignals !== undefined ?
      options.routineCleanupSignals :
      DefaultRoutineSignals;
    this.routineCleanups = options.routineCleanups !== undefined ?
      options.routineCleanups :
      [];

    this.exceptionCleanupEnabled = options.exceptionCleanupEnabled;
    this.exceptionCleanups = options.exceptionCleanups !== undefined ?
      options.exceptionCleanups :
      [];

    this.guarded = false;
    this.signalHandlerExecuting = false;
    this.exceptionHandlerExecuting = false;
  }

  onRoutine(cleanup: RoutineCleanup) {
    if (this.routineCleanupEnabled === false) {
      throw new Error('Routine-Cleanup not enabled.');
    }
    this.routineCleanups.push(cleanup);

    return this;
  }

  onException(cleanup: ExceptionCleanup) {
    if (this.exceptionCleanupEnabled === false) {
      throw new Error('Exception-Cleanup not enabled.');
    }
    this.exceptionCleanups.push(cleanup);

    return this;
  }

  up(): void {
    if (this.guarded === true) {
      return;
    }
    this.guarded = true;

    if (this.routineCleanupEnabled === true) {
      if (this.routineCleanupSignals.length === 0) {
        throw new Error('You have to handle at least 1 process signal in order to use Routine-Cleanup.');
      }

      this.signalHandler = async (signal: SupportedSignals) => {
        if (this.signalHandlerExecuting === true || this.exceptionHandlerExecuting === true) {
          return;
        }
        this.signalHandlerExecuting = true;
        await executeInSerial(this.routineCleanups, signal);
        this.down();

        process.kill(process.pid, signal);
      };

      this.routineCleanupSignals.forEach(signal => {
        // We only support subset of all signals, so we have to type-cast the `signalHandler`
        process.on(signal, <(signal: string) => void>this.signalHandler);
      });
    }

    if (this.exceptionCleanupEnabled === true) {
      this.generalExceptionHandler = async (err) => {
        if (this.exceptionHandlerExecuting === true) {
          return;
        }
        this.exceptionHandlerExecuting = true;
        await executeInSerial(this.exceptionCleanups, err);
        this.down();

        // It's not safe to resume your normal application execution,
        // we have to shutdown this with an error exit code.
        process.exit(1);
      };

      this.uncaughtExceptionHandler = err =>
        (<GeneralExceptionHandler>this.generalExceptionHandler)(err);
      process.on('uncaughtException', this.uncaughtExceptionHandler);

      this.unhandledRejectionHandler = (reason, promise) =>
        (<GeneralExceptionHandler>this.generalExceptionHandler)(reason);
      process.on('unhandledRejection', this.unhandledRejectionHandler);
    }
  }

  down(): void {
    if (this.guarded === false) {
      return;
    }
    this.guarded = false;

    if (this.routineCleanupEnabled === true) {
      this.routineCleanupSignals.forEach(signal => {
        // We only support subset of all signals, so we have to type-cast the `signalHandler`
        process.removeListener(signal, <(signal: string) => void>this.signalHandler);
      });
    }

    if (this.exceptionCleanupEnabled === true) {
      process.removeListener('uncaughtException', <UncaughtExceptionHandler>this.uncaughtExceptionHandler);
      process.removeListener('unhandledRejection', <UnhandledRejectionHandler>this.unhandledRejectionHandler);
    }
  }

}
