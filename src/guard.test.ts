jest.mock('process');

import { Guard, GuardConstructorOptions } from './guard';
import { DefaultRoutineSignals } from './constants';
import { SupportedSignals, RoutineCleanup } from './types';

describe('Guard', () => {
  test('constructing without optional options', () => {
    const options: GuardConstructorOptions = {
      routineCleanupEnabled: true,
      exceptionCleanupEnabled: true,
    };
    const guard = new Guard(options);

    expect(Reflect.get(guard, 'routineCleanupEnabled')).toBeTruthy();
    expect(Reflect.get(guard, 'routineCleanupSignals')).toEqual(DefaultRoutineSignals);
    expect(Reflect.get(guard, 'routineCleanups')).toEqual([]);

    expect(Reflect.get(guard, 'exceptionCleanupEnabled')).toBeTruthy();
    expect(Reflect.get(guard, 'exceptionCleanups')).toEqual([]);
  });

  test('constructing with all options', () => {
    const routineCleanups = [() => 'routine'];
    const exceptionCleanups = [() => 'exception'];
    const options: GuardConstructorOptions = {
      routineCleanupEnabled: true,
      routineCleanupSignals: ['SIGINT', 'SIGTERM'],
      routineCleanups,
      exceptionCleanupEnabled: true,
      exceptionCleanups,
    };
    const guard = new Guard(options);

    expect(Reflect.get(guard, 'routineCleanupEnabled')).toBeTruthy();
    expect(Reflect.get(guard, 'routineCleanupSignals')).toEqual(['SIGINT', 'SIGTERM']);
    expect(Reflect.get(guard, 'routineCleanups')).toBe(routineCleanups);

    expect(Reflect.get(guard, 'exceptionCleanupEnabled')).toBeTruthy();
    expect(Reflect.get(guard, 'exceptionCleanups')).toBe(exceptionCleanups);
  });
});

describe('Guard: register cleanups', () => {
  function createGuard(): Guard {
    const options: GuardConstructorOptions = {
      routineCleanupEnabled: true,
      exceptionCleanupEnabled: true,
    };
    const guard = new Guard(options);

    return guard;
  }

  test('register routine cleanups', () => {
    const cleanup = (signal: SupportedSignals) => 1;
    const guard = createGuard();

    guard.onRoutine(cleanup);
    expect(Reflect.get(guard, 'routineCleanups')).toStrictEqual([cleanup]);
  });
});

describe('Guard: process signals', () => {
  function createGuard(routines: RoutineCleanup[]): Guard {
    const options: GuardConstructorOptions = {
      routineCleanupEnabled: true,
      routineCleanupSignals: [
        'SIGHUP',
        'SIGINT',
        'SIGQUIT',
        'SIGTERM',
      ],
      routineCleanups: routines,
      exceptionCleanupEnabled: false,
    };
    const guard = new Guard(options);

    return guard;
  }

  function runAfterTimes(fn: Function, times: number): Function {
    let total = 0;
    return () => {
      total++;
      if (total === times) {
        fn();
      }
    };
  }

  it('should handle signal correctly', () => {
    return new Promise(resolve => {
      const timedResolve = runAfterTimes(resolve, 3);

      const signal = 'SIGHUP';
      let signalListener: Function;

      let guardDown: jest.SpyInstance;

      const originalProcessPid = process.pid;
      Object.defineProperty(process, 'pid', {
        value: 1000,
      });
      const processOn: jest.SpyInstance = jest.spyOn(process, 'on');
      processOn.mockImplementation(function (event, listener) {
        if (signalListener === undefined) {
          signalListener = listener;
        }

        return processOn;
      });
      const processKill = jest.spyOn(process, 'kill');
      processKill.mockImplementation((pid, calledSignal) => {
        expect(guardDown).toBeCalled();

        expect(pid).toEqual(1000);
        expect(calledSignal).toBe(signal);

        timedResolve();

        // Restore all mocks.
        guardDown.mockRestore();
        processOn.mockRestore();
        processKill.mockRestore();
        Object.defineProperty(process, 'pid', {
          value: originalProcessPid,
        });
      });

      let routineCallHistory = [];
      const routine1: RoutineCleanup = jest.fn().mockImplementation((calledSignal) => {
        expect(calledSignal).toBe(signal);
        expect(routineCallHistory).toEqual([]);
        routineCallHistory.push('routine1');

        timedResolve();
      });
      const routine2: RoutineCleanup = jest.fn().mockImplementation((calledSignal) => {
        expect(calledSignal).toBe(signal);
        expect(routineCallHistory).toEqual(['routine1']);
        routineCallHistory.push('routine2');

        timedResolve();
      });
      const guard = createGuard([routine1, routine2]);
      guardDown = jest.spyOn(guard, 'down').mockReturnValue();
      guard.up();

      expect(processOn).toBeCalledTimes(4);
      expect(processOn.mock.calls[0]).toEqual(['SIGHUP', signalListener]);
      expect(processOn.mock.calls[1]).toEqual(['SIGINT', signalListener]);
      expect(processOn.mock.calls[2]).toEqual(['SIGQUIT', signalListener]);
      expect(processOn.mock.calls[3]).toEqual(['SIGTERM', signalListener]);

      signalListener(signal);
    });
  });


});
