import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/** Copy a picked image into the app's document directory so the URI survives cache purges and restarts. */
export async function persistPhoto(sourceUri: string): Promise<string> {
  try {
    const dir = new Directory(Paths.document, 'recipe-photos');
    dir.create({ intermediates: true, idempotent: true });
    const ext = /\.(png|jpe?g|heic|webp)$/i.exec(sourceUri.split('?')[0])?.[0] ?? '.jpg';
    const dest = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    await new File(sourceUri).copy(dest);
    return dest.uri;
  } catch {
    // Fall back to the original URI (works for this session even if it cannot be copied).
    return sourceUri;
  }
}

/** Open the photo library. Returns a persistent URI, or null when cancelled. */
export async function pickRecipePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return null;
  return persistPhoto(result.assets[0].uri);
}
