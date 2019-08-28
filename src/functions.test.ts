import * as functions from './functions';

describe('executeInSerial', () => {
  it('execute 1 non-promise-based function', async () => {
    const func1 = jest.fn((param) => 1);
    await functions.executeInSerial([func1], 20);

    expect(func1.mock.calls.length).toBe(1);
    expect(func1.mock.calls[0].length).toBe(1);
    expect(func1.mock.calls[0][0]).toBe(20);
  });

  it('execute 2 non-promise-based functions', async () => {
    const callOrders: number[] = [];

    const func1 = jest.fn((param) => {
      callOrders.push(1);
    });
    const func2 = jest.fn((param) => {
      callOrders.push(2);
    });

    await functions.executeInSerial([func1, func2], 20);

    expect(func1.mock.calls.length).toBe(1);
    expect(func1.mock.calls[0].length).toBe(1);
    expect(func1.mock.calls[0][0]).toBe(20);

    expect(func2.mock.calls.length).toBe(1);
    expect(func2.mock.calls[0].length).toBe(1);
    expect(func2.mock.calls[0][0]).toBe(20);

    expect(callOrders).toEqual([1, 2]);
  });

  it('execute 1 promise-based function', async () => {
    const func1 = jest.fn((param) => Promise.resolve(1));
    await functions.executeInSerial([func1], 20);

    expect(func1.mock.calls.length).toBe(1);
    expect(func1.mock.calls[0].length).toBe(1);
    expect(func1.mock.calls[0][0]).toBe(20);
  });

  it('execute 2 promise-based functions', async () => {
    const callOrders: number[] = [];

    const func1 = jest.fn((param) => {
      callOrders.push(1);
      return Promise.resolve(1);
    });
    const func2 = jest.fn((param) => {
      callOrders.push(2);
      return Promise.resolve(2);
    });

    await functions.executeInSerial([func1, func2], 20);

    expect(func1.mock.calls.length).toBe(1);
    expect(func1.mock.calls[0].length).toBe(1);
    expect(func1.mock.calls[0][0]).toBe(20);

    expect(func2.mock.calls.length).toBe(1);
    expect(func2.mock.calls[0].length).toBe(1);
    expect(func2.mock.calls[0][0]).toBe(20);

    expect(callOrders).toEqual([1, 2]);
  });

  it('execute promise-based functions in serial', async () => {
    let func1IsExecuting = false;

    const func1 = jest.fn((param) => {
      func1IsExecuting = true;

      return new Promise(resolve => {
        setTimeout(() => {
          func1IsExecuting = false;
          resolve(1);
        }, 50);
      });
    });
    const func2 = jest.fn((param) => {
      expect(func1IsExecuting).toBeFalsy();

      return Promise.resolve(2);
    });

    await functions.executeInSerial([func1, func2], 20);

    expect(func1.mock.calls.length).toBe(1);
    expect(func1.mock.calls[0].length).toBe(1);
    expect(func1.mock.calls[0][0]).toBe(20);

    expect(func2.mock.calls.length).toBe(1);
    expect(func2.mock.calls[0].length).toBe(1);
    expect(func2.mock.calls[0][0]).toBe(20);
  });

  it('execute functions in serial whether it\'s promise-based or not', async () => {
    const callOrders: number[] = [];

    const func1 = jest.fn((param) => {
      return new Promise(resolve => {
        setTimeout(() => {
          callOrders.push(1);
          resolve(1);
        }, 50);
      });
    });
    const func2 = jest.fn((param) => {
      callOrders.push(2);
      return Promise.resolve(2);
    });
    const func3 = jest.fn((param) => {
      callOrders.push(3);
      return 3;
    });

    await functions.executeInSerial([func1, func2, func3], 30);

    expect(func1.mock.calls.length).toBe(1);
    expect(func1.mock.calls[0].length).toBe(1);
    expect(func1.mock.calls[0][0]).toBe(30);

    expect(func2.mock.calls.length).toBe(1);
    expect(func2.mock.calls[0].length).toBe(1);
    expect(func2.mock.calls[0][0]).toBe(30);

    expect(func3.mock.calls.length).toBe(1);
    expect(func3.mock.calls[0].length).toBe(1);
    expect(func3.mock.calls[0][0]).toBe(30);

    expect(callOrders).toEqual([1, 2, 3]);
  });
});
