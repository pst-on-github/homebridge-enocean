import { Logging } from 'homebridge';

export class StatusActiveWrapper {

  private _statusActive: boolean;
  private _timeoutId: NodeJS.Timeout | undefined;

  constructor(
    private readonly log: Logging,
    private readonly displayName: string,
    public readonly timeout_ms: number = (55 * 60 * 1000), // t = 55 minutes
    initialState: boolean = false,
  ) {
    this._statusActive = initialState;
  }

  get statusActive(): boolean {
    return this._statusActive;
  }

  statusActiveChanged: undefined | ((statusActive: boolean) => void);

  update() {
    if (this._timeoutId !== undefined) {
      clearTimeout(this._timeoutId);
    }

    if (this._statusActive === false) {
      this._statusActive = true;
      this.log.info(`${this.displayName}: ACTIVE (ONLINE)`);
      
      if (this.statusActiveChanged !== undefined) {
        this.statusActiveChanged(this._statusActive);
      }
    } 
 
    this._timeoutId = setTimeout(() => {
      this.log.warn(`${this.displayName}: NOT ACTIVE (TIMEOUT ${Math.floor(this.timeout_ms/1000)} s)`);
      this._statusActive = false;

      if (this.statusActiveChanged !== undefined) {
        this.statusActiveChanged(this._statusActive);
      }
    }, this.timeout_ms);
  }
}
  