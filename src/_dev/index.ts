import * as EnoCore from 'enocean-core';
import * as readline from 'readline';

import { EnoGateway } from '../enocean/EnoGateway';
import { Logging } from 'homebridge';

import { DeviceConfig } from '../homebridge/DeviceConfig';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function main() {

  const message: string = 'Enocean parser test runner';
  console.clear();
  console.log(message);

  process.on('uncaughtException', (error) => {
    console.error('Unhandled Exception:', error);
    // Handle the error appropriately
  });

  const log = {
    info: (message: string, ...parameters: any[]) => {
      console.log(message, ...parameters);
    },
    success(message: string, ...parameters: any[]) {
      console.log(message, ...parameters);
    },
    warn(message: string, ...parameters: any[]) {
      console.log(message, ...parameters);
    },
    error(message: string, ...parameters: any[]) {
      console.error(message, ...parameters);
    },
    debug(message: string, ...parameters: any[]) {
      console.log(message, ...parameters);
    },
  } as Logging;

  const config = new DeviceConfig(
    '05:98:E2:C6',
    'A5-08-01',
    'test dev',
    'ID-RF (NodeOn)',
  );


  // ----------------------------------------------------------------------

  const serialPort: string = '/dev/ttyUSB0';
  const gw = new EnoGateway(serialPort, true, log);

  await gw.start();

  // teach is missing!!!

  await gw.registerEnoAccessory(config, (message: EnoCore.EEPMessage) => {
    console.log('EEP message received:', message);
  });

  console.log('Register devices DONE');

  // Create an interface for reading lines from the console
  readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Press any key to continue...');

  setInterval(() => {
    console.log('This message will appear every 5 seconds');
  }, 5000);
}

main();
