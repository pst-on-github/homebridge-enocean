/* eslint-disable @typescript-eslint/no-explicit-any */
import { TelegramQueue } from '../../enocean/TelegramQueue';
import * as EnOCore from 'enocean-core';
import { Logging } from 'homebridge';

describe('TelegramQueue', () => {
  let mockSendMethod: jest.Mock;
  let mockLog: Logging;
  let telegramQueue: TelegramQueue;

  beforeEach(() => {
    mockSendMethod = jest.fn();
    mockLog = {
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logging;

    telegramQueue = new TelegramQueue(mockSendMethod, mockLog);
  });

  it('should enqueue a telegram and start sending', async () => {
    const telegram: EnOCore.ERP1Telegram = { data: Buffer.from([0x01]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockResolvedValueOnce(undefined);

    telegramQueue.enqueue(telegram);

    // Wait for the queue to process
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockSendMethod).toHaveBeenCalledWith(telegram);
    expect(mockSendMethod).toHaveBeenCalledTimes(1);
  });

  it('should retry sending a telegram up to the maximum retries on failure', async () => {
    const telegram: EnOCore.ERP1Telegram = { data: Buffer.from([0x02]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockRejectedValueOnce(new Error('Send failed'));
    mockSendMethod.mockRejectedValueOnce(new Error('Send failed'));
    mockSendMethod.mockResolvedValueOnce(undefined);

    telegramQueue.enqueue(telegram);

    // Wait for the queue to process
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(mockSendMethod).toHaveBeenCalledWith(telegram);
    expect(mockSendMethod).toHaveBeenCalledTimes(3);
    expect(mockLog.debug).toHaveBeenCalledTimes(2);
    expect(mockLog.warn).toHaveBeenCalledTimes(0);
  });

  it('should log a warning and give up after maximum retries', async () => {
    const telegram: EnOCore.ERP1Telegram = { data: Buffer.from([0x03]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockRejectedValue(new Error('Send failed'));

    telegramQueue.enqueue(telegram);

    // Wait for the queue to process
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(mockSendMethod).toHaveBeenCalledWith(telegram);
    expect(mockSendMethod).toHaveBeenCalledTimes(3);
    expect(mockLog.debug).toHaveBeenCalledTimes(3);
    expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to send'));
  });

  it('should process multiple telegrams in order', async () => {
    const telegram1: EnOCore.ERP1Telegram = { data: Buffer.from([0x01]) } as unknown as EnOCore.ERP1Telegram;
    const telegram2: EnOCore.ERP1Telegram = { data: Buffer.from([0x02]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockResolvedValue(undefined);

    telegramQueue.enqueue(telegram1);
    telegramQueue.enqueue(telegram2);

    // Wait for the queue to process
    await new Promise(resolve => setTimeout(resolve, 200));

    expect(mockSendMethod).toHaveBeenNthCalledWith(1, telegram1);
    expect(mockSendMethod).toHaveBeenNthCalledWith(2, telegram2);
    expect(mockSendMethod).toHaveBeenCalledTimes(2);
  });

  it('should wait between sending telegrams', async () => {
    const telegram1: EnOCore.ERP1Telegram = { data: Buffer.from([0x01]) } as unknown as EnOCore.ERP1Telegram;
    const telegram2: EnOCore.ERP1Telegram = { data: Buffer.from([0x02]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockResolvedValue(undefined);

    telegramQueue.enqueue(telegram1);
    telegramQueue.enqueue(telegram2);

    const startTime = Date.now();

    // Wait for the queue to process
    await new Promise(resolve => setTimeout(resolve, 300));

    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(50); // Minimum sleep time
  });

  it('should not start sending if already sending', async () => {
    const telegram: EnOCore.ERP1Telegram = { data: Buffer.from([0x01]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockImplementation(async () => {
      // Simulate a delay to keep the queue in the sending state
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    telegramQueue.enqueue(telegram);
    telegramQueue.enqueue(telegram);

    // Wait for the first telegram to start processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockSendMethod).toHaveBeenCalledTimes(1);
  });

  it('should handle an empty queue gracefully', async () => {
    // Ensure no errors occur when the queue is empty
    await (telegramQueue as any).startSending();

    expect(mockSendMethod).not.toHaveBeenCalled();
    expect(mockLog.warn).not.toHaveBeenCalled();
  });

  it('should log debug messages during retries', async () => {
    const telegram: EnOCore.ERP1Telegram = { data: Buffer.from([0x04]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockRejectedValue(new Error('Send failed'));

    telegramQueue.enqueue(telegram);

    // Wait for the queue to process
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(mockLog.debug).toHaveBeenCalledTimes(3);
    expect(mockLog.debug).toHaveBeenCalledWith(expect.stringContaining('Send attempt'));
  });

  it('should not process new telegrams until the current queue is empty', async () => {
    const telegram1: EnOCore.ERP1Telegram = { data: Buffer.from([0x01]) } as unknown as EnOCore.ERP1Telegram;
    const telegram2: EnOCore.ERP1Telegram = { data: Buffer.from([0x02]) } as unknown as EnOCore.ERP1Telegram;

    mockSendMethod.mockImplementation(async () => {
      // Simulate a delay to keep the queue busy
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    telegramQueue.enqueue(telegram1);
    telegramQueue.enqueue(telegram2);

    // Wait for the first telegram to start processing
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockSendMethod).toHaveBeenCalledTimes(1);
    expect(mockSendMethod).toHaveBeenCalledWith(telegram1);

    // Wait for the queue to process the second telegram
    await new Promise(resolve => setTimeout(resolve, 300));

    expect(mockSendMethod).toHaveBeenCalledTimes(2);
    expect(mockSendMethod).toHaveBeenCalledWith(telegram2);
  });
});
