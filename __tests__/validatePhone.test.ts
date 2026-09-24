import { validatePhone, validatePhoneDetailed } from '../src/validatePhone';

describe('validatePhone - basic input handling', () => {
  it('rejects non-string and nullish inputs', () => {
    expect(validatePhone(null as unknown as string)).toBe(false);
    expect(validatePhone(undefined as unknown as string)).toBe(false);
    expect(validatePhone(12345 as unknown as string)).toBe(false);
    expect(validatePhone({} as unknown as string)).toBe(false);
    expect(validatePhone([] as unknown as string)).toBe(false);
  });

  it('rejects empty and whitespace-only strings', () => {
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('   ')).toBe(false);
  });

  it('rejects input longer than any legitimate formatted phone number', () => {
    expect(validatePhone('+91 98765 43210 extra junk appended here')).toBe(false);
  });

  it('rejects non-digit garbage', () => {
    expect(validatePhone('98765abcde')).toBe(false);
    expect(validatePhone('abcdefghij')).toBe(false);
    expect(validatePhone('98765-4321x')).toBe(false);
  });

  it('rejects multiple plus signs or a plus not at the start', () => {
    expect(validatePhone('++919876543210')).toBe(false);
    expect(validatePhone('9876543210+')).toBe(false);
    expect(validatePhone('91+9876543210')).toBe(false);
  });
});

describe('validatePhone - core 10-digit mobile validation', () => {
  it('accepts all four valid starting digits', () => {
    expect(validatePhone('6876543210')).toBe(true);
    expect(validatePhone('7876543210')).toBe(true);
    expect(validatePhone('8876543210')).toBe(true);
    expect(validatePhone('9876543210')).toBe(true);
  });

  it('rejects numbers starting with 0-5 (landline / invalid ranges, out of scope by design)', () => {
    expect(validatePhone('0876543210')).toBe(false);
    expect(validatePhone('1876543210')).toBe(false);
    expect(validatePhone('2876543210')).toBe(false);
    expect(validatePhone('3876543210')).toBe(false);
    expect(validatePhone('4876543210')).toBe(false);
    expect(validatePhone('5876543210')).toBe(false);
  });

  it('rejects a 9-digit number (too short)', () => {
    expect(validatePhone('987654321')).toBe(false);
  });

  it('rejects an 11-digit number with no recognizable prefix', () => {
    expect(validatePhone('98765432101')).toBe(false);
  });

  it('rejects a toll-free-shaped number (1800xxxxxxx)', () => {
    expect(validatePhone('1800123456')).toBe(false);
  });

  it('rejects a Delhi-landline-shaped number (starts with 11)', () => {
    expect(validatePhone('1123456789')).toBe(false);
  });
});

describe('validatePhone - country code and prefix handling', () => {
  it('accepts +91 followed by exactly 10 digits, with or without a space', () => {
    expect(validatePhone('+919876543210')).toBe(true);
    expect(validatePhone('+91 9876543210')).toBe(true);
  });

  it('rejects +91 with wrong digit count', () => {
    expect(validatePhone('+9198765432')).toBe(false); // 8 digits after code
    expect(validatePhone('+91987654321099')).toBe(false); // too many
  });

  it('rejects a non-Indian country code', () => {
    expect(validatePhone('+1 9876543210')).toBe(false); // US
    expect(validatePhone('+44 7911123456')).toBe(false); // UK
    expect(validatePhone('+92 3001234567')).toBe(false); // Pakistan
  });

  it('accepts bare 91-prefixed 12-digit numbers (no plus)', () => {
    expect(validatePhone('919876543210')).toBe(true);
  });

  it('does NOT misinterpret a 10-digit number that happens to start with 91', () => {
    // "9187654321" is a plain valid 10-digit mobile number starting 9-1-8...,
    // must NOT be treated as country-code-91 + 8-digit garbage.
    expect(validatePhone('9187654321')).toBe(true);
  });

  it('accepts a trunk-0-prefixed 11-digit number', () => {
    expect(validatePhone('09876543210')).toBe(true);
  });

  it('rejects an 11-digit number starting with something other than 0', () => {
    expect(validatePhone('19876543210')).toBe(false);
  });

  it('accepts the ISD access code form (0091 + 10 digits)', () => {
    expect(validatePhone('00919876543210')).toBe(true);
  });

  it('rejects a malformed hybrid: +91 followed by a trunk 0 and 10 digits', () => {
    expect(validatePhone('+9109876543210')).toBe(false);
  });
});

describe('validatePhone - formatting tolerance', () => {
  it('accepts common separators: spaces, hyphens, dots, parentheses', () => {
    expect(validatePhone('98765 43210')).toBe(true);
    expect(validatePhone('98765-43210')).toBe(true);
    expect(validatePhone('98765.43210')).toBe(true);
    expect(validatePhone('(+91) 98765 43210')).toBe(true);
    expect(validatePhone('+91-98765-43210')).toBe(true);
  });

  it('accepts surrounding whitespace padding', () => {
    expect(validatePhone('  9876543210  ')).toBe(true);
  });

  it('strips parentheses regardless of position, since they are treated as pure formatting noise', () => {
    expect(validatePhone('9)8765(43210')).toBe(true);
  });
});

describe('validatePhoneDetailed - normalized output and reasons', () => {
  it('returns a canonical E.164 normalized form for every accepted format', () => {
    expect(validatePhoneDetailed('9876543210').normalized).toBe('+919876543210');
    expect(validatePhoneDetailed('+91 9876543210').normalized).toBe('+919876543210');
    expect(validatePhoneDetailed('09876543210').normalized).toBe('+919876543210');
    expect(validatePhoneDetailed('919876543210').normalized).toBe('+919876543210');
    expect(validatePhoneDetailed('0091 9876543210').normalized).toBe('+919876543210');
  });

  it('always populates a reason string, on both pass and fail', () => {
    expect(validatePhoneDetailed('9876543210').reason).toBe('valid');
    expect(validatePhoneDetailed('').reason.length).toBeGreaterThan(0);
    expect(validatePhoneDetailed('123').reason.length).toBeGreaterThan(0);
  });

  it('does not attach a normalized field when invalid', () => {
    expect(validatePhoneDetailed('123').normalized).toBeUndefined();
  });
});


const SYNTHETIC_VALID_NUMBERS: string[] = [
    "9538670036",
    "+916793297806",
    "+91 9176654017",
    "+91-89641-99524",
    "919524021400",
    "08924896083",
    "00916211381737",
    "(+91) 76487 76804",
    "+91.67055.16937",
    "  7663918975  ",
    "6578158977",
    "+918058738374",
    "+91 8283943212",
    "+91-67319-91930",
    "917017387072",
    "06217446521",
    "00917428763522",
    "(+91) 74727 93645",
    "+91.96293.39363",
    "  7064262238  ",
    "8588352879",
    "+917397738277",
    "+91 6944330133",
    "+91-78633-86841",
    "918033047532",
    "07969690136",
    "00916332450315",
    "(+91) 77824 13367",
    "+91.93163.41621",
    "  7355051173  ",
    "7194269279",
    "+919847388350",
    "+91 6064312694",
    "+91-63376-00109",
    "916151209568",
    "06442517651",
    "00917136447858",
    "(+91) 68771 02125",
    "+91.64979.05309",
    "  6441735844  ",
    "6128557329",
    "+917430698025",
    "+91 8213100501",
    "+91-86679-89710",
    "918058442982",
    "08557132984",
    "00919676721870",
    "(+91) 92351 81524",
    "+91.67825.26185",
    "  8248960262  ",
    "8959839784",
    "+916949678200",
    "+91 6349430767",
    "+91-70876-06741",
    "917121880969",
    "09780852897",
    "00916313181076",
    "(+91) 78091 95222",
    "+91.95124.77203",
    "  9097481464  ",
    "8509861454",
    "+916352008770",
    "+91 7765926369",
    "+91-67902-59984",
    "918625410255",
    "09764515616",
    "00916721503044",
    "(+91) 74677 94574",
    "+91.83317.83567",
    "  7731660070  ",
    "9824355501",
    "+917117901573",
    "+91 7411840941",
    "+91-93758-07933",
    "917605488403",
    "06686410269",
    "00918038199833",
    "(+91) 86663 36053",
    "+91.62701.42989",
    "  8400216115  ",
    "6729338475",
    "+916402935891",
    "+91 7364243965",
    "+91-67704-55605",
    "919030004777",
    "06045147293",
    "00918612868382",
    "(+91) 85616 84726",
    "+91.70925.40596",
    "  9685050077  ",
    "7451169681",
    "+916125486099",
    "+91 8820783344",
    "+91-84508-40266",
    "918616484798",
    "06922732292",
    "00919557777951",
    "(+91) 71658 59603",
    "+91.83091.78527",
    "  9929562482  ",
    "6552004506",
    "+919831733984",
    "+91 6700741482",
    "+91-81857-18541",
    "917585740539",
    "08160233473",
    "00919209317466",
    "(+91) 83715 30306",
    "+91.62536.99311",
    "  8880753374  ",
    "8520203720",
    "+916072390924",
    "+91 7864500978",
    "+91-74881-04947",
    "917473640368",
    "08608303520",
    "00916282369375",
    "(+91) 79854 18858",
    "+91.94871.22457",
    "  9031071585  ",
    "9270948313",
    "+918163753717",
    "+91 6827139883",
    "+91-82661-54487",
    "919335775253",
    "09801949742",
    "00919239924099",
    "(+91) 74827 63562",
    "+91.79573.12102",
    "  8007128884  ",
    "9769623304",
    "+919872257864",
    "+91 8019666648",
    "+91-99554-52535",
    "919609391486",
    "06263548312",
    "00917457771296",
    "(+91) 67432 31828",
    "+91.84971.41944",
    "  6056027875  ",
    "6019214692",
    "+919114717925",
    "+91 7670983993",
    "+91-77659-06819",
    "918913347702",
    "07253935100",
    "00919635402198",
    "(+91) 94324 84602",
    "+91.63049.01996",
    "  6358727014  "
];

describe('validatePhone - synthetic real-world-format corpus', () => {
  it('has the expected corpus size', () => {
    expect(SYNTHETIC_VALID_NUMBERS.length).toBe(150);
  });

  describe.each(SYNTHETIC_VALID_NUMBERS)('%s', (phone) => {
    it('is accepted by validatePhone', () => {
      expect(validatePhone(phone)).toBe(true);
    });
  });

  it('reports a pass rate summary across the whole corpus', () => {
    const failures = SYNTHETIC_VALID_NUMBERS.filter((p) => !validatePhone(p));
    const passRate = (
      ((SYNTHETIC_VALID_NUMBERS.length - failures.length) / SYNTHETIC_VALID_NUMBERS.length) *
      100
    ).toFixed(1);
    console.log(
      `validatePhone pass rate on synthetic corpus: ${passRate}% ` +
        `(${SYNTHETIC_VALID_NUMBERS.length - failures.length}/${SYNTHETIC_VALID_NUMBERS.length})`
    );
    if (failures.length > 0) {
      console.log('Rejected synthetic valid numbers:', failures);
    }
    expect(failures).toEqual([]);
  });
});


const INVALID_NUMBERS: string[] = [
  '',
  '   ',
  '123',
  '0000000000',
  '1234567890',
  '5432167890',
  '987654321',       // 9 digits
  '98765432101',     // 11 digits, no valid prefix shape
  '+9187654321',     // +91 + 8 digits only
  '+911234567890',   // +91 + 10-digit core (correct length), but core starts with '1' -> invalid mobile prefix
  '+1 9876543210',
  '+44 7911123456',
  '+92 3001234567',
  '191876543210',    // 12 digits not starting with 91
  '99876543210',     // 11 digits not starting with 0
  '1800123456',      // toll-free shape
  '1123456789',      // Delhi landline shape
  '022 12345678',    // Mumbai landline shape (trunk 0 + 10 digits -> core starts with 2, fails mobile-prefix check)
  '98765abcde',
  'nine876543210',
  '++919876543210',
  '9876543210+',
  '91+9876543210',
  '+91 98 765 432 10 99',
  '+920987654321',   // looks close to +92 (Pakistan) with extra digit
];

describe('validatePhone - invalid input corpus', () => {
  describe.each(INVALID_NUMBERS)('%j', (phone) => {
    it('is rejected by validatePhone', () => {
      expect(validatePhone(phone)).toBe(false);
    });
  });
});