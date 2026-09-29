import { inspectFile, inspectFiles } from '../src/Fileinspector';

describe('inspectFile', () => {
  describe('image MIME types', () => {
    it.each([
      ['image/jpeg', 'jpeg'],
      ['image/jpg', 'jpeg'],
      ['image/png', 'png'],
      ['image/heic', 'heic'],
      ['image/heif', 'heic'],
    ])('%s -> %s', (type, kind) => {
      expect(inspectFile({ type })).toMatchObject({ category: 'image', kind, isRecognized: true });
    });
  });

  describe('document MIME types', () => {
    it.each([
      ['application/pdf', 'pdf'],
      ['application/msword', 'word'],
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word'],
      ['application/vnd.ms-excel', 'excel'],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'excel'],
      ['application/vnd.ms-powerpoint', 'powerpoint'],
      ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'powerpoint'],
      ['text/csv', 'csv'],
      ['text/plain', 'text'],
    ])('%s -> %s', (type, kind) => {
      expect(inspectFile({ type })).toMatchObject({ category: 'document', kind, isRecognized: true });
    });
  });

  describe('MIME type case and whitespace', () => {
    it('is case-insensitive', () => {
      expect(inspectFile({ type: 'IMAGE/JPEG' })).toMatchObject({ category: 'image', kind: 'jpeg' });
      expect(inspectFile({ type: 'Application/PDF' })).toMatchObject({ category: 'document', kind: 'pdf' });
    });

    it('trims surrounding whitespace', () => {
      expect(inspectFile({ type: '  image/png  ' })).toMatchObject({ category: 'image', kind: 'png' });
    });

    it('strips a trailing charset parameter', () => {
      const result = inspectFile({ type: 'text/plain; charset=utf-8' });
      expect(result).toMatchObject({ category: 'document', kind: 'text' });
      expect(result.mimeType).toBe('text/plain');
    });

    it('strips a trailing parameter with no space after the semicolon', () => {
      expect(inspectFile({ type: 'text/csv;charset=UTF-8' })).toMatchObject({ category: 'document', kind: 'csv' });
    });

    it('strips a boundary parameter', () => {
      expect(inspectFile({ type: 'application/pdf; boundary=xyz' })).toMatchObject({ category: 'document', kind: 'pdf' });
    });

    it('whitespace-only type is treated as no type', () => {
      expect(inspectFile({ type: '   ' })).toMatchObject({ category: 'unknown', mimeType: null });
    });

    it('type that is only a parameter separator resolves to no type', () => {
      expect(inspectFile({ type: ';charset=utf-8' })).toMatchObject({ category: 'unknown', mimeType: null });
    });
  });

  describe('extension fallback', () => {
    it.each([
      ['photo.jpg', 'image', 'jpeg'],
      ['photo.jpeg', 'image', 'jpeg'],
      ['photo.png', 'image', 'png'],
      ['photo.heic', 'image', 'heic'],
      ['photo.heif', 'image', 'heic'],
      ['file.pdf', 'document', 'pdf'],
      ['file.doc', 'document', 'word'],
      ['file.docx', 'document', 'word'],
      ['file.xls', 'document', 'excel'],
      ['file.xlsx', 'document', 'excel'],
      ['file.ppt', 'document', 'powerpoint'],
      ['file.pptx', 'document', 'powerpoint'],
      ['file.csv', 'document', 'csv'],
      ['file.txt', 'document', 'text'],
    ])('%s -> %s/%s', (name, category, kind) => {
      expect(inspectFile({ name })).toMatchObject({ category, kind, isRecognized: true });
    });

    it('is used only when no MIME type is present', () => {
      expect(inspectFile({ name: 'report.docx' }).mimeType).toBeNull();
    });

    it('is case-insensitive', () => {
      expect(inspectFile({ name: 'IMAGE.JPG' })).toMatchObject({ category: 'image', kind: 'jpeg' });
      expect(inspectFile({ name: 'REPORT.PDF' })).toMatchObject({ category: 'document', kind: 'pdf' });
    });

    it('trims a trailing space in the filename', () => {
      expect(inspectFile({ name: 'invoice.pdf ' })).toMatchObject({ category: 'document', kind: 'pdf', extension: 'pdf' });
    });

    it('trims a leading space in the filename', () => {
      expect(inspectFile({ name: '  invoice.pdf' })).toMatchObject({ category: 'document', kind: 'pdf', extension: 'pdf' });
    });

    it('trims both leading and trailing whitespace', () => {
      expect(inspectFile({ name: '  invoice.pdf  ' })).toMatchObject({ extension: 'pdf' });
    });
  });

  describe('MIME vs extension precedence', () => {
    it('MIME wins when both are present and they disagree', () => {
      expect(inspectFile({ name: 'weird.txt', type: 'application/pdf' })).toMatchObject({ category: 'document', kind: 'pdf' });
    });

    it('falls back to extension when the MIME type is unrecognized', () => {
      const result = inspectFile({ name: 'report.docx', type: 'application/octet-stream' });
      expect(result).toMatchObject({ category: 'document', kind: 'word', isRecognized: true });
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('stays unknown when neither an unrecognized MIME type nor the extension match anything', () => {
      expect(inspectFile({ name: 'archive.zip', type: 'application/octet-stream' })).toMatchObject({
        category: 'unknown',
        isRecognized: false,
      });
    });

    it('reports the MIME type even when it does not match anything', () => {
      const result = inspectFile({ type: 'application/octet-stream' });
      expect(result.mimeType).toBe('application/octet-stream');
      expect(result.category).toBe('unknown');
    });
  });

  describe('unrecognized files', () => {
    it('unknown MIME type and no matching extension', () => {
      const result = inspectFile({ name: 'clip.mp4', type: 'video/mp4' });
      expect(result).toMatchObject({ category: 'unknown', kind: null, isRecognized: false });
    });

    it('no name and no type', () => {
      expect(inspectFile({ size: 100 })).toMatchObject({
        category: 'unknown',
        kind: null,
        mimeType: null,
        extension: null,
        isRecognized: false,
      });
    });

    it('filename with no extension', () => {
      expect(inspectFile({ name: 'README' }).extension).toBeNull();
    });

    it('filename ending in a dot', () => {
      expect(inspectFile({ name: 'file.' }).extension).toBeNull();
    });

    it('dotfile with no further extension is treated as the extension', () => {
      expect(inspectFile({ name: '.gitignore' }).extension).toBe('gitignore');
    });

    it('uses the last dot when the filename has several', () => {
      expect(inspectFile({ name: 'my.backup.report.2026.pdf' })).toMatchObject({
        category: 'document',
        kind: 'pdf',
        extension: 'pdf',
      });
    });

    it('unrecognized extension', () => {
      expect(inspectFile({ name: 'archive.zip' })).toMatchObject({ category: 'unknown', extension: 'zip', isRecognized: false });
    });
  });

  describe('size', () => {
    it('a valid positive size', () => {
      expect(inspectFile({ size: 12345 })).toMatchObject({ sizeBytes: 12345, hasKnownSize: true });
    });

    it('zero is a known size', () => {
      expect(inspectFile({ size: 0 })).toMatchObject({ sizeBytes: 0, hasKnownSize: true });
    });

    it('missing size', () => {
      expect(inspectFile({})).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });

    it('null size', () => {
      expect(inspectFile({ size: null })).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });

    it('undefined size', () => {
      expect(inspectFile({ size: undefined })).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });

    it('negative size', () => {
      expect(inspectFile({ size: -1 })).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });

    it('NaN size', () => {
      expect(inspectFile({ size: NaN })).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });

    it('Infinity size', () => {
      expect(inspectFile({ size: Infinity })).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });

    it('non-numeric size', () => {
      expect(inspectFile({ size: '500' as any })).toMatchObject({ sizeBytes: null, hasKnownSize: false });
    });
  });

  describe('malformed input', () => {
    it('null file does not throw', () => {
      expect(() => inspectFile(null)).not.toThrow();
      expect(inspectFile(null)).toMatchObject({ category: 'unknown', sizeBytes: null, hasKnownSize: false });
    });

    it('undefined file does not throw', () => {
      expect(() => inspectFile(undefined)).not.toThrow();
      expect(inspectFile(undefined)).toMatchObject({ category: 'unknown', sizeBytes: null, hasKnownSize: false });
    });

    it('empty object', () => {
      expect(inspectFile({})).toMatchObject({ category: 'unknown', mimeType: null, extension: null, sizeBytes: null });
    });

    it('empty string name and type', () => {
      expect(inspectFile({ name: '', type: '' })).toMatchObject({ category: 'unknown', mimeType: null, extension: null });
    });
  });

  describe('return shape', () => {
    it('always returns all fields', () => {
      const result = inspectFile({ name: 'a.pdf', type: 'application/pdf', size: 10 });
      expect(Object.keys(result).sort()).toEqual(
        ['category', 'kind', 'mimeType', 'extension', 'isRecognized', 'sizeBytes', 'hasKnownSize'].sort(),
      );
    });
  });
});

describe('inspectFiles', () => {
  it('inspects each file and preserves order', () => {
    const results = inspectFiles([{ type: 'image/png' }, { type: 'application/pdf' }, { name: 'x.docx' }]);
    expect(results.map((r) => r.category)).toEqual(['image', 'document', 'document']);
    expect(results.map((r) => r.kind)).toEqual(['png', 'pdf', 'word']);
  });

  it('empty array', () => {
    expect(inspectFiles([])).toEqual([]);
  });

  it('a bad entry in the batch does not affect the others', () => {
    const results = inspectFiles([{ type: 'image/jpeg' }, null as any, { type: 'application/pdf' }]);
    expect(results[0].category).toBe('image');
    expect(results[1].category).toBe('unknown');
    expect(results[2].category).toBe('document');
  });
});