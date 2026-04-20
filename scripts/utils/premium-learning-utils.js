import { setCookie, getCookie, deleteCookie } from './cookie-utils.js';
import isFeatureEnabled from './feature-flag-utils.js';

const LEARNER_TOKEN_COOKIE = 'alm_access_token';
const LEARNER_USER_ID_COOKIE = 'alm_user_id';
const DEFAULT_EXPIRES = 86400;

let plAuthenticationPromise;

/**
 * Gets a URL search parameter, returning true if value is '1' or 'true'.
 * @param {string} paramName
 * @returns {boolean}
 */
function isPLSimulationFlagEnabled(paramName) {
  const value = new URLSearchParams(window.location.search).get(paramName);
  return value === '1' || value === 'true';
}

export function getPLAccessToken() {
  return getCookie(LEARNER_TOKEN_COOKIE);
}

/**
 * Authenticates with Premium Learning Auth endpoint, exchanging IMS token for learner token.
 * Stores both tokens and user ID in cookies.
 * @param {string} imsToken
 */
async function fetchPLToken(imsToken) {
  try {
    const { premiumLearningAuthAPI } = window.exlm?.config || {};
    if (!premiumLearningAuthAPI) return;

    const response = await fetch(premiumLearningAuthAPI, {
      method: 'POST',
      headers: { Authorization: `Bearer ${imsToken}` },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const {
      access_token: accessToken,
      expires_in: expiresIn = DEFAULT_EXPIRES,
      user_id: userId,
    } = await response.json();
    if (!accessToken) return;

    setCookie(LEARNER_TOKEN_COOKIE, accessToken, expiresIn);
    if (userId) setCookie(LEARNER_USER_ID_COOKIE, userId, expiresIn);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to exchange IMS token for Premium Learning token:', error);
  }
}

/**
 * Validates learner token against the Premium Learning API and clears if invalid.
 * @param {string} token
 * @returns {Promise<boolean>} true if valid token exists
 */
async function ensureValidPLToken(token) {
  if (!token) return false;

  try {
    const { plApiBaseUrl } = window.exlm?.config || {};
    const res = await fetch(`${plApiBaseUrl}/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.api+json' },
    });

    if (res.ok) return true;

    // Token invalid, clear auth data
    [LEARNER_TOKEN_COOKIE, LEARNER_USER_ID_COOKIE].forEach((cookie) => deleteCookie(cookie));
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Initializes Premium Learning authentication on-demand with memoization.
 * @returns {Promise<void>}
 */
async function ensurePLAuthentication() {
  if (plAuthenticationPromise) return plAuthenticationPromise;

  plAuthenticationPromise = (async () => {
    if (isPLSimulationFlagEnabled('plAuthSimFail')) {
      throw new Error('Simulated PL authentication failure');
    }
    if (isPLSimulationFlagEnabled('plAuthSimDelay')) {
      await new Promise((resolve) => {
        setTimeout(resolve, 10000);
      });
    }

    const existingToken = getCookie(LEARNER_TOKEN_COOKIE);
    if (existingToken && (await ensureValidPLToken(existingToken))) {
      return;
    }

    // No valid existing token, attempt to get new one
    const imsToken = window.adobeIMS?.getAccessToken()?.token || null;
    if (imsToken) await fetchPLToken(imsToken);
  })().catch((error) => {
    plAuthenticationPromise = undefined;
    throw error;
  });

  return plAuthenticationPromise;
}

/**
 * Checks Premium Learning membership with timeout fallback and feature gate.
 * Handles auth, membership verification, and timeout in a single call.
 * @param {number} timeoutMs - Timeout in milliseconds before returning false (default: 10000)
 * @returns {Promise<boolean>} True if user is a PL member, false otherwise
 */
async function isPLAuthenticated(timeoutMs = 10000) {
  const membershipCheck = (async () => {
    try {
      await ensurePLAuthentication();
      return !!getCookie(LEARNER_TOKEN_COOKIE);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error checking Premium Learning status:', error);
      return false;
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve(false), timeoutMs);
  });

  return Promise.race([membershipCheck, timeoutPromise]);
}

export function removePLSections() {
  document.querySelectorAll('.premium-learning-section').forEach((section) => section.remove());
}

/**
 * Checks if a block should render for the current user.
 * Verifies both sign-in status and Premium Learning membership eligibility.
 * Used by premium learning blocks to gate content access.
 * @param {number} timeoutMs - Timeout for membership check (default: 10000)
 * @returns {Promise<boolean>} True if user is eligible, false otherwise
 */
export async function isPLEligible(timeoutMs = 10000) {
  if (!isFeatureEnabled('isPremiumLearningEnabled')) return false;
  // eslint-disable-next-line import/no-cycle
  const { isSignedInUser } = await import('../auth/profile.js');
  const signedIn = await isSignedInUser();
  return !!signedIn && isPLAuthenticated(timeoutMs);
}

/**
 * Gates premium learning sections based on user eligibility.
 * Removes all premium sections if the user is not eligible.
 * @param {number} timeoutMs - Timeout for membership check (default: 10000)
 * @returns {Promise<boolean>} True if user is eligible for premium learning
 */
export async function applyPLSectionGating(timeoutMs = 10000) {
  const isEligible = await isPLEligible(timeoutMs);
  if (!isEligible) removePLSections();
  return isEligible;
}
