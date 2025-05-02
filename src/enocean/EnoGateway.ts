import { Logging } from 'homebridge';
import * as fs from 'fs';

import * as EnOCore from 'enocean-core';

import { EepParserFactory } from '../eepParser/ParserFactory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { SemaphoreManager } from './SemaphoreManager';
import { InMemoryDeviceInfoMap } from './InMemoryDeviceInfoMap';
import { EepParser_D1_Eltako } from '../eepParser/EepParser_D1_Eltako';
import { Util } from '../util';
import { ParsedMessage } from '../eepParser/ParsedMessage';
import { EnoMessageFactory } from './EnoMessageFactory';
import { TelegramQueue } from './TelegramQueue';

type MessageListener = (eepMessage: ParsedMessage) => void

class AccessoryLink {

  constructor(
    public readonly config: DeviceConfig,
    public readonly eepMessageReceived: MessageListener,
  ) { }
}

/**
 * EnoGateway 
 * This class is supposed to extent the EnoCore Gateway class
 * mainly to dispatch received messages.
 */
export class EnoGateway {

  private _coreGateway: EnOCore.Gateway | undefined;
  private _serialPortPath: string;
  private _log: Logging;
  private _eepParserFactory = new EepParserFactory();

  private readonly _registeredEnoAccessories: Map<string, AccessoryLink> = new Map();

  private _baseId: EnOCore.DeviceId | undefined;
  private _senderIdManager = new SemaphoreManager();

  private readonly _sendQueue: TelegramQueue;

  /**
   * Creates an instance of EnoGateway.
   * 
   * @param serialPortPath - The path to the serial port.
   * @param log - The logging instance.
   */
  constructor(
    private serialPortPath: string,
    private isAutoCreateEnabled: boolean,
    private log: Logging,
  ) {
    this._serialPortPath = serialPortPath;
    this._log = log;

    this._sendQueue = new TelegramQueue(
      this.sendErp1TelegramIntern.bind(this),
      this.log,
    );

    // Reserve offset 0 for this gateway
    this._senderIdManager.acquire(0);
  }

  /**
   * Subscribe to the DeviceTeachIn Event
   * @param listener the listener to be called when a teach-in event occurred
   */
  addDeviceTeachInEventListener(listener: EnOCore.DeviceTeachInListener) {
    this.coreGateway.onDeviceTeachIn(listener);
  }

  /**
   * Adds an event listener for the "stopped learning" event.
   *
   * @param listener - A callback function that is invoked when the learning process is stopped.
   *                    The callback receives a boolean parameter indicating whether the process
   *                    was stopped manually (`true`) or automatically (`false`).
   */
  addStoppedLearningEventListener(listener: (stoppedManually: boolean) => void): void {
    this.coreGateway.onStopLearning(listener);
  }

  /**
   * Claims a sender index for the EnOcean gateway.
   *
   * If the provided index is undefined, it will acquire the next free semaphore
   * from the sender ID manager. If the index is provided, it will attempt to
   * acquire that specific index.
   *
   * @param index - The index to claim, or undefined to acquire the next free index.
   * @returns The claimed index, or undefined if the index could not be acquired.
   */
  claimSenderIndex(index: number | undefined): number | undefined {

    if (index === undefined) {
      index = this._senderIdManager.acquireNextFreeSemaphore();
    } else {
      const acquired = this._senderIdManager.acquire(index!);
      if (!acquired) {
        this.log.error(`Local EnOcean ID already acquired. Index ${index}.`);
      }
    }
    return index;
  }

  /**
   * Retrieves the EnOcean Sender ID for the given sender index.
   *
   * @param senderIndex - The index of the sender for which to retrieve the ID.
   * @returns The EnOcean Sender ID corresponding to the given sender index.
   * @throws Will throw an error if the coreGateway is not initialized.
   * @throws Will throw an error if the sender index is not acquired.
   */
  getSenderId(senderIndex: number): EnOCore.DeviceId {
    if (this._baseId === undefined) {
      throw 'coreGateway not initialized. Call start() before calling \'getSenderId\'.';
    }
    if (!this._senderIdManager.isAcquired(senderIndex)) {
      throw `Sender index '${senderIndex}' is not acquired. Can't provide an EnOcean Sender ID.`;
    }
    return EnOCore.DeviceId.fromNumber(this._baseId.toNumber() + senderIndex);
  }

  /**
   * Gets the index of the sender ID.
   * @param senderId the sender id to get the index for
   * @returns The index of the sender ID, or undefined if the sender ID is less than or equal to the base ID.
   */
  getSenderIndex(senderId: EnOCore.DeviceId): number | undefined {

    if (this._baseId === undefined) {
      throw 'coreGateway not initialized. Call start() before calling \'getSenderIndex\'.';
    }

    const senderIndex = senderId.toNumber() - this._baseId.toNumber();
    if (senderIndex <= 0) {
      this._log.warn(`'Sender ID '${senderId.toString()}' is less than, or equal to, the base ID. Can't provide an index for it.`);
      return undefined;
    }

    return senderIndex;
  }

  isLocalSenderId(senderId: EnOCore.DeviceId): boolean {
    if (this._baseId === undefined) {
      throw 'coreGateway not initialized. Call start() before calling \'isLocalSenderId\'.';
    }

    const senderIndex = senderId.toNumber() - this._baseId.toNumber();
    return senderIndex >= 0 && senderIndex < 128;
  }

  isTeachInMode(): boolean {
    return this.coreGateway.isLearning;
  }

  /**
   * Registers an EnOcean accessory.
   * - teach the device
   * - ensure the right parser is available
   * - stores the accessory to allow message dispatching
   * 
   * @param accessory The EnOcean accessory to registered
   */
  async registerEnoAccessory(config: DeviceConfig, eepMessageReceived: MessageListener, localSenderId?: EnOCore.DeviceId): Promise<void> {

    const info = this.coreGateway.getDeviceInfo(config.devId);
    if (info === undefined) {
      throw `'${config.id}' cannot register, call teach-in first.`;
    }

    const link = this._registeredEnoAccessories.get(config.devId.toString())
      || new AccessoryLink(config, eepMessageReceived);

    this.ensureEepParser(config.eepId);
    this._registeredEnoAccessories.set(config.devId.toString(), link);
    let message = `${config.name}: registered accessory ID ${config.devId} with EEP ${config.eepId}`;

    if (localSenderId !== undefined) {
      info.localId = localSenderId;
      message += ` and local ID ${localSenderId}`;
    }

    this._log.info(message);
  }

  enqueueErp1Telegram(telegram: EnOCore.ERP1Telegram): void {
    this._sendQueue.enqueue(telegram);
  }

  /**
   * This will create the internal EnOcean Core Gateway
   * and connect it to the serial port.
   */
  async start(): Promise<void> {

    if (this._coreGateway !== undefined) {
      throw this.constructor.name + 'start() can only be called once';
    }

    if (!fs.existsSync(this.serialPortPath)) {
      throw `${this.serialPortPath}: no such device`;
    }

    this._coreGateway = EnOCore.Gateway.connectToSerialPort(this._serialPortPath, new InMemoryDeviceInfoMap());

    const maxAttempt = 50;
    let attempt = 0;
    let chipId;

    await new Promise(resolve => setTimeout(resolve, 4000));
    while (attempt <= maxAttempt) {
      try {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 500));
        chipId = await this._coreGateway.getChipId();
        this._baseId = await this._coreGateway.getBaseId();
        break;
      } catch (error) {
        this.log.debug(`Attempt ${attempt}: ${error}`);
        await new Promise(resolve => setTimeout(resolve, 500 + (100 * attempt * attempt)));
        if (attempt === maxAttempt) {
          throw error;
        }
      }
    }
    this.log.success(`Connected to EnOcean transceiver on ${attempt}. attempt.`);
    this.log.success(`Got Chip ID ${chipId?.toString()} and Base ID ${this._baseId?.toString()}`);

    this._coreGateway.onStopLearning((manually: boolean) => {
      this.log.info(`Stop learning (teach-in) ${manually ? 'manually' : 'timeout'}`);
    });

    this._coreGateway.onReceivedEEPMessage(this.coreGateway_receivedEepMessage.bind(this));

    this._coreGateway.onReceivedERP1Telegram(this.coreGateway_receivedErp1Telegram.bind(this));
    this._coreGateway.onReceivedERP1TelegramUnfamiliar(this.coreGateway_receivedErp1TelegramUnfamiliar.bind(this));
  }

  async startLearning(learnTimeSec: number): Promise<void> {

    const senderIndexForLearning = this._senderIdManager.acquireNextFreeSemaphore();
    if (senderIndexForLearning !== undefined) {
      const senderIdForLearning = this.getSenderId(senderIndexForLearning);
      // Release it right away, so it can be claimed by the new device
      this._senderIdManager.release(senderIndexForLearning);

      await this.coreGateway.startLearning(learnTimeSec, senderIdForLearning);
      this.log.info(`Start learning (teach-in) for ${learnTimeSec} s with sender ID ${senderIdForLearning.toString()}`);
    }
  }

  async stopLearning(): Promise<void> {
    this.coreGateway.stopLearning();
  }

  /**
   * This will make tha gateway aware of the new device.
   * 
   * @param config  The configuration of the new device. Mainly the the EnOcean ID.
   * 
   * The DeviceTeachInEvent will be called.
   */
  async teachDevice(config: DeviceConfig): Promise<void> {
    // This will raise a manual teach-in event
    await this.coreGateway.teachDevice(
      config.devId,
      config.eepId,
      config.manufacturerId);

    if (config.name !== undefined) {
      const info = this.coreGateway.getDeviceInfo(config.devId);
      if (info !== undefined) {
        info.label = config.name;
      }
    }
  }

  private get coreGateway(): EnOCore.Gateway {
    if (this._coreGateway === undefined) {
      throw 'coreGateway not initialized. Call start() before accessing this property.';
    }
    return this._coreGateway!;
  }

  private coreGateway_receivedEepMessage(message: EnOCore.EEPMessage, telegram: EnOCore.ERP1Telegram) {

    const senderId = telegram.sender;

    const link = this._registeredEnoAccessories.get(senderId.toString());
    if (link === undefined) {
      if (!this.isLocalSenderId(senderId)) {    // Detect own send and repeated telegrams
        this._log.warn(`${senderId} no such EnOceanID accessory`);

        this._registeredEnoAccessories.forEach((value, key) => {
          this._log.warn(`${key} ${value.config.name}`);
        });
      }

      return;
    }

    if (message instanceof ParsedMessage) {
      link.eepMessageReceived(message);
    } else {
      this._log.warn(`Received unexpected EEPMessage. Expected ParsedDataMessage but got ${typeof message}`);
    }
  }

  /**
   * Return the last configuration found with and MCS telegram.
   * Once this has been read, it will be reset to undefined.
   */
  public get armedConfig(): DeviceConfig | undefined {
    const config = this._armedConfig;
    this._armedConfig = undefined;
    return config;
  }

  public coreDeviceInfo(): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coreKnownDevices = (this.coreGateway as any).knownDevices;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table3: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    coreKnownDevices.forEach((info: EnOCore.DeviceInfo, device: EnOCore.DeviceId) => {
      table3.push({
        deviceId: info.deviceId.toString(),
        localId: info.localId.toString(),
        manufacturer: EnOCore.Manufacturers[info.manufacturer],
        teachInMethod: EnOCore.TeachInMethods[info.teachInMethod],
        label: info.label,
        eep: info.eep.toString(),
      });
    });
    return table3;
  }

  private _armedConfig: DeviceConfig | undefined;

  private readonly mscParser = new EepParser_D1_Eltako();

  private async coreGateway_receivedErp1Telegram(telegram: EnOCore.ERP1Telegram): Promise<void> {
    // This method is intercepting all received telegrams.
    // So we can use it to trap the manufacturer specific  MSC messages.
    if (telegram.rorg === EnOCore.RORGs.MSC) {

      const mscMessage = this.mscParser.parse(telegram);

      if (!this.isAutoCreateEnabled) {
        this.log.debug(`RX: ${telegram.sender.toString()} ${this.mscParser.toString(mscMessage.values)} (Auto-create disabled)`);
        return;
      }

      this.log.info(`RX: ${telegram.sender.toString()} ${this.mscParser.toString(mscMessage.values)}`);

      const message = `Received Eltako teach-in request from '${telegram.sender}'`;

      if (mscMessage.values.msc?.config !== undefined) {
        // Check if this device is already known
        const info = this.coreGateway.getDeviceInfo(telegram.sender);
        if (info === undefined) {
          // Teach-in this new device. Provide the full config for platform
          this.log.info(`${message} -> adding device...`);
          this._armedConfig = mscMessage.values.msc.config;
          await this.teachDevice(mscMessage.values.msc.config);
        } else {
          // Device already known
          this.log.info(message);
          this.log.info(`${telegram.sender}: is already known as: '${info.label}'`);
          setTimeout(() => {
            this.log.info(`Sending learn telegram to '${info.label}' with local ID '${info.localId.toString()}'`);
            const erp1TeachIn = EnoMessageFactory
              .newFourBSTeachInMessage(
                info.localId, info.eep, info.manufacturer);
            this.enqueueErp1Telegram(erp1TeachIn);
          }, 3000);
        }
      }
    }
  }

  private coreGateway_receivedErp1TelegramUnfamiliar(telegram: EnOCore.ERP1Telegram, reason: EnOCore.ERP1TelegramUnfamiliarityReasons, error?: Error): void {

    const reasonString = EnOCore.ERP1TelegramUnfamiliarityReasons[reason];

    switch (reason) {
      case EnOCore.ERP1TelegramUnfamiliarityReasons.EEPParsingError:
        this.log.error('ParsingError: ', error?.message, '\n', error?.stack);
        break;

      default:
        if (this.coreGateway.isLearning) {
          this.log.info(`coreGateway_ReceivedERP1TelegramUnfamiliar (while learning):\n${telegram}\nReason: ${reasonString}\nError: ${error}`);
        }
        break;
    }
  }

  private rssiQuality(rssi: number): string {

    let q = 'bad';        // < -87 dBm (repeater required)

    if (rssi >= -76) {
      q = 'excellent';           // internal standard antenna sufficiently
    } else if (rssi >= -87) {  // good antenna necessary
      q = 'good';
    }

    return q;
  }

  private ensureEepParser(eepId: EnOCore.EEPId): void {

    if (!this.coreGateway.hasEEPParser(eepId)) {
      const eepParser = this._eepParserFactory.newParser(eepId.toString());

      this.log.debug(`Registering parser ${eepParser.constructor.name} for EEP ${eepId.toString()}`);

      this.coreGateway.setEEPParser(eepId, (telegram: EnOCore.ERP1Telegram) => {
        // This is the anonymous parser of type

        const srce = `RX: SRCE:${telegram.sender.toString()}`;
        const dest = `DEST:${telegram.destination.toString()}`;
        const data = ` ${EnOCore.RORGs[telegram.rorg]}`
          + ` '${telegram.userData.toString('hex').toUpperCase()}'-'${Util.toHexString(telegram.status)}'`;

        // The easiest way to inject the manufacturer information
        const devInfo = this.coreGateway.getDeviceInfo(telegram.sender);
        if (devInfo !== undefined) {
          eepParser.manufacturerId = devInfo.manufacturer;
        } else if (this.isLocalSenderId(telegram.sender)) {
          // This is a local sender ID, so we can ignore it
          const repeatCount = telegram.status & 0x0f;

          this.log.debug(`${srce} ${dest} ${data} -- sender id is a local ID, destination is known (own repeated message, count=${repeatCount}). IGNORED!`);
          return new ParsedMessage(telegram, eepParser);
        } else {
          // Got this message because the destination is known to us
          // Do not parse in any way
          this.log.info(`${srce} ${dest} ${data} -- sender unknown, but destination is known (gateway case in enocean-core). IGNORED!`);
          return new ParsedMessage(telegram, eepParser);
        }

        const type = Util.toHexString(eepParser.eepType);
        const info = ` ${eepParser.constructor.name}-${type} ${EnOCore.Manufacturers[eepParser.manufacturerId]}`;
        this.log.debug(`${srce} ${data} ${info}`);

        if (this.rssiQuality(-telegram.signalStrength) === 'bad') {
          const rssi = ` RSSI -${telegram.signalStrength} dBm (bad), consider a repeater`;
          this.log.warn(`${srce} (${devInfo.label}) ${rssi}`);
        }

        return eepParser.parse(telegram);
      });
    }
  }

  private async sendErp1TelegramIntern(telegram: EnOCore.ERP1Telegram): Promise<void> {
    const result = await this.coreGateway.sendERP1Telegram(telegram);
    const message = telegram.toESP3Packet().toString();

    if (result === EnOCore.SendingResults.Success) {
      this.log.debug(`TX: ${message}`);
    } else {
      throw `${message}: ${EnOCore.SendingResults[result]}`;
    }
  }
}
