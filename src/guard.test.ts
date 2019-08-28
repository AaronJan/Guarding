jest.mock('process');

import { Guard, GuardConstructorOptions } from './guard';
import { DefaultRoutineSignals } from './constants';
import { SupportedSignals } from './types';

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

// describe('Guard: process signals', () => {
//   let spiedProcess: jest.SpyInstance;

//   beforeEach(() => {
//     spiedProcess = jest.spyOn(process, 'on');
//     spiedProcess.mockImplementation(function (event, listener) {
//       return spiedProcess;
//     });
//   });

//   afterEach(() => {
//     spiedProcess.mockRestore();
//   });

//   it('', () => {



//   });


// });
