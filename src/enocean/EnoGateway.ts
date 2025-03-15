import { Logging } from 'homebridge';

import * as EnOCore from 'enocean-core';

import { EepParserFactory } from '../eepParser/ParserFactory';
import { DeviceConfig } from '../homebridge/DeviceConfig';
import { SemaphoreManager } from './SemaphoreManager';
import { InMemoryDeviceInfoMap } from './InMemoryDeviceInfoMap';
import { EepParser_D1_Eltako } from '../eepParser/EepParser_D1_Eltako';
import { Util } from '../util';
import { ParsedMessage } from '../eepParser/ParsedMessage';

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

  /**
   * Creates an instance of EnoGateway.
   * 
   * @param serialPortPath - The path to the serial port.
   * @param log - The logging instance.
   */
  constructor(
    private serialPortPath: string,
    private log: Logging,
  ) {
    this._serialPortPath = serialPortPath;
    this._log = log;

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
  async registerEnoAccessory(config: DeviceConfig, eepMessageReceived: MessageListener): Promise<void> {

    const link = this._registeredEnoAccessories.get(config.devId.toString())
      || new AccessoryLink(config, eepMessageReceived);

    this.ensureEepParser(config.eepId);
    this._registeredEnoAccessories.set(config.devId.toString(), link);
    this._log.info(`${config.name}: registered accessory EnOID ${config.devId} with EEP ${config.eepId}`);
  }

  /**
   * Sends an ERP1 telegram to the EnOcean gateway.
   *
   * @param telegram - The ERP1 telegram to be sent.
   * @returns A promise that resolves to the result of sending the telegram.
   *
   * The ERP1 telegram consists of:
   * - The first byte of data representing the RORG (telegram type).
   * - The user data.
   * - The sender ID and status.
   *
   * The method constructs the data buffer by concatenating the RORG, user data, sender ID, and status.
   * It then creates an ESP3 packet with the constructed data and sends it using the core gateway.
   */
  async sendERP1Telegram(telegram: EnOCore.ERP1Telegram): Promise<EnOCore.SendingResults> {

    // first byte of data is rorg ...
    const data = Buffer.alloc(6 + telegram.userData.length);
    data.writeUIntBE(telegram.rorg, 0, 1);

    // ... followed by user data ...
    telegram.userData.copy(data, 1);

    // ... and finally by sender id and status
    const senderOffset = 1 + telegram.userData.length;
    data.writeUIntBE(telegram.sender.toNumber(), senderOffset, 4);
    data.writeUInt8(telegram.status, senderOffset + 4);

    // No optional data for the time being
    const optionalData = Buffer.alloc(0);
    // optionalData.writeUIntBE(this.subTelNum, 0, 1)
    // optionalData.writeUIntBE(this.destination.toNumber(), 1, 4)
    // optionalData.writeUIntBE(this.signalStrength, 5, 1)
    // optionalData.writeUIntBE(this.securityLevel, 6, 1)

    const esp3 = new EnOCore.ESP3Packet(EnOCore.ESP3PacketTypes.RadioERP1, data, optionalData);

    return await this.coreGateway.sendESP3Packet(esp3);
  }

  /**
   * This will create the internal EnOcean Core Gateway
   * and connect it to the serial port.
   */
  async start(): Promise<void> {

    if (this._coreGateway !== undefined) {
      throw this.constructor.name + 'start() can only be called once';
    }

    this._coreGateway = await EnOCore.Gateway.connectToSerialPort(this._serialPortPath, new InMemoryDeviceInfoMap());

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
    await this.coreGateway.startLearning(learnTimeSec);
    this.log.info(`Start learning (teach-in) for ${learnTimeSec} s`);
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

  private get coreGateway(): EnOCore.Gateway {  // TODO make private
    if (this._coreGateway === undefined) {
      throw 'coreGateway not initialized. Call start() before accessing this property.';
    }
    return this._coreGateway!;
  }

  private coreGateway_receivedEepMessage(message: EnOCore.EEPMessage, telegram: EnOCore.ERP1Telegram) {

    const senderId = telegram.sender;

    const link = this._registeredEnoAccessories.get(senderId.toString());
    if (link === undefined) {
      this._log.warn(`${senderId} no such EnOceanID accessory`);

      this._registeredEnoAccessories.forEach((value, key) => {
        this._log.warn(`${key} ${value.config.name}`);
      });

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
  public get armedConfig(): DeviceConfig | undefined{
    const config = this._armedConfig;
    this._armedConfig = undefined;
    return config;
  }
  
  private _armedConfig: DeviceConfig | undefined;
  
  private readonly mscParser = new EepParser_D1_Eltako();

  private async coreGateway_receivedErp1Telegram(telegram: EnOCore.ERP1Telegram): Promise<void> {
    // This method is intercepting all received telegrams.
    // So we can use it to trap the manufacturer specific  MSC messages.
    if (telegram.rorg === EnOCore.RORGs.MSC) {

      const mscMessage = this.mscParser.parse(telegram);

      this.log.info(`RX: ${telegram.sender.toString()} ${this.mscParser.toString(mscMessage.values)}`);

      if (mscMessage.values.msc?.config !== undefined) {
        // Check if this device is already known
        const info = this.coreGateway.getDeviceInfo(telegram.sender);
        if (info === undefined) {
          // Teach in this new device. Provide the full config for platform
          this.log.info(`Adding '${telegram.sender}' to configuration via 4BS teach-in`);
          this._armedConfig = mscMessage.values.msc.config;
          await this.teachDevice(mscMessage.values.msc.config);
        } else {
          // Device already known
          this.log.warn(`Cannot add (teach-in) '${telegram.sender}': already known as: '${info.label}', remove it first`);
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
}
