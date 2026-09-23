export interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
}

const MAX_LOCAL_LENGTH = 64;
const MAX_DOMAIN_LENGTH = 255;
const MAX_TOTAL_LENGTH = 254;
const BASIC_SHAPE = /^[^\s@]+@[^\s@]+$/;
const LOCAL_PART_CHARS = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_PATTERN =
  /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/;
const TLD_PATTERN = /^[A-Za-z]{2,}$/;

export const validateEmailDetailed = (email: string): EmailValidationResult => {
  if (!email || typeof email !== 'string') {
    return { isValid: false };
  }
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return { isValid: false };
  }
  if (trimmedEmail.length > MAX_TOTAL_LENGTH) {
    return { isValid: false };
  }
  if (!BASIC_SHAPE.test(trimmedEmail)) {
    return { isValid: false };
  }
  const atIndex = trimmedEmail.lastIndexOf('@');
  const localPart = trimmedEmail.slice(0, atIndex);
  const domainPart = trimmedEmail.slice(atIndex + 1);
  if (localPart.length === 0 || localPart.length > MAX_LOCAL_LENGTH) {
    return { isValid: false };
  }
  if (domainPart.length === 0 || domainPart.length > MAX_DOMAIN_LENGTH) {
    return { isValid: false };
  }
  if (!LOCAL_PART_CHARS.test(localPart)) {
    return { isValid: false };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { isValid: false };
  }
  if (!DOMAIN_PATTERN.test(domainPart)) {
    return { isValid: false };
  }
  const labels = domainPart.split('.');
  for (const label of labels) {
    if (label.length > 63 || label.startsWith('-') || label.endsWith('-')) {
      return { isValid: false };
    }
  }
  const tld = labels[labels.length - 1]!;
  if (!TLD_PATTERN.test(tld)) {
    return { isValid: false };
  }
  return { isValid: true };
};

export const validateEmail = (email: string): boolean => validateEmailDetailed(email).isValid;