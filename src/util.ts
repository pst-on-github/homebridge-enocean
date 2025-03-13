

export class Util {

  public static isNullOrEmpty(value: string | null | undefined): boolean {
    return value === null || value === undefined || value.trim().length === 0;
  }

  public static toHexString(value: number, digits: number = 2): string {
    return value.toString(16).padStart(digits, '0').toUpperCase();
  }

  public static printCallerInfo(): void {
    const error = new Error();
    const stack = error.stack?.split('\n');
  
    if (stack && stack.length > 3) {
      console.log('Caller Information:', stack[3]);
    }
  }

  public static getTimeAsFourDigitString = (): string => {
    const now = new Date(); // Get the current date and time
    const hours = now.getHours(); // Get hours (0-23)
    const minutes = now.getMinutes(); // Get minutes (0-59)
  
    // Format the hours and minutes to always be two digits
    const hoursString = hours.toString().padStart(2, '0');
    const minutesString = minutes.toString().padStart(2, '0');
  
    return `${hoursString}${minutesString}`; // Combine as a 4-digit string
  };
}
