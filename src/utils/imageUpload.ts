import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Request permission to access the photo library
 * @returns Promise resolving to a boolean indicating if permission was granted
 */
export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (!permissionResult.granted) {
    Alert.alert('Permission required', 'We need access to your photos to upload images');
    return false;
  }
  
  return true;
};

/**
 * Opens the image picker UI to select an image
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
 * Uploads an image to Firebase Storage
 * @param uri Local URI of the image to upload
 * @param path Storage path to store the image
 * @returns Promise resolving to the image download URL or the original URI if upload fails
 */
export const uploadImage = async (uri: string, path: string): Promise<string> => {
  try {
    // Validate inputs
    if (!uri) throw new Error('No image URI provided');
    if (!path) throw new Error('No storage path provided');

    // Convert the image to a blob
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Failed to fetch image data');
    
    const blob = await response.blob();
    if (!blob) throw new Error('Failed to create blob from image');

    // Validate blob size (max 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error('Image size exceeds 5MB limit');
    }

    // Create a reference to the storage location
    const storageRef = ref(storage, path);
    
    // Upload the blob with metadata
    const metadata = {
      contentType: 'image/jpeg',
    };
    await uploadBytes(storageRef, blob, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    
    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      Alert.alert('Storage Error', 'Not authorized to upload images. Please check Firebase permissions.');
    } else if (error.code === 'storage/canceled') {
      Alert.alert('Storage Error', 'Image upload was cancelled');
    } else if (error.code === 'storage/unknown') {
      Alert.alert('Storage Setup Required', 
        'Firebase Storage is not set up for this project. Please set up Firebase Storage in the Firebase console.'
      );
    } else if (error.code === 'storage/invalid-argument') {
      Alert.alert('Storage Error', 'Invalid storage path');
    } else {
      Alert.alert('Upload Error', 'Failed to upload image. Using local image instead.');
    }
    
    // Return the original URI as fallback
    // This allows the app to continue working even without Firebase Storage
    return uri;
  }
}; 