/**
 * useHaptics Hook
 * Provides haptic feedback patterns using the Vibration API
 * Gracefully degrades on devices that don't support it
 */

export function useHaptics() {
  const triggerVibration = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Silently fail if vibration is not allowed
        console.debug('Haptic feedback not available');
      }
    }
  };

  return {
    /**
     * Light tap vibration (50ms)
     * Use: When user interacts with UI elements
     */
    tap: () => triggerVibration(50),

    /**
     * Medium feedback vibration (100ms)
     * Use: When action is confirmed
     */
    feedback: () => triggerVibration(100),

    /**
     * Success pattern (100-50-100ms)
     * Use: When user answers correctly or completes quiz
     */
    success: () => triggerVibration([100, 50, 100]),

    /**
     * Error pattern (50-50-50-50ms)
     * Use: When user answers incorrectly
     */
    error: () => triggerVibration([50, 50, 50, 50]),

    /**
     * Custom vibration pattern
     * Use: Any custom vibration pattern in milliseconds
     */
    custom: (pattern: number | number[]) => triggerVibration(pattern),
  };
}
