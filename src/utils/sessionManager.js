/**
 * Session Manager Utility
 * 
 * Manages project persistence across browser sessions.
 * 
 * Behavior:
 * - On fresh browser/app restart: Clears project from localStorage (fresh start)
 * - During navigation within session: Keeps project in localStorage (tab switching works)
 * - Uses sessionStorage to detect fresh page loads
 */

const SESSION_FLAG = 'satori_session_initialized';
const PROJECT_NAME_KEY = 'currentProjectName';

/**
 * Initialize session - clears project on fresh page load
 * Should be called once when the app starts
 */
export const initializeSession = () => {
  // Check if this is a fresh session (sessionStorage is cleared on browser close)
  const sessionInitialized = sessionStorage.getItem(SESSION_FLAG);
  
  if (!sessionInitialized) {
    // This is a fresh page load (browser was closed/restarted)
    // Clear project name to start fresh
    localStorage.removeItem(PROJECT_NAME_KEY);
    
    // Mark session as initialized (persists during navigation, clears on browser close)
    sessionStorage.setItem(SESSION_FLAG, 'true');
  }
  // If session is already initialized, do nothing (navigation within session)
};

/**
 * Clear session flag (useful for testing or explicit reset)
 */
export const clearSession = () => {
  sessionStorage.removeItem(SESSION_FLAG);
};

