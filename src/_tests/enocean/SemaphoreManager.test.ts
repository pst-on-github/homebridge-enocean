import { SemaphoreManager } from '../../enocean/SemaphoreManager';

describe('SemaphoreManager', () => {
  let semaphoreManager: SemaphoreManager;

  beforeEach(() => {
    semaphoreManager = new SemaphoreManager();
  });

  test('should acquire a semaphore successfully', () => {
    expect(semaphoreManager.acquire(0)).toBe(true);
    expect(semaphoreManager.isAcquired(0)).toBe(true);
  });

  test('should not acquire an already acquired semaphore', () => {
    semaphoreManager.acquire(0);
    expect(semaphoreManager.acquire(0)).toBe(false);
  });

  test('should release a semaphore successfully', () => {
    semaphoreManager.acquire(0);
    semaphoreManager.release(0);
    expect(semaphoreManager.isAcquired(0)).toBe(false);
  });

  test('should throw an error when acquiring a semaphore with an invalid ID', () => {
    expect(() => semaphoreManager.acquire(-1)).toThrow('Semaphore ID must be between 0 and 127');
    expect(() => semaphoreManager.acquire(128)).toThrow('Semaphore ID must be between 0 and 127');
  });

  test('should throw an error when releasing a semaphore with an invalid ID', () => {
    expect(() => semaphoreManager.release(-1)).toThrow('Semaphore ID must be between 0 and 127');
    expect(() => semaphoreManager.release(128)).toThrow('Semaphore ID must be between 0 and 127');
  });

  test('should reset all semaphores', () => {
    semaphoreManager.acquire(0);
    semaphoreManager.acquire(1);
    semaphoreManager.reset();
    expect(semaphoreManager.isAcquired(0)).toBe(false);
    expect(semaphoreManager.isAcquired(1)).toBe(false);
  });

  test('should acquire the next free semaphore', () => {
    expect(semaphoreManager.acquireNextFreeSemaphore()).toBe(0);
    expect(semaphoreManager.isAcquired(0)).toBe(true);
    expect(semaphoreManager.acquireNextFreeSemaphore()).toBe(1);
    expect(semaphoreManager.isAcquired(1)).toBe(true);
  });

  test('should return undefined when no free semaphore is available', () => {
    for (let i = 0; i < 128; i++) {
      semaphoreManager.acquire(i);
    }
    expect(semaphoreManager.acquireNextFreeSemaphore()).toBeUndefined();
  });
});