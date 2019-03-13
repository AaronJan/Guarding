export type CleanupResponse = void | boolean;

export interface SyncCleanup {
  (): CleanupResponse;
}

export interface AsyncCleanup {
  (): Promise<CleanupResponse>;
}

export interface ExceptionCleanup {
  (err: any): void;
}
