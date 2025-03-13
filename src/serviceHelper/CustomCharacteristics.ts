import { API, Characteristic, CharacteristicValue, Service } from 'homebridge';
import { HistoryService } from './HistoryServiceFactory';

export class CustomCharacteristics {
  
  private readonly _api: API;
  private _lastActivation: Characteristic | undefined;

  constructor(api: API) {
    this._api = api; 
  }

  get LastActivation() {
    if (this._lastActivation === undefined) {
      this._lastActivation = new this._api.hap.Characteristic('LastActivation', 'E863F11A-079E-48FF-8F27-9C2605A29F52', {
        format: this._api.hap.Formats.UINT32,
        perms: [this._api.hap.Perms.PAIRED_READ],
      });
    }
    return this._lastActivation;
  }
}

export class fakegatoCharacteristicsExample {

  private _lastActivation: number;
  private _state;

  constructor(
    private service: Service,
    private customCharacteristics: CustomCharacteristics,
  ) { 

    this._lastActivation = Math.floor(Date.now() / 1000);
    this._state = 0;
  }

  // fakegato characteristics
  addFakegatoCharacteristics(historyService: HistoryService) {

    let c = this.service.getCharacteristic('LastActivation');

    if (c === undefined) {
      c = this.service.addCharacteristic(this.customCharacteristics.LastActivation);
    }

    c.onGet(async (): Promise<CharacteristicValue> => {
      let time = historyService.getInitialTime();
      if (time === undefined) {
        const entry = { time: this._lastActivation, status: this._state };
        historyService.addEntry(entry);
      }

      time = this._lastActivation - historyService.getInitialTime();

      console.log('GET LAST ACTIVATION', time);

      return time;
    });
  }
}
