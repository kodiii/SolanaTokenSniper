const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_MINUTE = 60;

/**
 * Converts seconds to days
 * @param seconds Number of seconds
 * @returns Number of days
 */
export function secondsToDays(seconds: number): number {
    return seconds / SECONDS_PER_DAY;
}

/**
 * Converts days to seconds
 * @param days Number of days
 * @returns Number of seconds
 */
export function daysToSeconds(days: number): number {
    return Math.round(days * SECONDS_PER_DAY);
}

/**
 * Formats a duration in seconds to a human-readable string
 * @param seconds Number of seconds
 * @returns Formatted string (e.g., "2 days", "1 day", "12 hours", "30 minutes", "1 minute", "5 seconds")
 */
export function formatTimeDuration(seconds: number): string {
    if (!seconds || seconds < 0) return '0 seconds';
    
    const roundedSeconds = Math.round(seconds);

    if (roundedSeconds >= SECONDS_PER_DAY) {
        const days = Math.floor(roundedSeconds / SECONDS_PER_DAY);
        const remainingHours = Math.floor((roundedSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
        if (remainingHours > 0) {
            return `${days} ${days === 1 ? 'day' : 'days'} ${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`;
        }
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    }

    if (roundedSeconds >= SECONDS_PER_HOUR) {
        const hours = Math.floor(roundedSeconds / SECONDS_PER_HOUR);
        const remainingMinutes = Math.floor((roundedSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
        if (remainingMinutes > 0) {
            return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`;
        }
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    if (roundedSeconds >= SECONDS_PER_MINUTE) {
        const minutes = Math.floor(roundedSeconds / SECONDS_PER_MINUTE);
        const remainingSeconds = roundedSeconds % SECONDS_PER_MINUTE;
        if (remainingSeconds > 0) {
            return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`;
        }
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }

    return `${Math.max(1, roundedSeconds)} ${roundedSeconds === 1 ? 'second' : 'seconds'}`;
}

/**
 * Formats a time duration for display in an input field
 * @param seconds Number of seconds
 * @returns Formatted string for input field
 */
export function formatTimeForInput(seconds: number): string {
    return seconds.toString();
}

/**
 * Parses a time input string to a number of seconds
 * @param input Time input string (e.g., "60" for 1 minute)
 * @returns Number of seconds, or 0 if invalid input
 */
export function parseTimeInput(input: string): number {
    const value = parseInt(input);
    return isNaN(value) ? 0 : value;
}
