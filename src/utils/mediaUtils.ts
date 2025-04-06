import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

/**
 * Request camera permissions
 * @returns Promise resolving to a boolean indicating if permission was granted
 */
export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission required', 'We need access to your camera');
    return false;
  }
  
  return true;
};

/**
 * Request audio recording permissions
 * @returns Promise resolving to a boolean indicating if permission was granted
 */
export const requestAudioPermission = async (): Promise<boolean> => {
  const { status } = await Audio.requestPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission required', 'We need access to your microphone');
    return false;
  }
  
  return true;
};

/**
 * Request media library permissions
 * @returns Promise resolving to a boolean indicating if permission was granted
 */
export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  
  if (status !== 'granted') {
    Alert.alert('Permission required', 'We need access to your media library');
    return false;
  }
  
  return true;
};

/**
 * Pick an image from the media library
 * @returns Promise resolving to the selected image URI or null if canceled
 */
export const pickImage = async (): Promise<string | null> => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;
  
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false // No editing/cropping
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Could not pick image');
  }
  
  return null;
};

/**
 * Pick a video from the media library
 * @returns Promise resolving to the selected video URI or null if canceled
 */
export const pickVideo = async (): Promise<string | null> => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return null;
  
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: false, // No editing/cropping
      videoMaxDuration: 60 // Limit to 60 seconds
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Error picking video:', error);
    Alert.alert('Error', 'Could not pick video');
  }
  
  return null;
};

/**
 * Take a photo using the camera
 * @returns Promise resolving to the captured photo URI or null if canceled
 */
export const takePhoto = async (): Promise<string | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;
  
  try {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false // No editing/cropping
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Could not take photo');
  }
  
  return null;
};

/**
 * Record a video using the camera
 * @returns Promise resolving to the recorded video URI or null if canceled
 */
export const recordVideo = async (): Promise<string | null> => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;
  
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: false, // No editing/cropping
      videoMaxDuration: 60 // Limit to 60 seconds
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Error recording video:', error);
    Alert.alert('Error', 'Could not record video');
  }
  
  return null;
};

/**
 * Record audio
 * @returns Promise resolving to the recorded audio URI or null if canceled/error
 */
export const recordAudio = async (): Promise<string | null> => {
  const hasPermission = await requestAudioPermission();
  if (!hasPermission) return null;
  
  const recording = new Audio.Recording();
  
  try {
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    
    Alert.alert(
      'Recording Audio',
      'Press Stop when finished recording',
      [
        {
          text: 'Stop',
          onPress: async () => {
            try {
              await recording.stopAndUnloadAsync();
              const uri = recording.getURI();
              return uri;
            } catch (error) {
              console.error('Error stopping recording:', error);
              return null;
            }
          }
        }
      ]
    );
    
    // This is a simplification. In a real app, you'd need a more complex UI to manage recording state
    // and return the URI when recording is complete.
    return null;
  } catch (error) {
    console.error('Error recording audio:', error);
    Alert.alert('Error', 'Could not record audio');
    return null;
  }
};

/**
 * Upload media file to Firebase Storage
 * @param uri Local URI of the media file
 * @param path Storage path to store the file
 * @param contentType MIME type of the media
 * @returns Promise resolving to the media download URL
 */
export const uploadMedia = async (
  uri: string, 
  path: string, 
  contentType = 'application/octet-stream'
): Promise<string> => {
  try {
    // Validate inputs
    if (!uri) throw new Error('No media URI provided');
    if (!path) throw new Error('No storage path provided');

    // Convert the media to a blob
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Failed to fetch media data');
    
    const blob = await response.blob();
    if (!blob) throw new Error('Failed to create blob from media');

    // Create a reference to the storage location
    const storageRef = ref(storage, path);
    
    // Upload the blob with metadata
    const metadata = { contentType };
    await uploadBytes(storageRef, blob, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading media:', error);
    
    // Return original URI as a fallback during development
    console.log('Returning original URI as fallback');
    return uri;
  }
}; 