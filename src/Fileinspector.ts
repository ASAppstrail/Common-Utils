export type FileCategory = 'image' | 'document' | 'unknown';

export type DocumentKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'csv' | 'text' | null;
export type ImageKind = 'jpeg' | 'png' | 'heic' | null;

export interface FileLike {
  size?: number | null;
  name?: string | null;
  type?: string | null;
}

export interface FileInfo {
  category: FileCategory;
  kind: ImageKind | DocumentKind;
  mimeType: string | null;
  extension: string | null;
  isRecognized: boolean;
  sizeBytes: number | null;
  hasKnownSize: boolean;
}

const MIME_MAP: Record<string, { category: FileCategory; kind: ImageKind | DocumentKind }> = {
  'image/jpeg': { category: 'image', kind: 'jpeg' },
  'image/jpg': { category: 'image', kind: 'jpeg' },
  'image/png': { category: 'image', kind: 'png' },
  'image/heic': { category: 'image', kind: 'heic' },
  'image/heif': { category: 'image', kind: 'heic' },
  'application/pdf': { category: 'document', kind: 'pdf' },
  'application/msword': { category: 'document', kind: 'word' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { category: 'document', kind: 'word' },
  'application/vnd.ms-excel': { category: 'document', kind: 'excel' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { category: 'document', kind: 'excel' },
  'application/vnd.ms-powerpoint': { category: 'document', kind: 'powerpoint' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { category: 'document', kind: 'powerpoint' },
  'text/csv': { category: 'document', kind: 'csv' },
  'text/plain': { category: 'document', kind: 'text' },
};

const EXTENSION_MAP: Record<string, { category: FileCategory; kind: ImageKind | DocumentKind }> = {
  jpg: { category: 'image', kind: 'jpeg' },
  jpeg: { category: 'image', kind: 'jpeg' },
  png: { category: 'image', kind: 'png' },
  heic: { category: 'image', kind: 'heic' },
  heif: { category: 'image', kind: 'heic' },
  pdf: { category: 'document', kind: 'pdf' },
  doc: { category: 'document', kind: 'word' },
  docx: { category: 'document', kind: 'word' },
  xls: { category: 'document', kind: 'excel' },
  xlsx: { category: 'document', kind: 'excel' },
  ppt: { category: 'document', kind: 'powerpoint' },
  pptx: { category: 'document', kind: 'powerpoint' },
  csv: { category: 'document', kind: 'csv' },
  txt: { category: 'document', kind: 'text' },
};

const getExtension = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot < 0 || dot === trimmed.length - 1) return null;
  return trimmed.slice(dot + 1).toLowerCase();
};

export const inspectFile = (file: FileLike | null | undefined): FileInfo => {
  const extension = getExtension(file?.name);
  const rawMime = file?.type?.toLowerCase().trim() || null;
  const reportedMime = rawMime ? rawMime.split(';')[0].trim() || null : null;

  const byMime = reportedMime ? MIME_MAP[reportedMime] : undefined;
  const byExtension = !byMime && extension ? EXTENSION_MAP[extension] : undefined;
  const matched = byMime ?? byExtension;

  const sizeBytes =
    typeof file?.size === 'number' && Number.isFinite(file.size) && file.size >= 0 ? file.size : null;

  return {
    category: matched?.category ?? 'unknown',
    kind: matched?.kind ?? null,
    mimeType: reportedMime,
    extension,
    isRecognized: Boolean(matched),
    sizeBytes,
    hasKnownSize: sizeBytes !== null,
  };
};

export const inspectFiles = (files: FileLike[]): FileInfo[] => files.map(inspectFile);