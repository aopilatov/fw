export interface PerformLockConfig {
	retryCount?: number;
	retryDelay?: number;
	retryJitter?: number;
	ttl?: number;
	maxTtl?: number;
	doubleCheckLock?: boolean;
}
