import * as EnOCore from 'enocean-core';
import { Logging } from 'homebridge';

export class TelegramQueue {
  private queue: EnOCore.ERP1Telegram[] = [];
  private isSending: boolean = false;
  private sendMethod: (telegram: EnOCore.ERP1Telegram) => Promise<void>;

  constructor(
    sendMethod: (telegram: EnOCore.ERP1Telegram) => Promise<void>,
    readonly log: Logging,
  ) {
    this.sendMethod = sendMethod;
  }

  enqueue(telegram: EnOCore.ERP1Telegram): void {
    this.queue.push(telegram);
    if (!this.isSending) {
      this.startSending();
    }
  }

  private async startSending(): Promise<void> {
    if (this.isSending) {
      return;
    }
    this.isSending = true;

    while (this.queue.length > 0) {
      const telegram = this.queue.shift();
      if (telegram) {
        await this.sendWithRetries(telegram, 3);
        await this.randomSleep(50, 150);
      }
    }

    this.isSending = false;
  }

  private async sendWithRetries(telegram: EnOCore.ERP1Telegram, maxRetries: number): Promise<void> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        await this.sendMethod(telegram);
        return; // Success, exit function
      } catch (error) {
        attempts++;
        const suffix = attempts<maxRetries? 'Retrying...': 'Giving up.';
        this.log.warn(`Send attempt ${attempts}/${maxRetries} failed: ${error}. ${suffix}`);
      }
    }
  }

  private randomSleep(minMs: number, maxMs: number): Promise<void> {
    const sleepTime = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, sleepTime));
  }
}
