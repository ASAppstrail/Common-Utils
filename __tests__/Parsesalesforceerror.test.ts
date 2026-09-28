import { parseSalesforceError } from '../src/Parsesalesforceerror';


const D = 'Something went wrong. Please try again.';
const WSDL = ' Please reference your WSDL or the describe call for the appropriate names.';

const HEADERS = {
  'cache-control': ['no-cache,must-revalidate,max-age=0,no-store,private'],
  'content-type': ['application/json;charset=UTF-8'],
  date: ['Fri, 21 Aug 2026 10:23:30 GMT'],
  server: ['sfdcedge'],
  'sforce-limit-info': ['api-usage=15907/5000000'],
  'x-request-id': ['21db44547b7fb4514686a6d554745eb1'],
};

const bridgeFailure = (statusCode: number, body: unknown, method = 'sendRequest'): string =>
  `SalesforceNetReactBridge.${method} failed: ${JSON.stringify(
    JSON.stringify({ response: { headers: HEADERS, statusCode, body } }),
  )}`;

const item = (message: string, errorCode: string, fields?: string[]) =>
  fields ? { message, errorCode, fields } : { message, errorCode };

/** Builds a SOQL error message the way Salesforce does: query, caret line, "ERROR at Row", then the real text. */
const soql = (query: string, caretCol: number, tail: string, row = 1): string =>
  `\n${query}\n${' '.repeat(caretCol)}^\nERROR at Row:${row}:Column:${caretCol + 1}\n${tail}`;

/** Every parsed result must be a clean sentence, never a raw envelope. */
const expectClean = (actual: string, expected: string) => {
  expect(actual).toBe(expected);
  expect(actual).not.toMatch(/SalesforceNetReactBridge|"response"|statusCode|ERROR at Row|WSDL/);
};

// ---------------------------------------------------------------------------
// The exact error reported from the app, pasted verbatim (String.raw keeps every backslash).
// ---------------------------------------------------------------------------
const VERBATIM_SAMPLE = String.raw`SalesforceNetReactBridge.sendRequest failed: "{\"response\":{\"headers\":{\"cache-control\":[\"no-cache,must-revalidate,max-age=0,no-store,private\"],\"content-type\":[\"application\\/json;charset=UTF-8\"],\"date\":[\"Fri, 21 Aug 2026 10:23:30 GMT\"],\"server\":[\"sfdcedge\"],\"set-cookie\":[\"CookieConsentPolicy=0:1; path=\\/; expires=Sat, 21-Aug-2027 10:23:30 GMT; Max-Age=31536000; secure\",\"LSKey-c$CookieConsentPolicy=0:1; path=\\/; expires=Sat, 21-Aug-2027 10:23:30 GMT; Max-Age=31536000; secure\",\"BrowserId=WzNfhJ1KEfGnJ0VRV7Nvtg; domain=.[salesforce.com](http://salesforce.com); path=\\/; expires=Sat, 21-Aug-2027 10:23:30 GMT; Max-Age=31536000; secure; SameSite=None\"],\"sforce-limit-info\":[\"api-usage=15907\\/5000000\"],\"strict-transport-security\":[\"max-age=63072000; includeSubDomains\"],\"vary\":[\"Accept-Encoding\"],\"x-content-type-options\":[\"nosniff\"],\"x-request-id\":[\"21db44547b7fb4514686a6d554745eb1\"],\"x-robots-tag\":[\"none\"],\"x-sfdc-request-id\":[\"21db44547b7fb4514686a6d554745eb1\"]},\"statusCode\":400,\"body\":[{\"message\":\"\\nSELECT Id, Dispenser__c, Answer__c, Audit_Question__c\\n           ^\\nERROR at Row:1:Column:12\\nNo such column 'Dispenser__c' on entity 'Audit_Answer__c'. If you are attempting to use a custom field, be sure to append the '__c' after the custom field name. Please reference your WSDL or the describe call for the appropriate names.\",\"errorCode\":\"INVALID_FIELD\"}]}}"`;

const VERBATIM_EXPECTED =
  "No such column 'Dispenser__c' on entity 'Audit_Answer__c'. If you are attempting to use a custom field, be sure to append the '__c' after the custom field name.";

describe('parseSalesforceError', () => {
  // -------------------------------------------------------------------------
  describe('verbatim error from the app', () => {
    it('fixture is what we think it is (double-encoded, 400, INVALID_FIELD)', () => {
      const payload = VERBATIM_SAMPLE.replace('SalesforceNetReactBridge.sendRequest failed: ', '');
      const decoded = JSON.parse(JSON.parse(payload));
      expect(decoded.response.statusCode).toBe(400);
      expect(decoded.response.body[0].errorCode).toBe('INVALID_FIELD');
    });

    it('parses the raw string', () => {
      expectClean(parseSalesforceError(VERBATIM_SAMPLE), VERBATIM_EXPECTED);
    });

    it('parses it when thrown as an Error', () => {
      expectClean(parseSalesforceError(new Error(VERBATIM_SAMPLE)), VERBATIM_EXPECTED);
    });

    it('parses it when wrapped in { message }', () => {
      expectClean(parseSalesforceError({ message: VERBATIM_SAMPLE }), VERBATIM_EXPECTED);
    });

    it('parses it with surrounding whitespace / newlines', () => {
      expectClean(parseSalesforceError(`\n  ${VERBATIM_SAMPLE}  \n`), VERBATIM_EXPECTED);
    });

    it('is idempotent (parsing the clean result again returns it unchanged)', () => {
      const once = parseSalesforceError(VERBATIM_SAMPLE);
      expect(parseSalesforceError(once)).toBe(once);
    });
  });

  // -------------------------------------------------------------------------
  describe('SOQL query errors (message = query + caret + "ERROR at Row" + text)', () => {
    const cases: [string, string, string][] = [
      [
        'INVALID_FIELD in SELECT list',
        soql('SELECT Id, Foo__c FROM Bar__c', 11,
          "No such column 'Foo__c' on entity 'Bar__c'. If you are attempting to use a custom field, be sure to append the '__c' after the custom field name." + WSDL),
        "No such column 'Foo__c' on entity 'Bar__c'. If you are attempting to use a custom field, be sure to append the '__c' after the custom field name.",
      ],
      [
        'INVALID_FIELD in WHERE clause',
        soql("SELECT Id FROM Bar__c WHERE Missing__c = 'x'", 30,
          "No such column 'Missing__c' on entity 'Bar__c'. If you are attempting to use a custom field, be sure to append the '__c' after the custom field name." + WSDL),
        "No such column 'Missing__c' on entity 'Bar__c'. If you are attempting to use a custom field, be sure to append the '__c' after the custom field name.",
      ],
      [
        'INVALID_FIELD bad relationship',
        soql('SELECT Id, Owner__r.Name FROM Bar__c', 11,
          "Didn't understand relationship 'Owner__r' in field path. If you are attempting to use a custom relationship, be sure to append the '__r' after the custom relationship name." + WSDL),
        "Didn't understand relationship 'Owner__r' in field path. If you are attempting to use a custom relationship, be sure to append the '__r' after the custom relationship name.",
      ],
      [
        'INVALID_TYPE unknown object',
        soql('SELECT Id FROM Missing__c', 15,
          "sObject type 'Missing__c' is not supported. If you are attempting to use a custom object, be sure to append the '__c' after the entity name." + WSDL),
        "sObject type 'Missing__c' is not supported. If you are attempting to use a custom object, be sure to append the '__c' after the entity name.",
      ],
      ['MALFORMED_QUERY unexpected token', soql('SELECT Id, FROM Bar__c', 11, "unexpected token: 'FROM'"), "unexpected token: 'FROM'"],
      ['MALFORMED_QUERY unexpected EOF', soql('SELECT Id FROM Bar__c WHERE', 27, "unexpected token: '<EOF>'"), "unexpected token: '<EOF>'"],
      ['MALFORMED_QUERY invalid ID', soql("SELECT Id FROM Bar__c WHERE Id = 'abc'", 34, 'invalid ID field: abc'), 'invalid ID field: abc'],
      [
        'multi-line query, error on row 3',
        soql('SELECT Id\nFROM Bar__c\nWHERE Nope__c = 1', 6, "No such column 'Nope__c' on entity 'Bar__c'." + WSDL, 3),
        "No such column 'Nope__c' on entity 'Bar__c'.",
      ],
      [
        'CRLF line endings',
        '\r\nSELECT Id, Foo__c FROM Bar__c\r\n           ^\r\nERROR at Row:1:Column:12\r\nNo such column \'Foo__c\' on entity \'Bar__c\'.' + WSDL,
        "No such column 'Foo__c' on entity 'Bar__c'.",
      ],
      [
        'older format with colon after column',
        '\nSELECT Id, Foo__c FROM Bar__c\n           ^\nERROR at Row:1:Column:12: No such column \'Foo__c\' on entity \'Bar__c\'.',
        "No such column 'Foo__c' on entity 'Bar__c'.",
      ],
      [
        'WSDL hint without trailing period',
        soql('SELECT Foo__c FROM Bar__c', 7, "No such column 'Foo__c' on entity 'Bar__c'. Please reference your WSDL or the describe call for the appropriate names"),
        "No such column 'Foo__c' on entity 'Bar__c'.",
      ],
    ];

    it.each(cases)('%s (bridge, 400)', (_name, message, expected) => {
      const code = _name.split(' ')[0].replace('MALFORMED_QUERY', 'MALFORMED_QUERY');
      expectClean(parseSalesforceError(bridgeFailure(400, [item(message, code)])), expected);
    });

    it.each(cases)('%s (already-decoded body)', (_name, message, expected) => {
      expectClean(parseSalesforceError({ response: { statusCode: 400, body: [item(message, 'X')] } }), expected);
    });
  });

  // -------------------------------------------------------------------------
  describe('REST / sObject CRUD errors (body = [{ message, errorCode, fields? }])', () => {
    type RestCase = [name: string, status: number, errorCode: string, message: string, fields?: string[]];
    const cases: RestCase[] = [
      ['required field missing', 400, 'REQUIRED_FIELD_MISSING', 'Required fields are missing: [Name]', ['Name']],
      ['validation rule', 400, 'FIELD_CUSTOM_VALIDATION_EXCEPTION', 'Photo is required before submitting the audit.', []],
      ['string too long', 400, 'STRING_TOO_LONG', 'Name: data value too large: Some very long name (max length=80)', ['Name']],
      ['restricted picklist', 400, 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST', 'Status__c: bad value for restricted picklist field: Unknown', ['Status__c']],
      ['duplicate value', 400, 'DUPLICATE_VALUE', 'duplicate value found: External_Id__c duplicates value on record with id: a01xx000003DGb2AAG', []],
      ['invalid cross reference', 400, 'INVALID_CROSS_REFERENCE_KEY', 'invalid cross reference id', []],
      ['field not writable', 400, 'INVALID_FIELD_FOR_INSERT_UPDATE', 'Unable to create/update fields: Formula__c. Please check the security settings of this field and verify that it is read/write for your profile or permission set.', ['Formula__c']],
      ['invalid email', 400, 'INVALID_EMAIL_ADDRESS', 'Email: invalid email address: not-an-email', ['Email']],
      ['number out of range', 400, 'NUMBER_OUTSIDE_VALID_RANGE', 'Score__c: value outside of valid range on numeric field: 1000', ['Score__c']],
      ['malformed id', 400, 'MALFORMED_ID', 'malformed id abc123', []],
      ['unknown field on create', 400, 'INVALID_FIELD', "No such column 'Foo__c' on sobject of type Bar__c", []],
      ['entity deleted', 400, 'ENTITY_IS_DELETED', 'entity is deleted', []],
      ['delete blocked', 400, 'DELETE_FAILED', 'Your attempt to delete Audit Question could not be completed because it is associated with the following answers.', []],
      ['row lock', 400, 'UNABLE_TO_LOCK_ROW', 'unable to obtain exclusive access to this record or 1 records: a01xx000003DGb2AAG', []],
      ['query timeout', 400, 'QUERY_TIMEOUT', 'Your query request was running for too long.', []],
      ['JSON parse error (multi-line)', 400, 'JSON_PARSER_ERROR', "Unexpected character ('}' (code 125)): was expecting double-quote to start field name\n at [line:1, column:2]", []],
      ['trigger failure (multi-line)', 400, 'CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY', 'Audit_Trigger: execution of BeforeInsert\n\ncaused by: System.NullPointerException: Attempt to de-reference a null object\n\nClass.AuditHandler.run: line 10, column 1\nTrigger.Audit_Trigger: line 3, column 1', []],
      ['session expired', 401, 'INVALID_SESSION_ID', 'Session expired or invalid'],
      ['insufficient access (readonly)', 403, 'INSUFFICIENT_ACCESS_OR_READONLY', 'insufficient access rights on cross-reference id', []],
      ['insufficient access (object)', 403, 'INSUFFICIENT_ACCESS', 'insufficient access rights on object id', []],
      ['api disabled', 403, 'API_DISABLED_FOR_ORG', 'API is not enabled for this Organization or Partner'],
      ['request limit', 403, 'REQUEST_LIMIT_EXCEEDED', 'TotalRequests Limit exceeded.'],
      ['not found', 404, 'NOT_FOUND', 'The requested resource does not exist'],
      ['invalid query locator', 404, 'INVALID_QUERY_LOCATOR', 'Invalid query locator'],
      ['method not allowed', 405, 'METHOD_NOT_ALLOWED', "HTTP Method 'DELETE' not allowed. Allowed are HEAD,GET,PATCH"],
      ['unsupported media type', 415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported Media Type'],
      ['unhandled Apex REST exception (multi-line)', 500, 'APEX_ERROR', 'System.QueryException: List has no rows for assignment to SObject\n\nClass.AuditService.getAnswer: line 42, column 1'],
      ['unknown exception with ErrorId', 500, 'UNKNOWN_EXCEPTION', 'An unexpected error occurred. Please include this ErrorId if you contact support: 1234567890-12345 (-1234567890)'],
      ['server unavailable', 503, 'SERVER_UNAVAILABLE', 'Server Unavailable'],
    ];

    it.each(cases)('%s [%i %s]', (_name, status, errorCode, message, ...rest) => {
      const fields = rest[0];
      const expected = message.trim();
      expectClean(parseSalesforceError(bridgeFailure(status, [item(message, errorCode, fields)])), expected);
      expectClean(parseSalesforceError(new Error(bridgeFailure(status, [item(message, errorCode, fields)]))), expected);
    });

    it('single error object instead of an array (Connect-style)', () => {
      expectClean(
        parseSalesforceError(bridgeFailure(404, { errorCode: 'NOT_FOUND', message: 'The requested resource does not exist' })),
        'The requested resource does not exist',
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('OAuth / login errors ({ error, error_description })', () => {
    const cases: [string, unknown, string][] = [
      ['invalid_grant (refresh token)', { error: 'invalid_grant', error_description: 'expired access/refresh token' }, 'expired access/refresh token'],
      ['invalid_grant (auth failure)', { error: 'invalid_grant', error_description: 'authentication failure' }, 'authentication failure'],
      ['invalid_client_id', { error: 'invalid_client_id', error_description: 'client identifier invalid' }, 'client identifier invalid'],
      ['invalid_request', { error: 'invalid_request', error_description: 'missing required parameter: grant_type' }, 'missing required parameter: grant_type'],
      ['unsupported_grant_type', { error: 'unsupported_grant_type', error_description: 'grant type not supported' }, 'grant type not supported'],
      ['error without description', { error: 'invalid_grant' }, 'invalid_grant'],
    ];

    it.each(cases)('%s (bridge, 400)', (_n, body, expected) => {
      expectClean(parseSalesforceError(bridgeFailure(400, body)), expected);
    });

    it.each(cases)('%s (bare body)', (_n, body, expected) => {
      expect(parseSalesforceError(body)).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  describe('multiple errors in one response', () => {
    it('joins distinct messages with "; "', () => {
      const body = [
        item('Required fields are missing: [Name]', 'REQUIRED_FIELD_MISSING', ['Name']),
        item('Email: invalid email address: x', 'INVALID_EMAIL_ADDRESS', ['Email']),
      ];
      expectClean(parseSalesforceError(bridgeFailure(400, body)), 'Required fields are missing: [Name]; Email: invalid email address: x');
    });

    it('de-duplicates identical messages', () => {
      const body = [item('Same', 'A'), item('Same', 'B'), item('Other', 'C'), item('Same', 'D')];
      expectClean(parseSalesforceError(bridgeFailure(400, body)), 'Same; Other');
    });

    it('preserves the order Salesforce returned', () => {
      const body = [item('First', 'A'), item('Second', 'B'), item('Third', 'C')];
      expectClean(parseSalesforceError(bridgeFailure(400, body)), 'First; Second; Third');
    });

    it('cleans each SOQL message independently', () => {
      const body = [
        item(soql('SELECT A__c FROM X__c', 7, "No such column 'A__c' on entity 'X__c'." + WSDL), 'INVALID_FIELD'),
        item('Plain message', 'OTHER'),
      ];
      expectClean(parseSalesforceError(bridgeFailure(400, body)), "No such column 'A__c' on entity 'X__c'.; Plain message");
    });
  });

  // -------------------------------------------------------------------------
  describe('composite, batch, collections, tree and graph responses', () => {
    it('sObject Collections: returns only the failed records', () => {
      const body = [
        { id: '001xx000003DGb2AAG', success: true, errors: [] },
        { id: null, success: false, errors: [{ statusCode: 'REQUIRED_FIELD_MISSING', message: 'Required fields are missing: [Name]', fields: ['Name'] }] },
        { id: null, success: false, errors: [{ statusCode: 'DUPLICATE_VALUE', message: 'duplicate value found: Code__c', fields: [] }] },
      ];
      expectClean(parseSalesforceError(bridgeFailure(200, body)), 'Required fields are missing: [Name]; duplicate value found: Code__c');
    });

    it('sObject Collections with AllOrNone rollback message', () => {
      const body = [
        { id: null, success: false, errors: [{ statusCode: 'ALL_OR_NONE_OPERATION_ROLLED_BACK', message: 'Record rolled back because not all records were valid and the request was using AllOrNone header', fields: [] }] },
        { id: null, success: false, errors: [{ statusCode: 'REQUIRED_FIELD_MISSING', message: 'Required fields are missing: [Name]', fields: ['Name'] }] },
      ];
      const result = parseSalesforceError(bridgeFailure(200, body));
      expect(result).toContain('Required fields are missing: [Name]');
      expect(result).toContain('rolled back');
    });

    it('sObject Tree: { hasErrors, results: [{ referenceId, errors }] }', () => {
      const body = {
        hasErrors: true,
        results: [{ referenceId: 'ref1', errors: [{ statusCode: 'INVALID_EMAIL_ADDRESS', message: 'Email: invalid email address: x', fields: ['Email'] }] }],
      };
      expectClean(parseSalesforceError(bridgeFailure(400, body)), 'Email: invalid email address: x');
    });

    it('Composite Batch: { hasErrors, results: [{ statusCode, result }] } (skips successes)', () => {
      const body = {
        hasErrors: true,
        results: [
          { statusCode: 201, result: { id: '001xx000003DGb2AAG', success: true, errors: [] } },
          { statusCode: 400, result: [item('Required fields are missing: [Name]', 'REQUIRED_FIELD_MISSING', ['Name'])] },
        ],
      };
      expectClean(parseSalesforceError(bridgeFailure(200, body)), 'Required fields are missing: [Name]');
    });

    it('Composite: { compositeResponse: [{ body, httpHeaders, httpStatusCode, referenceId }] }', () => {
      const body = {
        compositeResponse: [
          { body: { id: '001xx000003DGb2AAG', success: true, errors: [] }, httpHeaders: {}, httpStatusCode: 201, referenceId: 'newAccount' },
          { body: [item('Required fields are missing: [LastName]', 'REQUIRED_FIELD_MISSING', ['LastName'])], httpHeaders: {}, httpStatusCode: 400, referenceId: 'newContact' },
        ],
      };
      expectClean(parseSalesforceError(bridgeFailure(200, body)), 'Required fields are missing: [LastName]');
    });

    it('Composite with allOrNone: real error plus PROCESSING_HALTED siblings', () => {
      const halted = [item('The transaction was rolled back since another operation in the same transaction failed.', 'PROCESSING_HALTED')];
      const body = {
        compositeResponse: [
          { body: halted, httpHeaders: {}, httpStatusCode: 400, referenceId: 'a' },
          { body: [item('Required fields are missing: [Name]', 'REQUIRED_FIELD_MISSING', ['Name'])], httpHeaders: {}, httpStatusCode: 400, referenceId: 'b' },
          { body: halted, httpHeaders: {}, httpStatusCode: 400, referenceId: 'c' },
        ],
      };
      const result = parseSalesforceError(bridgeFailure(200, body));
      expect(result).toContain('Required fields are missing: [Name]');
      expect(result.split('; ').filter((m) => m.includes('rolled back')).length).toBe(1); // de-duplicated
    });

    it('Composite Graph: { graphs: [{ graphResponse: { compositeResponse } }] }', () => {
      const body = {
        graphs: [
          {
            graphId: 'graph1',
            graphResponse: {
              compositeResponse: [
                { body: [item('Required fields are missing: [Name]', 'REQUIRED_FIELD_MISSING', ['Name'])], httpHeaders: {}, httpStatusCode: 400, referenceId: 'r1' },
              ],
            },
            isSuccessful: false,
          },
        ],
      };
      expectClean(parseSalesforceError(bridgeFailure(200, body)), 'Required fields are missing: [Name]');
    });

    it('all-success composite yields the generic message (nothing to report)', () => {
      const body = { compositeResponse: [{ body: { id: '1', success: true, errors: [] }, httpHeaders: {}, httpStatusCode: 201, referenceId: 'a' }] };
      expect(parseSalesforceError(bridgeFailure(200, body))).toBe(D);
    });
  });

  // -------------------------------------------------------------------------
  describe('non-JSON / infrastructure responses', () => {
    it('HTML gateway page is not shown to the user', () => {
      expect(parseSalesforceError(bridgeFailure(502, '<html><body><h1>502 Bad Gateway</h1></body></html>'))).toBe(D);
    });

    it('HTML with leading whitespace is also hidden', () => {
      expect(parseSalesforceError(bridgeFailure(503, '\n  <!DOCTYPE html><html></html>'))).toBe(D);
    });

    it('plain-text body passes through', () => {
      expectClean(parseSalesforceError(bridgeFailure(502, 'Bad Gateway')), 'Bad Gateway');
    });

    it('empty / missing bodies give the generic message', () => {
      for (const body of [undefined, null, '', [], {}, [{}]]) {
        expect(parseSalesforceError(bridgeFailure(500, body))).toBe(D);
      }
    });

    it('body arriving as a JSON string is decoded', () => {
      expectClean(
        parseSalesforceError(bridgeFailure(400, JSON.stringify([item('Inner string body', 'X')]))),
        'Inner string body',
      );
    });
  });

  // -------------------------------------------------------------------------
  describe('envelope / input forms', () => {
    const body = [item('Session expired or invalid', 'INVALID_SESSION_ID')];
    const expected = 'Session expired or invalid';
    const inner = { response: { headers: HEADERS, statusCode: 401, body } };

    it.each<[string, unknown]>([
      ['bridge string', bridgeFailure(401, body)],
      ['Error wrapping bridge string', new Error(bridgeFailure(401, body))],
      ['TypeError wrapping bridge string', new TypeError(bridgeFailure(401, body))],
      ['{ message } wrapping bridge string', { message: bridgeFailure(401, body) }],
      ['double-encoded JSON without prefix', JSON.stringify(JSON.stringify(inner))],
      ['single-encoded JSON without prefix', JSON.stringify(inner)],
      ['already-parsed { response }', inner],
      ['already-parsed { statusCode, body }', { statusCode: 401, body }],
      ['body array only', body],
      ['single error object', body[0]],
      ['other bridge method (dotted)', bridgeFailure(401, body, 'someOtherCall')],
      ['module-level prefix (no method)', `SalesforceNetReactBridge failed: ${JSON.stringify(JSON.stringify(inner))}`],
      ['lower-case prefix', bridgeFailure(401, body).replace('SalesforceNetReactBridge.sendRequest failed', 'salesforcenetreactbridge.sendrequest failed')],
      ['extra spaces after prefix', bridgeFailure(401, body).replace('failed: ', 'failed:     ')],
    ])('%s', (_name, input) => {
      expectClean(parseSalesforceError(input), expected);
    });

    it('axios/fetch-style wrapper: outer generic message is ignored in favour of the Salesforce body', () => {
      expectClean(parseSalesforceError({ message: 'Request failed with status code 401', response: { statusCode: 401, body } }), expected);
    });

    it('prefix-like text that is NOT a bridge prefix is kept', () => {
      expect(parseSalesforceError('Upload failed: file too large')).toBe('Upload failed: file too large');
    });

    it('offline / timeout style plain errors pass through', () => {
      for (const m of ['Network request failed', 'The request timed out.', 'TypeError: Failed to fetch']) {
        expect(parseSalesforceError(new Error(m))).toBe(m);
      }
    });
  });

  // -------------------------------------------------------------------------
  describe('message content is preserved', () => {
    it.each<[string, string]>([
      ['apostrophes and quotes', `Can't save "Audit" — it's locked`],
      ['backslashes', 'Path C:\\temp\\file failed validation'],
      ['unicode and emoji', 'Ünïcödé name ✓ 日本語 😀 is not allowed'],
      ['percent and braces', 'Value 100% {invalid} [bad] <tag> not allowed'],
      ['leading / trailing whitespace is trimmed', '   padded message   '],
    ])('%s', (_name, message) => {
      expectClean(parseSalesforceError(bridgeFailure(400, [item(message, 'X')])), message.trim());
    });

    it('very long messages are not truncated', () => {
      const long = 'x'.repeat(10000);
      expect(parseSalesforceError(bridgeFailure(400, [item(long, 'X')]))).toBe(long);
    });
  });

  // -------------------------------------------------------------------------
  describe('fallbacks and robustness', () => {
    it.each<[string, unknown]>([
      ['null', null],
      ['undefined', undefined],
      ['empty string', ''],
      ['whitespace string', '   \n\t '],
      ['number', 42],
      ['boolean', true],
      ['empty object', {}],
      ['empty array', []],
      ['object with unrelated fields', { foo: 'bar', id: 1 }],
      ['{ error: true }', { error: true }],
      ['{ error: 500 }', { error: 500 }],
      ['{ message: 42 }', { message: 42 }],
      ['{ message: {} }', { message: {} }],
      ['empty errors array', { errors: [] }],
      ['Error with empty message', new Error('')],
      ['bridge failure with empty response', bridgeFailure(500, undefined)],
    ])('generic message for %s', (_name, input) => {
      expect(parseSalesforceError(input)).toBe(D);
    });

    it('falls back to own message when errors array is empty', () => {
      expect(parseSalesforceError({ message: 'Real message', errors: [] })).toBe('Real message');
    });

    it('collects siblings instead of stopping at the first wrapper', () => {
      expect(parseSalesforceError({ result: { message: 'from result' }, errors: [{ message: 'from errors' }] })).toBe('from result; from errors');
    });

    it('numeric / boolean-looking messages are kept, not dropped', () => {
      expect(parseSalesforceError(new Error('500'))).toBe('500');
      expect(parseSalesforceError('true')).toBe('true');
    });

    it('nested object under error is read', () => {
      expect(parseSalesforceError({ error: { code: 'INVALID_SESSION_ID', message: 'Session expired' } })).toBe('Session expired');
    });

    it('does not loop forever on cyclic objects', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.body = cyclic;
      cyclic.response = cyclic;
      expect(parseSalesforceError(cyclic)).toBe(D);
    });

    it('stops at the depth limit for absurdly nested payloads', () => {
      let deep: unknown = { message: 'too deep to find' };
      for (let i = 0; i < 30; i++) deep = { body: deep };
      expect(parseSalesforceError(deep)).toBe(D);
    });

    it('still finds messages at realistic nesting depth', () => {
      let nested: unknown = { message: 'found it' };
      for (let i = 0; i < 4; i++) nested = { body: nested };
      expect(parseSalesforceError(nested)).toBe('found it');
    });

    it('never throws on hostile input', () => {
      const weird: unknown[] = [Symbol('x'), () => 1, new Date(), /re/, new Map(), new Set(), Object.create(null), [[[[]]]], BigInt(1)];
      for (const input of weird) expect(() => parseSalesforceError(input)).not.toThrow();
    });

    it('always returns a non-empty string', () => {
      for (const input of [null, {}, [], '', new Error('x'), bridgeFailure(500, [])]) {
        const result = parseSalesforceError(input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});