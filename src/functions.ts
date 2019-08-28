/**
 * Execute functions in serial (Wrap results in Promises if it's not).
 */
export async function executeInSerial<F extends Function, P>(funcs: F[], param: P): Promise<void> {
  await funcs.reduce(async (next, func): Promise<void> => {
    await next;
    const result = func(param);

    return result instanceof Promise ? result : Promise.resolve(result);
  }, Promise.resolve());
}
