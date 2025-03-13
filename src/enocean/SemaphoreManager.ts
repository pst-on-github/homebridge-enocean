
/**
 * Manages a set of semaphores, allowing for acquisition and release of semaphores.
 */
export class SemaphoreManager {
  private semaphores: boolean[];
  private length = 128;
  private idRangeError = 'Semaphore ID must be between 0 and 127';

  /**
   * Initializes a new instance of the SemaphoreManager class.
   */
  constructor() {
    this.semaphores = new Array(this.length).fill(false);
  }

  /**
   * Acquires a semaphore by its ID.
   * @param id - The ID of the semaphore to acquire.
   * @returns `true` if the semaphore was successfully acquired, `false` if it was already acquired.
   * @throws Will throw an error if the semaphore ID is out of range.
   */
  public acquire(id: number): boolean {
    if (id < 0 || id >= this.length) {
      throw new Error(this.idRangeError);
    }
    if (this.semaphores[id]) {
      return false; // Semaphore is already acquired
    }
    this.semaphores[id] = true;
    return true;
  }

  /**
   * Releases the semaphore with the given ID.
   * 
   * @param id - The ID of the semaphore to release. Must be within the valid range.
   * @throws {Error} If the ID is out of the valid range.
   */
  public release(id: number): void {
    if (id < 0 || id >= this.length) {
      throw new Error(this.idRangeError);
    }
    this.semaphores[id] = false;
  }

  /**
   * Checks if the semaphore with the given ID is acquired.
   *
   * @param id - The ID of the semaphore to check.
   * @returns `true` if the semaphore is acquired, otherwise `false`.
   * @throws {Error} If the ID is out of the valid range.
   */
  public isAcquired(id: number): boolean {
    if (id < 0 || id >= this.length) {
      throw new Error(this.idRangeError);
    }
    return this.semaphores[id];
  }

  /**
   * Resets all semaphores by setting their values to `false`.
   */
  public reset(): void {
    this.semaphores.fill(false);
  }

  /**
   * Acquires the next available semaphore.
   * 
   * This method searches for the next free semaphore in the `semaphores` array.
   * If a free semaphore is found, it is marked as acquired (set to `true`) and its index is returned.
   * If no free semaphore is available, the method returns `undefined`.
   * 
   * @returns {number | undefined} The index of the next free semaphore, or `undefined` if no semaphore is available.
   */
  public acquireNextFreeSemaphore(): number | undefined {
    const nextFreeIndex = this.semaphores.findIndex(semaphore => !semaphore);
    if (nextFreeIndex !== -1) {
      this.semaphores[nextFreeIndex] = true;
      return nextFreeIndex;
    }

    return undefined;
  }
}
