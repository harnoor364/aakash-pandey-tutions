import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { PickedFile } from './api';

/** Profile photo: square crop (oval guide on Android), resized for a fast upload; shown as a circle. */
export async function pickProfilePhoto(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && Platform.OS !== 'web') {
    Alert.alert('Photos access needed', 'Please allow access to your photos in Settings to add a profile photo.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], shape: 'oval', quality: 0.9 });
  if (res.canceled || !res.assets[0]) return null;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 600 } }], { compress: 0.8, format: SaveFormat.JPEG });
  return { uri: out.uri, mimeType: 'image/jpeg', name: 'photo.jpg' };
}

/** A document photo (ID, certificate, address proof) from the camera or gallery. */
export async function pickDocument(source: 'camera' | 'library'): Promise<PickedFile | null> {
  const perm = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted && Platform.OS !== 'web') {
    Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photos'} access in Settings.`);
    return null;
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.85 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;
  const out = await manipulateAsync(res.assets[0].uri, [{ resize: { width: 1600 } }], { compress: 0.8, format: SaveFormat.JPEG });
  return { uri: out.uri, mimeType: 'image/jpeg', name: 'document.jpg' };
}
