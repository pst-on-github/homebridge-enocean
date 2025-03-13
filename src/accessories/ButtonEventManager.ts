import { HAP } from 'homebridge';


/**
 * ButtonEventManager class for handling button events
 */
export class ButtonEventManager {
  private singleClickTimeout: NodeJS.Timeout | null = null;
  private longPressTimeout: NodeJS.Timeout | null = null;
  private clickCount = 0;
  private isLongPress = false;
  private isButtonPressed = false;
  private readonly singleClickDelay = 350; // milliseconds
  private readonly longPressDelay = 600; // milliseconds

  constructor(
    private onButtonPress: (switchEvent: number) => void,
    private hap: HAP,
  ) {
  }

  /**
   * Handle button press - single, double or long press.
   * If the button is pressed for longer than the long press delay, it is considered a long press
   */
  public buttonPressed(): void {
    this.isButtonPressed = true;
    this.isLongPress = false;
    this.longPressTimeout = setTimeout(() => {
      this.isLongPress = true;
      this.onButtonPress(this.hap.Characteristic.ProgrammableSwitchEvent.LONG_PRESS);
    }, this.longPressDelay);
  }

  /**
   * Handle button release - single or double press.
   * If the button is released before the long press delay, it is considered a single or double press
   */
  public buttonReleased(): void {
    if (!this.isButtonPressed) {
      return;
    }

    this.isButtonPressed = false;

    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
    }

    if (this.isLongPress) {
      return;
    }

    this.clickCount++;
    if (this.singleClickTimeout) {
      clearTimeout(this.singleClickTimeout);
    }

    this.singleClickTimeout = setTimeout(() => {
      if (this.clickCount === 1) {
        this.onButtonPress(this.hap.Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);
      } else if (this.clickCount === 2) {
        this.onButtonPress(this.hap.Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS);
      }
      this.clickCount = 0;
    }, this.singleClickDelay);
  }
}
