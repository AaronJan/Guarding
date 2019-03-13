export type CleanupResponse = any;

export interface SyncCleanup {
  (): CleanupResponse;
}

export interface AsyncCleanup {
  (): Promise<CleanupResponse>;
}

export interface ExceptionCleanup {
  (err: any): any;
}
