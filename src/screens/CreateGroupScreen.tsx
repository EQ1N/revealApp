import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, NavigationProp, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { createGroup } from '../services/groupService';
import { Timestamp } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { pickImage, uploadImage } from '../utils/imageUpload';
import CreateGroupTypeModal from '../components/CreateGroupTypeModal';

// Define the navigation param list type
type RootStackParamList = {
  Home: undefined;
  Chat: { groupId: string; groupName: string; revealDate: any };
  CreateGroup: { isPublic?: boolean };
  JoinGroup: undefined;
  GroupSettings: { groupId: string };
};

// Define the navigation prop type
type CreateGroupScreenNavigationProp = NavigationProp<RootStackParamList, 'CreateGroup'>;
type CreateGroupScreenRouteProp = RouteProp<RootStackParamList, 'CreateGroup'>;

const CreateGroupScreen = () => {
  const navigation = useNavigation<CreateGroupScreenNavigationProp>();
  const route = useRoute<CreateGroupScreenRouteProp>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [allowAllToPost, setAllowAllToPost] = useState(true);
  const [revealPerMessage, setRevealPerMessage] = useState(false);
  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  
  // Reference to measure the position of the indicator
  const groupTypeIndicatorRef = useRef<View>(null);
  const [indicatorPosition, setIndicatorPosition] = useState<{x: number, y: number, width: number, height: number} | undefined>();

  // Set isPublic based on the route param if available
  useEffect(() => {
    if (route.params?.isPublic !== undefined) {
      setIsPublic(route.params.isPublic);
    }
  }, [route.params]);

  // Handle group type selection from modal
  const handleSelectType = (type: 'public' | 'private') => {
    setShowTypeModal(false);
    setIsPublic(type === 'public');
  };
  
  // Measure the position of the indicator before showing the modal
  const handleShowTypeModal = () => {
    if (groupTypeIndicatorRef.current) {
      groupTypeIndicatorRef.current.measure((x, y, width, height, pageX, pageY) => {
        setIndicatorPosition({
          x: pageX,
          y: pageY,
          width,
          height
        });
        setShowTypeModal(true);
      });
    } else {
      setShowTypeModal(true);
    }
  };

  // Update allowAllToPost when revealPerMessage changes
  const handleRevealPerMessageChange = (value: boolean) => {
    setRevealPerMessage(value);
    if (value) {
      // If reveal per message is enabled, disable allow all to post
      setAllowAllToPost(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handlePickImage = async () => {
    try {
      setUploadingImage(true);
      const imageUri = await pickImage([9, 16]); // Change to 9:16 aspect ratio
      if (imageUri) {
        setCoverImage(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not pick image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    // Only validate the reveal date if revealPerMessage is false
    if (!revealPerMessage && date <= new Date()) {
      Alert.alert('Error', 'Reveal date must be in the future');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to create a group');
      return;
    }

    try {
      setLoading(true);
      
      let coverImageUrl = null;
      
      // Upload cover image if selected
      if (coverImage) {
        try {
          const imagePath = `groups/${Date.now()}.jpg`;
          coverImageUrl = await uploadImage(coverImage, imagePath);
          
          // If the coverImageUrl is the same as the original URI (due to a storage error),
          // alert the user that we're using a local reference instead
          if (coverImageUrl === coverImage) {
            console.log('Using local image reference instead of Firebase Storage URL');
          }
        } catch (error) {
          console.error('Error uploading cover image:', error);
          // Continue with group creation even if image upload fails
        }
      }
      
      const groupData = {
        name: name.trim(),
        description: description.trim(),
        isPublic,
        // If revealPerMessage is true, force allowAllToPost to false
        allowAllToPost: revealPerMessage ? false : allowAllToPost,
        revealPerMessage,
        // If revealPerMessage is true, use a far future date as placeholder
        revealDate: revealPerMessage 
          ? Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) // 1 year in future as placeholder
          : Timestamp.fromDate(date),
        createdBy: auth.currentUser.uid,
        ownerId: auth.currentUser.uid,
        members: [], // Will be initialized in the service
        ...(coverImageUrl && { coverImage: coverImageUrl })
      };

      const groupId = await createGroup(groupData);
      setLoading(false);
      
      // Use CommonActions.reset to clear the navigation stack
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'MainTabs' },
            { 
              name: 'Chat', 
              params: {
                groupId,
                groupName: name,
                revealDate: revealPerMessage ? null : date
              }
            },
          ],
        })
      );
      
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to create group');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Reveal</Text>
      </View>
      
      <ScrollView style={styles.form}>
        {/* Group Type Indicator */}
        <TouchableOpacity 
          style={styles.groupTypeContainer}
          onPress={handleShowTypeModal}
        >
          <View 
            ref={groupTypeIndicatorRef}
            style={styles.groupTypeIndicator}
          >
            <Ionicons 
              name={isPublic ? "globe-outline" : "lock-closed-outline"} 
              size={20} 
              color="#FFD700" 
            />
            <Text style={styles.groupTypeText}>
              {isPublic ? "Public Reveal" : "Private Reveal"}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Profile-style layout with image on left */}
        <View style={styles.profileLayout}>
          {/* Cover Image Column */}
          <View style={styles.profileImageColumn}>
            <Text style={styles.label}>Cover</Text>
            <TouchableOpacity 
              style={styles.profileImageContainer}
              onPress={handlePickImage}
              disabled={uploadingImage}
            >
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  {uploadingImage ? (
                    <ActivityIndicator color="#FFD700" size="large" />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={40} color="#666" />
                      <Text style={styles.uploadText}>Tap to upload</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Name and Description */}
          <View style={styles.profileInfo}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter reveal name"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Short description"
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Reveal Per Message</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={revealPerMessage ? "#FFD700" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={handleRevealPerMessageChange}
            value={revealPerMessage}
          />
        </View>
        
        {!revealPerMessage && (
          <>
            <Text style={styles.label}>Reveal Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {date.toLocaleDateString()} at {date.toLocaleTimeString()}
              </Text>
              <Ionicons name="calendar" size={24} color="#FFD700" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="datetime"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow All Members to Post</Text>
              <Switch
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={allowAllToPost ? "#FFD700" : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={setAllowAllToPost}
                value={allowAllToPost}
              />
            </View>
          </>
        )}
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateGroup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Reveal</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <CreateGroupTypeModal
        visible={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        onSelectType={handleSelectType}
        mode="indicator"
        indicatorPosition={indicatorPosition}
        currentSelection={isPublic ? 'public' : 'private'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  descriptionInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  imageUploadContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    height: 180,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  placeholderContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonText: {
    fontWeight: 'bold',
    color: '#000',
  },
  groupTypeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  groupTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  groupTypeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  profileLayout: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  profileImageColumn: {
    width: 100,
    marginRight: 16,
  },
  profileImageContainer: {
    width: 100,
    height: 136, // Exact measurement to match input fields height
    borderRadius: 8,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginTop: 8, // Adjust to align with the top of the Name input field
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 10,
  },
  profileInfo: {
    flex: 1,
  },
  inputFieldsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputFieldsColumn: {
    flex: 1,
    marginLeft: 16,
  },
});

export default CreateGroupScreen; 