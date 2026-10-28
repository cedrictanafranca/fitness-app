import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateComposer } from '@/features/log/composer-store';
import { Button, Chip, Icon, Notice } from '@/features/log/components/ui';
import { cancelLogFlow } from '@/features/log/nav';
import { errorMessage } from '@/features/log/format';
import { CAMERA_PICTURE_OPTIONS, fromCameraPicture, pickFromLibrary } from '@/services/camera';

const CORNER = 36;

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [flash, setFlash] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => router.back();

  const shoot = async () => {
    if (busy || !camera.current) return;
    setBusy(true);
    setError(null);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const pic = await camera.current.takePictureAsync(CAMERA_PICTURE_OPTIONS);
      const photo = fromCameraPicture(pic);
      if (!photo) throw new Error('The photo could not be read. Please try again.');
      updateComposer({ photo });
      done();
    } catch (e) {
      setError(errorMessage(e, 'Could not take the photo. You can pick one from your library instead.'));
      setBusy(false);
    }
  };

  const library = async () => {
    if (busy) return;
    setError(null);
    try {
      const photo = await pickFromLibrary();
      if (photo) {
        updateComposer({ photo });
        done();
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not load that photo.'));
    }
  };

  if (!permission) return <View style={styles.root} />;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>Camera access is off</Text>
        <Text style={styles.sub}>
          Allow camera access to photograph your meal, or choose an existing photo instead.
        </Text>
        <View style={styles.permButtons}>
          {permission.canAskAgain ? (
            <Button label="Allow camera" onPress={() => void requestPermission()} />
          ) : (
            <Button label="Open Settings" onPress={() => void Linking.openSettings()} />
          )}
          <Button label="Choose from library" variant="secondary" onPress={library} />
          <Button label="Cancel" variant="secondary" onPress={cancelLogFlow} />
        </View>
        {error ? <Notice tone="bad">{error}</Notice> : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        flash={flash ? 'on' : 'off'}
        onCameraReady={() => setReady(true)}
        onMountError={(e) => setError(e.message)}
      />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close camera" onPress={cancelLogFlow} style={styles.round}>
          <Icon name="xmark" fallback="×" size={18} color="#fff" />
        </Pressable>
      </View>

      <View pointerEvents="none" style={styles.frame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {error ? (
          <View style={styles.errorWrap}>
            <Notice tone="bad">{error}</Notice>
          </View>
        ) : null}
        <View style={styles.modes}>
          <Chip label="Scan Food" selected />
          <Chip label="Barcode" disabled />
          <Chip label="Food label" disabled />
        </View>
        <Text style={styles.soon}>Barcode and food label: coming soon</Text>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flash ? 'Turn flash off' : 'Turn flash on'}
            onPress={() => setFlash((f) => !f)}
            style={styles.side}>
            <Icon name={flash ? 'bolt.fill' : 'bolt.slash.fill'} fallback={flash ? 'On' : 'Off'} size={22} color="#fff" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            disabled={!ready || busy}
            onPress={shoot}
            style={[styles.shutterOuter, { opacity: ready && !busy ? 1 : 0.5 }]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose from library" onPress={library} style={styles.side}>
            <Icon name="photo" fallback="Lib" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  sub: { color: '#bbb', fontSize: 15, textAlign: 'center' },
  permButtons: { gap: 12 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { position: 'absolute', top: '22%', bottom: '34%', left: 32, right: 32 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 12, paddingHorizontal: 16 },
  errorWrap: { marginBottom: 4 },
  modes: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  soon: { color: '#bbb', fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  side: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
});
