

export type PhoneValidationReason =
  | 'valid'
  | 'not-a-string'
  | 'empty'
  | 'too-long'
  | 'invalid-characters'
  | 'multiple-plus-signs'
  | 'plus-not-at-start'
  | 'no-digits'
  | 'invalid-country-code-or-length'
  | 'invalid-length'
  | 'not-a-valid-mobile-prefix';

export interface PhoneValidationResult {
  isValid: boolean;
  /** Present on every result (pass or fail) — always populated, unlike a status flag alone. */
  reason: PhoneValidationReason;
  /**
   * Canonical E.164 form ("+91XXXXXXXXXX"), present only when isValid is true.
   * Useful for consistent storage/lookup regardless of how the user typed it.
   */
  normalized?: string;
}

const MAX_INPUT_LENGTH = 24; // generous upper bound for the longest legitimate formatted input, e.g. "+91 (98765) 43-210 "
const ALLOWED_CHARS = /^[+\d\s\-.()]+$/;
const MOBILE_CORE_PATTERN = /^[6-9]\d{9}$/;

const isDigits = (s: string): boolean => /^\d+$/.test(s);

export const validatePhoneDetailed = (phone: string): PhoneValidationResult => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, reason: 'not-a-string' };
  }

  const trimmed = phone.trim();
  if (trimmed.length === 0) {
    return { isValid: false, reason: 'empty' };
  }
  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { isValid: false, reason: 'too-long' };
  }
  if (!ALLOWED_CHARS.test(trimmed)) {
    return { isValid: false, reason: 'invalid-characters' };
  }

  const plusCount = (trimmed.match(/\+/g) || []).length;
  if (plusCount > 1) {
    return { isValid: false, reason: 'multiple-plus-signs' };
  }
  const plusIndex = trimmed.indexOf('+');
  
  if (plusCount === 1 && !/^\(*$/.test(trimmed.slice(0, plusIndex))) {
    return { isValid: false, reason: 'plus-not-at-start' };
  }

  const hasPlus = plusCount === 1;
  // Strip everything except digits (and drop the leading '+' itself now that we've recorded it).
  const digitsOnly = trimmed.replace(/[^\d]/g, '');

  if (digitsOnly.length === 0 || !isDigits(digitsOnly)) {
    return { isValid: false, reason: 'no-digits' };
  }

  let core: string;

  if (hasPlus) {
    // With '+', only the full international form is accepted: +91 followed by exactly 10 digits.
    if (!digitsOnly.startsWith('91') || digitsOnly.length !== 12) {
      return { isValid: false, reason: 'invalid-country-code-or-length' };
    }
    core = digitsOnly.slice(2);
  } else {
    switch (digitsOnly.length) {
      case 10:
        core = digitsOnly;
        break;
      case 11:
        if (!digitsOnly.startsWith('0')) {
          return { isValid: false, reason: 'invalid-length' };
        }
        core = digitsOnly.slice(1);
        break;
      case 12:
        if (!digitsOnly.startsWith('91')) {
          return { isValid: false, reason: 'invalid-length' };
        }
        core = digitsOnly.slice(2);
        break;
      case 14:
        if (!digitsOnly.startsWith('0091')) {
          return { isValid: false, reason: 'invalid-length' };
        }
        core = digitsOnly.slice(4);
        break;
      default:
        return { isValid: false, reason: 'invalid-length' };
    }
  }

  if (!MOBILE_CORE_PATTERN.test(core)) {
    return { isValid: false, reason: 'not-a-valid-mobile-prefix' };
  }

  return { isValid: true, reason: 'valid', normalized: `+91${core}` };
};

export const validatePhone = (phone: string): boolean => validatePhoneDetailed(phone).isValid;