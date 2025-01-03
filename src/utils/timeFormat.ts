/**
 * Converts seconds to days
 * @param seconds Number of seconds
 * @returns Number of days
 */
const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_HOUR = 60 * 60;
const SECONDS_PER_MINUTE = 60;

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
    const roundedSeconds = Math.round(seconds);

    if (roundedSeconds >= SECONDS_PER_DAY) {
        const days = Math.floor(roundedSeconds / SECONDS_PER_DAY);
        return `${days} ${days === 1 ? 'day' : 'days'}`;
    }

    if (roundedSeconds >= SECONDS_PER_HOUR) {
        const hours = Math.floor(roundedSeconds / SECONDS_PER_HOUR);
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }

    if (roundedSeconds >= SECONDS_PER_MINUTE) {
        const minutes = Math.floor(roundedSeconds / SECONDS_PER_MINUTE);
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }

    return `${Math.max(1, roundedSeconds)} ${roundedSeconds === 1 ? 'second' : 'seconds'}`;
}
