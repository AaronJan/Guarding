import {
  AsyncCleanup,
  SyncCleanup,
  ExceptionCleanup,
} from './interfaces';
import { default as createDebugger } from 'debug';

const debug = createDebugger('Guarding');

type ProcessSignalHandlerFunction = (signal: string) => void;
type ExitHandlerFunction = (code: number) => void;
type ExceptionHandlerFunction = (err: any) => void;

export class Guard {

  protected guarded = false;
  protected processSignalHandlerExecuted = false;
  protected routineCleanupExecuted = false;

  protected routineCleanups: Array<AsyncCleanup | SyncCleanup>;
  protected exitCleanups: Array<SyncCleanup>;
  protected exceptionCleanups: Array<ExceptionCleanup>;

  protected processSignalHandler: null | ProcessSignalHandlerFunction;
  protected exitHandler: null | ExitHandlerFunction;
  protected exceptionHandler: null | ExceptionHandlerFunction;

  constructor() {
    this.routineCleanups = [];
    this.exitCleanups = [];
    this.exceptionCleanups = [];

    this.processSignalHandler = null;
    this.exitHandler = null;
    this.exceptionHandler = null;
  }

  createTimer<T>(timeout: number, result: T) {
    return new Promise<T>((resolve, reject) => setTimeout(() => resolve(result), timeout));
  }

  getShutdownTimeoutForSignal(signal: string) {
    // Node.js will be unconditionally terminated by Windows about 10 seconds later when received 
    // 'SIGHUP' signal.
    if (process.platform === 'win32' && signal === 'SIGHUP') {
      return 6000;
    }

    // Otherwise, just wait for all cleanup executions.
    return 0;
  }

  protected executeCleanups<T, U>(
    cleanups: Array<(parameter: T) => (U | Promise<U>)>,
    parameter: T
  ) {
    return cleanups
      .map(cleanup => cleanup(parameter))
      .reduce((results: Promise<U>[], response) => {
        const promisified = response instanceof Promise ? response : Promise.resolve(response);
        results.push(promisified);

        return results;
      }, []);
  }

  protected executeRoutineCleanups() {
    if (this.routineCleanupExecuted === true) {
      debug(`routineCleanups already executed`);

      return [];
    }
    this.routineCleanupExecuted = true;

    debug(`execute routineCleanups, total: ${this.routineCleanups.length}`);

    return this.executeCleanups(this.routineCleanups, null);
  }

  protected async handleProcessSignal(signal: string) {
    debug(`[handleProcessSignal] signal: ${signal}`);

    if (this.processSignalHandlerExecuted === true) {
      return;
    }
    this.processSignalHandlerExecuted = true;

    const shutdownTimeout = this.getShutdownTimeoutForSignal(signal);
    debug(`shutdownTimeout: ${shutdownTimeout}`);

    const routineCleanupResults = this.executeRoutineCleanups();

    if (shutdownTimeout > 0) {
      await Promise.race([
        this.createTimer(shutdownTimeout, []),
        Promise.all(routineCleanupResults),
      ]);
    } else {
      await Promise.all(routineCleanupResults);
    }

    process.exit();
  }

  protected handleException(err: any) {
    debug(`[handleException] error: $O`, err);

    debug(`execute exceptionCleanups, total: ${this.exceptionCleanups.length}`);
    this.executeCleanups(this.exceptionCleanups, err);

    process.exit(1);
  }

  protected handleExit(code: number) {
    debug(`[handleExit] code: ${code}`);

    this.down();

    debug(`execute exitCleanups, total: ${this.exitCleanups.length}`);
    this.executeCleanups(this.exitCleanups, code);

    this.executeRoutineCleanups();
  }

  addRoutineCleanup(cleanup: AsyncCleanup | SyncCleanup) {
    this.routineCleanups.push(cleanup);
  }

  addExitCleanup(cleanup: SyncCleanup) {
    this.exitCleanups.push(cleanup);
  }

  addExceptionCleanup(cleanup: ExceptionCleanup) {
    this.exceptionCleanups.push(cleanup);
  }

  up() {
    if (this.guarded === true) {
      return;
    }

    debug(`Guard up`);

    this.processSignalHandlerExecuted = false;
    this.routineCleanupExecuted = false;

    this.processSignalHandler = <ProcessSignalHandlerFunction>this.handleProcessSignal.bind(this);
    this.exceptionHandler = <ExceptionHandlerFunction>this.handleException.bind(this);
    this.exitHandler = <ExitHandlerFunction>this.handleExit.bind(this);

    // 'SIGTERM' and 'SIGINT' have default handlers on non-Windows platforms that reset the 
    // terminal mode before exiting with code 128 + signal number. If one of these signals has a 
    // listener installed, its default behavior will be removed (Node.js will no longer exit).
    process.on('SIGINT', this.processSignalHandler);
    process.on('SIGTERM', this.processSignalHandler);

    process.on('SIGBREAK', this.processSignalHandler);
    process.on('SIGQUIT', this.processSignalHandler);

    // 'SIGHUP' is generated on Windows when the console window is closed, and on other platforms 
    // under various similar conditions. See signal(7). It can have a listener installed, however 
    // Node.js will be unconditionally terminated by Windows about 10 seconds later. On 
    // non-Windows platforms, the default behavior of SIGHUP is to terminate Node.js, but once a 
    // listener has been installed its default behavior will be removed.
    process.on('SIGHUP', this.processSignalHandler);

    // The correct use of 'uncaughtException' is to perform synchronous cleanup of allocated 
    // resources (e.g. file descriptors, handles, etc) before shutting down the process. It is not 
    // safe to resume normal operation after 'uncaughtException'.
    process.on('uncaughtException', this.exceptionHandler);

    // The 'exit' event is emitted when the Node.js process is about to exit as a result of either:
    //   * The process.exit() method being called explicitly;
    //   * The Node.js event loop no longer having any additional work to perform.
    process.on('exit', this.exitHandler);

    this.guarded = true;
  }

  down() {
    if (this.guarded === false) {
      return;
    }

    debug(`Guard down`);

    process.removeListener('SIGINT', <ProcessSignalHandlerFunction>this.processSignalHandler);
    process.removeListener('SIGTERM', <ProcessSignalHandlerFunction>this.processSignalHandler);
    process.removeListener('SIGBREAK', <ProcessSignalHandlerFunction>this.processSignalHandler);
    process.removeListener('SIGQUIT', <ProcessSignalHandlerFunction>this.processSignalHandler);
    process.removeListener('SIGHUP', <ProcessSignalHandlerFunction>this.processSignalHandler);

    process.removeListener('uncaughtException', <ExceptionHandlerFunction>this.exceptionHandler);

    process.removeListener('exit', <ExitHandlerFunction>this.exitHandler);

    this.guarded = false;
  }
}

export function createGuard() {
  return new Guard();
}
