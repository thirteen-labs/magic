import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  kind: 'image' | 'text' | 'file';
  dataUrl?: string;
  textContent?: string;
  uri?: string;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'log',
  'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'kt', 'swift',
  'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'html', 'css',
  'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'sh', 'sql',
]);

const MAX_TEXT_CHARS = 20000;
const MAX_IMAGE_BASE64_CHARS = 4_500_000; // ~3.3MB binary

function guessMime(name: string, fallback = 'application/octet-stream'): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  if (ext === 'json') return 'application/json';
  if (ext === 'csv') return 'text/csv';
  return fallback;
}

async function readTextFile(uri: string, maxChars = MAX_TEXT_CHARS): Promise<string | null> {
  try {
    const text = await LegacyFS.readAsStringAsync(uri, {
      encoding: LegacyFS.EncodingType.UTF8,
    });
    return text.slice(0, maxChars);
  } catch {
    // fall through to File/blob + fetch fallbacks
  }
  try {
    const file = new File(uri);
    const maybeText = (file as unknown as { text?: () => Promise<string> }).text;
    if (typeof maybeText === 'function') {
      const text = await maybeText.call(file);
      return text.slice(0, maxChars);
    }
  } catch {
    // fall through to fetch fallback
  }
  try {
    const res = await fetch(uri);
    const text = await res.text();
    return text.slice(0, maxChars);
  } catch {
    return null;
  }
}

export async function pickImages(): Promise<ChatAttachment[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
  if (permission && permission.granted === false) {
    throw new Error('Media library permission denied.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 4,
    quality: 0.7,
    base64: true,
    exif: false,
  });
  if (result.canceled) return [];
  const out: ChatAttachment[] = [];
  for (const asset of result.assets ?? []) {
    const mime = asset.mimeType ?? guessMime(asset.fileName ?? 'image.jpg', 'image/jpeg');
    const base64 = (asset as { base64?: string }).base64;
    if (!base64) continue;
    const dataUrl = `data:${mime};base64,${base64}`;
    if (dataUrl.length > MAX_IMAGE_BASE64_CHARS + 100) {
      throw new Error(`Image ${asset.fileName ?? 'image'} is too large (keep under ~3MB).`);
    }
    out.push({
      id: makeId('img'),
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      mimeType: mime,
      size: asset.fileSize,
      kind: 'image',
      dataUrl,
      uri: asset.uri,
    });
  }
  return out;
}

export async function pickDocuments(): Promise<ChatAttachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'image/*',
      'application/pdf',
      'text/*',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return [];
  const out: ChatAttachment[] = [];
  for (const asset of result.assets ?? []) {
    const name = asset.name ?? `file-${Date.now()}`;
    const mime = asset.mimeType ?? guessMime(name);
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const isImage = mime.startsWith('image/');
    const isTextLike = mime.startsWith('text/') || TEXT_EXTENSIONS.has(ext) || mime === 'application/json';

    if (isImage) {
      // Read image as base64 data URL for vision models
      let dataUrl: string | undefined;
      try {
        const b64 = await LegacyFS.readAsStringAsync(asset.uri, {
          encoding: LegacyFS.EncodingType.Base64,
        });
        dataUrl = `data:${mime};base64,${b64}`;
      } catch {
        try {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('read failed'));
            reader.readAsDataURL(blob);
          });
        } catch {
          dataUrl = undefined;
        }
      }
      out.push({
        id: makeId('img'),
        name,
        mimeType: mime,
        size: asset.size,
        kind: dataUrl ? 'image' : 'file',
        dataUrl,
        uri: asset.uri,
      });
      continue;
    }

    if (isTextLike) {
      const text = asset.uri ? await readTextFile(asset.uri) : null;
      out.push({
        id: makeId('doc'),
        name,
        mimeType: mime,
        size: asset.size,
        kind: text ? 'text' : 'file',
        textContent: text ?? undefined,
        uri: asset.uri,
      });
      continue;
    }

    out.push({
      id: makeId('file'),
      name,
      mimeType: mime,
      size: asset.size ?? undefined,
      kind: 'file',
      uri: asset.uri,
    });
  }
  return out;
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentSummary(a: ChatAttachment): string {
  const size = a.size ? ` (${formatFileSize(a.size)})` : '';
  if (a.kind === 'image') return `Image: ${a.name}${size}`;
  if (a.kind === 'text') return `Document: ${a.name}${size}`;
  return `File: ${a.name}${size} [${a.mimeType}]`;
}
