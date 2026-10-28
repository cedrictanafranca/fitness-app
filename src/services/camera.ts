/**
 * Camera / photo-library / photo-persistence helpers for the Log flow.
 * Images are requested at quality ~0.6 with base64 so they can go straight to the AI route.
 */

import type { CameraCapturedPicture } from 'expo-camera';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { newId } from '@/data/ids';

export interface CapturedPhoto {
  /** Local (cache) URI — use `persistPhoto` before storing on a meal. */
  uri: string;
  /** Base64 without a data: prefix. */
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

export const PHOTO_QUALITY = 0.6;

/** Options for CameraView.takePictureAsync. */
export const CAMERA_PICTURE_OPTIONS = { quality: PHOTO_QUALITY, base64: true, exif: false } as const;

export function fromCameraPicture(pic: CameraCapturedPicture): CapturedPhoto | null {
  if (!pic.base64) return null;
  return { uri: pic.uri, base64: pic.base64, mimeType: 'image/jpeg' };
}

function fromAsset(asset: ImagePicker.ImagePickerAsset): CapturedPhoto | null {
  if (!asset.base64) return null;
  const mimeType = asset.mimeType?.includes('png') ? 'image/png' : 'image/jpeg';
  return { uri: asset.uri, base64: asset.base64, mimeType };
}

/** Pick one photo from the library. Resolves null if cancelled. Throws on failure. */
export async function pickFromLibrary(): Promise<CapturedPhoto | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: PHOTO_QUALITY,
    base64: true,
    allowsEditing: false,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const photo = fromAsset(result.assets[0]);
  if (!photo) throw new Error('Could not read that image. Try a different photo.');
  return photo;
}

/** System camera UI (fallback where the in-app camera is unavailable). Null if cancelled. */
export async function takeWithSystemCamera(): Promise<CapturedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Camera access is turned off. Enable it in Settings to take photos.');
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: PHOTO_QUALITY,
    base64: true,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const photo = fromAsset(result.assets[0]);
  if (!photo) throw new Error('Could not read the photo. Please try again.');
  return photo;
}

const PHOTO_DIR_NAME = 'meal-photos';

function photoDir(): Directory {
  return new Directory(Paths.document, PHOTO_DIR_NAME);
}

/**
 * Copy an image into the app's document directory so it survives restarts and cache
 * eviction. Returns the new file URI (or the same URI if it already lives there).
 */
export async function persistPhoto(uri: string): Promise<string> {
  const dir = photoDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  if (uri.startsWith(dir.uri)) return uri;
  if (uri.includes(`/${PHOTO_DIR_NAME}/`)) return resolvePhotoUri(uri) ?? uri;
  const ext = uri.split('?')[0].match(/\.(jpe?g|png|heic)$/i)?.[1]?.toLowerCase() ?? 'jpg';
  const dest = new File(dir, `${newId()}.${ext}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

/**
 * iOS can change the app container path across reinstalls/updates, which would break an
 * absolute file:// URI saved earlier. Re-anchor stored meal photos to the current document dir.
 */
export function resolvePhotoUri(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  const marker = `/${PHOTO_DIR_NAME}/`;
  const i = uri.lastIndexOf(marker);
  if (i < 0) return uri;
  return new File(photoDir(), uri.slice(i + marker.length)).uri;
}
