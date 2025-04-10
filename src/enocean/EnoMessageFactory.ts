import * as EnoCore from 'enocean-core';

export class EnoMessageFactory {

  /**
   * Creates a new 4BS (A5, Four Byte Telegram) message for controlling blinds via an Eltako gateway.
   *
   * @param localDeviceId - The unique device ID of the local EnOcean device.
   * @param cmd - The command to execute: 0=stop, 1=up, 2=down
   * @param time_s - The duration of the command in seconds.
   * @returns An instance of `EnoCore.ERP1Telegram` representing the constructed message.
   */
  static newFourBSGatewayBlindsMessageEltako(cmd: number, time_s: number): EnoCore.ERP1Telegram {

    const erp1 = new EnoCore.ERP1Telegram({ rorg: EnoCore.RORGs.FOURBS });

    // DB0_Bit5 0x20 = 1: Lernmodus aktivieren, 3x innerhalb 2s = löschen GFVS-ID
    // DB0_Bit3 0x08 = LRN Button (0 = Lerntelegramm, 1 = Datentelegramm)
    // DB0_Bit2 0x04 = Aktor für Taster blockieren/freigeben (0 = freigeben, 1 = blockieren)
    // DB0_Bit1 0x02 = Umschaltung Laufzeit in Sekunden oder in 100ms.
    //                 (0 = Laufzeit nur in DB2 in Sekunden)
    //                 (1 = Laufzeit in DB3(MSB) + DB2(LSB) in 100 ms.)
    erp1.setDB(0, 0x0A);        // ms + Datentelegram

    erp1.setDB(1, cmd & 0x03);  // Data_byte1 = Kommando: 0x00 = Stopp, 0x01 = Auf, 0x02 = Ab

    const t_lsb = (time_s * 10) & 0xff;
    const t_msb = ((time_s * 10) >> 8) & 0xff;

    erp1.setDB(2, t_lsb);        // Data_byte2 = Laufzeit in 100 ms LSB, oder Laufzeit in Sekunden 1-255 dez.
    erp1.setDB(3, t_msb);        // Data_byte3 = Laufzeit in 100ms MSB

    return erp1;
  }

  /**
   * Creates a new 4BS (A5, Four Byte Telegram) gateway dimming message for EnOcean devices.
   *
   * @param on - A boolean indicating whether the dimmer should be turned on (`true`) or off (`false`).
   * @param brightness - The brightness level as a percentage (0-100). Values outside this range will be clamped.
   * @returns An instance of `EnoCore.ERP1Telegram` representing the dimming message.
   */
  static newFourBSGatewayDimmingMessage(on: boolean, brightness: number): EnoCore.ERP1Telegram {
    
    const erp1 = new EnoCore.ERP1Telegram({ rorg: EnoCore.RORGs.FOURBS });
  
    /*
     * Data_byte3 = 0x02        DIMMING CMD
     * Data_byte2 = Dimmwert in % von 0-100 dez. 
     * Data_byte1 = Dimmgeschwindigkeit
     *              0x00 = die am Dimmer eingestellte Dimmgeschwindigkeit wird verwendet.
     *              0x01 = sehr schnelle Dimmspeed Bis 0xFF = sehr langsame Dimmspeed 
     * Data_byte0 = DB0_Bit3 = LRN Button (0 = Lerntelegramm, 1 = Datentelegramm)
     *              DB0_Bit0 = 1: Dimmer an, 0: Dimmer aus.
     *              DB0_Bit2 = 1: Dimmwert blockieren
     *                         0: Dimmwert nicht blockiert
     */
  
    erp1.setDB(0, on ? 0x09 : 0x08);                        // 0x80 = DATA, 0 = LRN
    erp1.setDB(1, 0x01);                                    // DB1 fastest dim speed
    erp1.setDB(2, Math.max(0, Math.min(100, brightness)));  // DB2 brightness 0-100 %
    erp1.setDB(3, 0x02);                                    // DB3 tells the GW command 0x02 = Dimming

    return erp1;
  }

  /**
   * Creates a new 4BS (A5, Four Byte Telegram) gateway switching message.
   *
   * @param on - A boolean indicating the desired state of the switch.
   *             `true` for ON (0x09) and `false` for OFF (0x08).
   * @returns An instance of `EnoCore.ERP1Telegram` representing the switching message.
   */
  static newFourBSGatewaySwitchingMessage(on: boolean): EnoCore.ERP1Telegram {

    const erp1 = new EnoCore.ERP1Telegram({ rorg: EnoCore.RORGs.FOURBS });

    erp1.setDB(0, on ? 0x09 : 0x08);  // 0x80 = DATA, 0 = LRN
    erp1.setDB(1, 0x00); // DB1 time n. a.
    erp1.setDB(2, 0x00); // DB2 time n. a.
    erp1.setDB(3, 0x01); // DB3 tells the GW command 0x01 = Switching

    return erp1;
  }
  
  /**
   * Gets a new 4BS (A5) teach-in message, Variation 2: Unidirectional with profile and manufacturer ID
   * 
   * @param eepId The EEP to be send to the device to teach
   * @param manufacturer The manufacturer ID to be send to the device to teach
   * @returns A valid ERP1Telegram 4BS teach-in telegram for the given inputs
   * @throws Error if FUNC > 0x3F or TYPE > 0x7F 
   * @throws Error if RORG is not 4BS
   */
  static newFourBSTeachInMessage(localDeviceId: EnoCore.DeviceId, eepId: EnoCore.EEPId, manufacturer: number): EnoCore.ERP1Telegram {

    if (eepId.func > 0x3F || eepId.type > 0x7F) {
      throw new Error(`new4bsTeachInMessageUni: ${eepId.toString()}: For FUNC > 3F or TYPE > 7F UTE has to be used instead of 4BS Teach-In.`);
    }

    if (eepId.rorg !== EnoCore.RORGs.FOURBS) {
      throw new Error(`new4bsTeachInMessageUni: ${eepId.toString()}: Only 4BS (A5) Teach-In is supported.`);
    }

    const erp1 = new EnoCore.ERP1Telegram({ rorg: eepId.rorg });

    erp1.sender = localDeviceId;
    erp1.signalStrength = 0xFF;

    erp1.setDB(0, 0x80);  // LRN bit (0x08) is 0 -> teach-in, 0x80 = LRN TYPE 1 = provide manufacturer ID and EPP
    erp1.setDB(1, manufacturer & 0xFF);
    erp1.setDB(2, ((manufacturer >> 8) & 0x07) | ((eepId.type << 3) & 0xF8));
    erp1.setDB(3, ((eepId.type >> 5) & 0x03) | ((eepId.func << 2) & 0xFC));

    // Lerntelegramm DB3..DB0 muss so aussehen: 0xE0, 0x40, 0x0D, 0x80 (Eltako)

    return erp1;
  }

  /**
   * Creates a new RPS (Remote Push Button Switch) "On" message as an ERP1Telegram.
   *
   * @param on - A boolean indicating the state of the button. 
   *             `true` represents the "On" state, and `false` represents the "Off" state.
   * @returns An instance of `EnoCore.ERP1Telegram` representing the RPS "On" message.
   */
  static newRpsOnMessage(on: boolean): EnoCore.ERP1Telegram {

    const erp1 = new EnoCore.ERP1Telegram({ rorg: EnoCore.RORGs.RPS, userDataSize: 1 });

    erp1.setDB(0, on ? 0x50 : 0x70); // DB0.4 Pressed bit

    return erp1;
  }

  /**
   * Builds a VLD (D2-05) message to control blinds
   * 
   * @param cmd           1 = goto position, 2 = stop, 3 = query position & angle, 4 = replay pos & angle, 5 = set parameter 
   * @param position      0-100, undefined = do not change
   * @param angle         0-100, undefined = do not change
   * @returns A ready build ERP1 message
   */
  static newVldBlindsControlMessage(cmd: number = 1, position: number | undefined, angle: number | undefined): EnoCore.ERP1Telegram {

    const erp1 = new EnoCore.ERP1Telegram({ rorg: EnoCore.RORGs.VLD, userDataSize: 4 });

    if (cmd === 1) { // goto position
      if (position === undefined && angle === undefined) {
        throw new Error('newVldBlindsControlMessage: cmd=1 requires position or angle to be set');
      }
    }

    const channel = 0x0F; // Channel all
    const lock = 0x00;    // Lock 0 = do not change
    const repo = 0x00;    // Repositioning 0 = go directly to position/angle

    erp1.setDB(0, (channel & 0x0F) << 4 | (cmd & 0x0F));        // channel & command
    erp1.setDB(1, (repo & 0x07) << 4 | (lock & 0x07));          // repositioning mode & lock

    if (angle === undefined) {
      erp1.setDB(2, 127);                                       // Don't change slat angle
    } else {
      erp1.setDB(2, Math.max(0, Math.min(100, angle)));         // slat angle
    }

    if (position === undefined) {
      erp1.setDB(3, 127);                                       // Don't change blinds position
    } else {
      erp1.setDB(3, Math.max(0, Math.min(100, position)));      // blinds position
    }

    return erp1;
  }
}
