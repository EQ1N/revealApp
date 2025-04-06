import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  Modal,
  Pressable,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  TextInput,
  Switch,
  ScrollView,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { StatusBar as RNStatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
  serverTimestamp,
  doc,
  getDoc,
  enableNetwork,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { formatDate, getTimeRemaining } from '../utils/helpers';
import { colors } from '../theme/colors';
import { format } from 'date-fns';
import { Video, Audio, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { 
  pickImage, 
  pickVideo, 
  takePhoto, 
  recordVideo, 
  recordAudio, 
  uploadMedia 
} from '../utils/mediaUtils';
import { sendMediaMessage, sendTextMessage, subscribeToMessages, updateRevealedStatus } from '../services/messageService';
import { TMessage } from '../types/message';
import { TGroup } from '../types/group';
import { getStandardHeaderOptions } from '../navigation/HeaderConfig';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import EmojiPicker, { EmojiStyle, Theme, Categories, EmojiClickData } from 'emoji-picker-react';

// Define the navigation param list type
type RootStackParamList = {
  Home: undefined;
  Chat: { groupId: string; groupName: string; revealDate: any };
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupSettings: { groupId: string };
};

// Define the navigation prop type
type ChatScreenNavigationProp = NavigationProp<RootStackParamList, 'Chat'>;
type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

// Define common emoji reactions
const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😢', '🔥'];

// Define common quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😢', '🔥'];

// Emoji categories for the full picker
const EMOJI_CATEGORIES = [
  { name: 'Smileys', icon: '😊', emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙'] },
  { name: 'People', icon: '👨', emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌'] },
  { name: 'Animals', icon: '🐱', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🦆'] },
  { name: 'Food', icon: '🍎', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦'] },
  { name: 'Travel', icon: '🚗', emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🚨', '🚔', '🚍'] },
  { name: 'Activities', icon: '⚽', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣'] },
  { name: 'Objects', icon: '💡', emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥'] },
  { name: 'Symbols', icon: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '♥️', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💌', '💟', '❣️', '💔', '💋'] }
];

// Extend the TMessage type
type TMessageWithReactions = TMessage & {
  reactions?: {
    [emoji: string]: string[]; // Array of user IDs who reacted with this emoji
  };
  // Add optional senderPhotoURL field to message
  senderPhotoURL?: string;
};

// Add a utility function to calculate thumbnail size
const calculateThumbnailSize = (width: number, height: number, maxWidth: number = 120) => {
  const ratio = width / height;
  
  // If portrait (taller than wide)
  if (ratio < 1) {
    const newWidth = Math.min(maxWidth, width * 0.5);
    return {
      width: newWidth,
      height: newWidth / ratio
    };
  } 
  // If landscape or square
  else {
    const newWidth = Math.min(maxWidth, width * 0.5);
    return {
      width: newWidth,
      height: newWidth / ratio
    };
  }
};

// Add a utility function to detect aspect ratio
const detectAspectRatio = (width: number, height: number) => {
  const ratio = width / height;
  
  // Define standard aspect ratios
  const aspectRatios = [
    { name: 'square', value: 1, style: styles.aspectRatioSquare }, // 1:1
    { name: 'landscape', value: 16/9, style: styles.aspectRatioLandscape }, // 16:9
    { name: 'vertical', value: 9/16, style: styles.aspectRatioVertical }, // 9:16
  ];
  
  // Find the closest aspect ratio
  let closest = aspectRatios[0];
  let closestDiff = Math.abs(ratio - closest.value);
  
  for (let i = 1; i < aspectRatios.length; i++) {
    const diff = Math.abs(ratio - aspectRatios[i].value);
    if (diff < closestDiff) {
      closest = aspectRatios[i];
      closestDiff = diff;
    }
  }
  
  return closest;
};

// Add a swipeThreshold constant to determine when a swipe should trigger navigation
const SWIPE_THRESHOLD = 120; // Minimum distance required for a swipe to trigger

// Add gibberish generator function near the top with other utility functions
// Function to generate gibberish text based on original length
const generateGibberish = (text: string | undefined): string => {
  if (!text) return '';
  
  // Return password dots (•) matching the length of the original text
  return '•'.repeat(text.length);
};

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { groupId, groupName } = route.params;
  const [messages, setMessages] = useState<TMessageWithReactions[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [group, setGroup] = useState<TGroup | null>(null);
  const [canPost, setCanPost] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingInstance, setRecordingInstance] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState('');
  const [editedIsPublic, setEditedIsPublic] = useState(false);
  const [editedAllowAllToPost, setEditedAllowAllToPost] = useState(false);
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [isMediaMenuExpanded, setIsMediaMenuExpanded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{uri: string, type: 'image' | 'video' | 'audio', width: number, height: number} | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([]);
  const [isReactionPickerVisible, setIsReactionPickerVisible] = useState(false);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<TMessageWithReactions | null>(null);
  const [isEmojiPickerVisible, setIsEmojiPickerVisible] = useState(false);
  const [mediaDimensions, setMediaDimensions] = useState<{[messageId: string]: {width: number, height: number, aspectRatio: number}}>({});
  const [cachedGibberish, setCachedGibberish] = useState<{[messageId: string]: string}>({});
  
  // Animation refs
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const settingsSlideAnim = useRef(new Animated.Value(500)).current; // Start off-screen
  const spin = useRef(new Animated.Value(0)).current;
  const mediaButtonsAnimation = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const currentUser = auth.currentUser;
  const messageAnimations = useRef<{[key: string]: {height: Animated.Value, opacity: Animated.Value}}>({});
  
  // Gallery state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [galleryMedia, setGalleryMedia] = useState<{uri: string, type: 'image' | 'video'}[]>([]);
  const gallerySwipeAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const [isGalleryTransitioning, setIsGalleryTransitioning] = useState(false);
  
  // Add the galleryPanResponder with improved swipe handling
  const galleryPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal gestures
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
        const hasMovedEnough = Math.abs(gestureState.dx) > 10;
        return isHorizontalSwipe && hasMovedEnough && !isGalleryTransitioning;
      },
      onPanResponderGrant: () => {
        // When touch starts, stop any running animations
        gallerySwipeAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Apply resistance at edges for better feel
        const totalItems = galleryMedia.length;
        if (totalItems <= 1) return;
        
        let dx = gestureState.dx;
        
        // Add resistance if at first item and trying to swipe right
        if (currentGalleryIndex === 0 && dx > 0) {
          dx = dx * 0.3; // Apply resistance
        }
        
        // Add resistance if at last item and trying to swipe left
        if (currentGalleryIndex === totalItems - 1 && dx < 0) {
          dx = dx * 0.3; // Apply resistance
        }
        
        // Update animation value during swipe for visual feedback
        gallerySwipeAnim.setValue(dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isGalleryTransitioning) return;
        
        const velocity = Math.abs(gestureState.vx);
        const totalItems = galleryMedia.length;
        
        // Don't do anything if there are no items or only one item
        if (totalItems <= 1) {
          gallerySwipeAnim.setValue(0);
          return;
        }
        
        // Determine if it's a quick swipe based on velocity
        const isVeryFastSwipe = velocity > 1.0;
        const isFastSwipe = velocity > 0.6;
        
        // Dynamic threshold based on velocity
        let requiredDistanceThreshold;
        
        if (isVeryFastSwipe) {
          requiredDistanceThreshold = screenWidth * 0.1; // 10% of screen width
        } else if (isFastSwipe) {
          requiredDistanceThreshold = screenWidth * 0.2; // 20% of screen width
        } else {
          requiredDistanceThreshold = screenWidth * 0.3; // 30% of screen width
        }
        
        // Check if we're at the boundaries
        const isFirstItem = currentGalleryIndex === 0;
        const isLastItem = currentGalleryIndex === totalItems - 1;
        
        // Swipe right (previous image) - but not if at first item with loop disabled
        if (gestureState.dx > requiredDistanceThreshold && !(isFirstItem && !true)) {
          setIsGalleryTransitioning(true);
          
          // First update the state
          setCurrentGalleryIndex(prev => prev > 0 ? prev - 1 : galleryMedia.length - 1);
          
          // Then complete the swipe animation (animation continues in the same direction)
          Animated.timing(gallerySwipeAnim, {
            toValue: screenWidth,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            // Reset position after animation completes
            gallerySwipeAnim.setValue(0);
            setIsGalleryTransitioning(false);
          });
        } 
        // Swipe left (next image) - but not if at last item with loop disabled
        else if (gestureState.dx < -requiredDistanceThreshold && !(isLastItem && !true)) {
          setIsGalleryTransitioning(true);
          
          // First update the state
          setCurrentGalleryIndex(prev => prev < galleryMedia.length - 1 ? prev + 1 : 0);
          
          // Then complete the swipe animation (animation continues in the same direction)
          Animated.timing(gallerySwipeAnim, {
            toValue: -screenWidth,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            // Reset position after animation completes
            gallerySwipeAnim.setValue(0);
            setIsGalleryTransitioning(false);
          });
        }
        // Not enough distance for a swipe
        else {
          // Return to center with a spring animation
          Animated.spring(gallerySwipeAnim, {
            toValue: 0,
            velocity: velocity,
            tension: 70,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      }
    })
  ).current;
  
  // Add the renderGalleryItem function
  const renderGalleryItem = (item: {uri: string, type: 'image' | 'video'} | undefined, key: string) => {
    if (!item) return <View key={key} style={{width: screenWidth, height: '100%'}} />;
    
    return (
      <View key={key} style={{width: screenWidth, height: '100%', justifyContent: 'center', alignItems: 'center'}}>
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.uri }}
            style={{width: '100%', height: '80%'}}
            resizeMode="contain"
          />
        ) : (
          <View style={{width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000'}}>
            <Video
              source={{ uri: item.uri }}
              style={{width: '100%', height: '100%'}}
              useNativeControls
              resizeMode={ResizeMode.COVER}
              isLooping
            />
          </View>
        )}
      </View>
    );
  };

  // Gallery functions
  const openGallery = (mediaUrl: string, mediaType: 'image' | 'video', index: number) => {
    // Filter all media messages from the chat
    const allMedia = messages
      .filter(msg => msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video'))
      .map(msg => ({
        uri: msg.mediaUrl || '',
        type: msg.mediaType as 'image' | 'video'
      }));

    setGalleryMedia(allMedia);
    setCurrentGalleryIndex(index);
    setGalleryVisible(true);
  };

  // Close the gallery
  const closeGallery = () => {
    setGalleryVisible(false);
    // Reset animation value when closing
    gallerySwipeAnim.setValue(0);
  };

  // Navigate through gallery
  const navigateGallery = (direction: 'next' | 'prev') => {
    if (isGalleryTransitioning) return;
    
    if (direction === 'next') {
      setCurrentGalleryIndex(prev => 
        prev < galleryMedia.length - 1 ? prev + 1 : 0
      );
    } else {
      setCurrentGalleryIndex(prev => 
        prev > 0 ? prev - 1 : galleryMedia.length - 1
      );
    }
  };
  
  // Functions to get adjacent image indices with boundary checks
  const getPrevImageIndex = (currentIndex: number, total: number) => {
    return currentIndex > 0 ? currentIndex - 1 : total - 1;
  };

  const getNextImageIndex = (currentIndex: number, total: number) => {
    return currentIndex < total - 1 ? currentIndex + 1 : 0;
  };
  
  // Get animation values for timestamp animations
  const getAnimationValues = (messageId: string) => {
    return messageAnimations.current[messageId];
  };
  
  // Function for message timestamp handling
  const toggleMessageTimestamp = (messageId: string) => {
    // Create animation values if they don't exist
    if (!messageAnimations.current[messageId]) {
      messageAnimations.current[messageId] = {
        height: new Animated.Value(0),
        opacity: new Animated.Value(0)
      };
    }
    
    const isExpanded = expandedMessageIds.includes(messageId);
    const animations = messageAnimations.current[messageId];
    
    // If expanding this timestamp, close any others
    if (!isExpanded) {
      dismissAllTimestamps();
    }
    
    // Animate the timestamp
    if (isExpanded) {
      // Close this timestamp
      Animated.parallel([
        Animated.timing(animations.height, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false // Must be false for height
        }),
        Animated.timing(animations.opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false // Keep consistent with height animation
        })
      ]).start();
      
      setExpandedMessageIds(prev => prev.filter(id => id !== messageId));
    } else {
      // Open this timestamp
      Animated.parallel([
        Animated.timing(animations.height, {
          toValue: 30, // Height of the timestamp container
          duration: 200,
          useNativeDriver: false // Must be false for height
        }),
        Animated.timing(animations.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false // Keep consistent with height animation
        })
      ]).start();
      
      setExpandedMessageIds(prev => [...prev, messageId]);
    }
    
    // Don't scroll to end when showing timestamps
  };
  
  // Function to dismiss all message timestamps
  const dismissAllTimestamps = () => {
    if (expandedMessageIds && expandedMessageIds.length > 0) {
      // Animate all expanded message timestamps to close
      expandedMessageIds.forEach(messageId => {
        const animValues = getAnimationValues(messageId);
        if (animValues) {
          Animated.parallel([
            Animated.timing(animValues.height, {
              toValue: 0,
              duration: 200,
              useNativeDriver: false // Must be false for height
            }),
            Animated.timing(animValues.opacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false // Keep consistent with height animation
            })
          ]).start();
        }
      });
      
      // Clear expanded message IDs
      setExpandedMessageIds([]);
    }
  };

  // Add missing animation effect to fade in content
  useEffect(() => {
    // Fade in animation for the content
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      delay: 100
    }).start();
  }, []);

  // Load group data and check if user is member
  useEffect(() => {
    const loadGroupData = async () => {
      try {
        // Get group document reference
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await getDoc(groupRef);
        
      if (groupDoc.exists()) {
          const groupData = groupDoc.data() as TGroup;
        setGroup(groupData);
        
          // Set edited values for settings
          setEditedGroupName(groupData.name || '');
          setEditedIsPublic(groupData.isPublic || false);
          setEditedAllowAllToPost(groupData.allowAllToPost || false);
          
          // Check if user is member
          const currentUserId = auth.currentUser?.uid;
          if (currentUserId) {
            const isUserMember = groupData.members?.includes(currentUserId) || false;
            setIsMember(isUserMember);
            
            // Check posting permissions
            setCanPost(
              isUserMember && 
              (groupData.allowAllToPost || groupData.createdBy === currentUserId)
            );
          }
      } else {
          // Group not found
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
      }
      } catch (error) {
        console.error('Error loading group data:', error);
        Alert.alert('Error', 'Failed to load group data');
      } finally {
        setLoading(false);
      }
    };
    
    loadGroupData();
  }, [groupId, navigation]);

  // Subscribe to messages
  useEffect(() => {
    let unsubscribe: () => void;
    
    const loadMessages = async () => {
      try {
        setLoading(true);
        console.log('Subscribing to messages for group:', groupId);
        
        unsubscribe = subscribeToMessages(groupId, (updatedMessages) => {
          console.log('Messages received:', updatedMessages?.length || 0);
          setMessages(updatedMessages as TMessageWithReactions[]);
        setLoading(false);
        });
      } catch (error) {
        console.error('Error loading messages:', error);
        setLoading(false);
        setIsOffline(true);
      }
    };
    
    loadMessages();
    
    // Cleanup: unsubscribe from messages listener
    return () => {
      if (unsubscribe) {
        console.log('Unsubscribing from messages');
      unsubscribe();
      }
    };
  }, [groupId]);
  
  // Add an effect to initialize gibberish for new messages
  useEffect(() => {
    // Initialize gibberish for any new messages that don't have it yet
    const newGibberish: {[messageId: string]: string} = {};
    let hasNewGibberish = false;
    
    messages.forEach(message => {
      if (!message.isRevealed && message.text && !cachedGibberish[message.id]) {
        newGibberish[message.id] = generateGibberish(message.text);
        hasNewGibberish = true;
      }
    });
    
    // Only update state if there are new gibberish texts
    if (hasNewGibberish) {
      setCachedGibberish(prev => ({
        ...prev,
        ...newGibberish
      }));
    }
  }, [messages]);
  
  // UseEffect to handle scroll to bottom only when messages first load
  useEffect(() => {
    // Only scroll to bottom when initially loading messages
    if (loading === false && messages.length > 0 && flatListRef.current) {
      // Use a flag to track if we've done the initial scroll
      const timer = setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: false });
        } catch (error) {
          console.error('Error scrolling to bottom:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading]); // Only run when loading state changes
  
  // Function to attempt reconnection
  const attemptReconnect = async () => {
    setRetrying(true);
    try {
      await enableNetwork(db);
      setIsOffline(false);
    } catch (error) {
      console.error('Failed to reconnect:', error);
      Alert.alert('Reconnection Failed', 'Please check your internet connection and try again.');
    } finally {
      setRetrying(false);
    }
  };

  // Add a safe scroll function that doesn't rely on the scrollToBottom function
  const safeScrollToEnd = (animated = false) => {
    try {
      if (flatListRef.current && messages.length > 0) {
        flatListRef.current.scrollToEnd({ animated });
      }
    } catch (error) {
      console.error('Error in safeScrollToEnd:', error);
    }
  };

  // Function to send message (corrected implementation)
  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedMedia) || sending) return;

    try {
      setSending(true);
      
      // Use current date as a placeholder (should be determined by business logic)
      const revealDate = group?.revealDate || new Date();
      
      if (selectedMedia) {
        // Send media message
        const caption = messageText.trim();
        // Handle audio type specifically 
        const mediaType = selectedMedia.type === 'audio' ? 'audio' : selectedMedia.type;
        
        await sendMediaMessage(
          groupId,
          selectedMedia.uri,
          mediaType as 'image' | 'video' | 'audio',
          revealDate
        );
        
        // Reset state
        setMessageText('');
        setSelectedMedia(null);
      } else {
        // Send text message with proper revealDate parameter
        await sendTextMessage(groupId, messageText.trim(), revealDate);
        setMessageText('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Toggle settings drawer
  const toggleSettings = () => {
    if (showSettings) {
      // Close drawer
      Animated.timing(settingsSlideAnim, {
        toValue: 500,
        duration: 300,
        useNativeDriver: true
      }).start(() => {
        setShowSettings(false);
      });
    } else {
      // Open drawer
      setShowSettings(true);
      Animated.timing(settingsSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  };

  // Toggle media menu
  const toggleMediaMenu = () => {
    setIsMediaMenuExpanded(!isMediaMenuExpanded);
    
    if (!isMediaMenuExpanded) {
      // Expand the media menu
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 0.125, // 45 degrees in terms of percentage of full rotation
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(mediaButtonsAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false // Must be false for height animation
        })
      ]).start();
    } else {
      // Collapse the media menu
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(mediaButtonsAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false // Must be false for height animation
        })
      ]).start();
    }
  };

  // Function to handle image selection
  const handlePickImage = async () => {
    try {
      const result = await pickImage();
      if (result) {
        // Handle the result as a string (URI)
        // Get dimensions using Image.getSize
        Image.getSize(result, (width, height) => {
          setSelectedMedia({
            uri: result,
            type: 'image',
            width,
            height
          });
          setIsMediaMenuExpanded(false);
          
          // Reset the plus button animation
          Animated.timing(spin, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }).start();
          
          // Focus the input for adding a caption
          setTimeout(() => {
            inputRef.current?.focus();
          }, 300);
        }, error => {
          console.error('Error getting image dimensions:', error);
          // Fallback to default dimensions
          setSelectedMedia({
            uri: result,
            type: 'image',
            width: 300,
            height: 300
          });
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Function to handle taking a photo
  const handleTakePhoto = async () => {
    try {
      const result = await takePhoto();
      if (result) {
        // Handle the result as a string (URI)
        // Get dimensions using Image.getSize
        Image.getSize(result, (width, height) => {
          setSelectedMedia({
            uri: result,
            type: 'image',
            width,
            height
          });
          setIsMediaMenuExpanded(false);
          
          // Reset the plus button animation
          Animated.timing(spin, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }).start();
          
          // Focus the input for adding a caption
          setTimeout(() => {
            inputRef.current?.focus();
          }, 300);
        }, error => {
          console.error('Error getting image dimensions:', error);
          // Fallback to default dimensions
          setSelectedMedia({
            uri: result,
            type: 'image',
            width: 300,
            height: 300
          });
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Function to render media thumbnail in input
  const renderMediaThumbnail = () => {
    if (!selectedMedia) return null;
    
    // Determine the best aspect ratio style for the thumbnail
    const aspectRatioStyle = detectAspectRatio(selectedMedia.width, selectedMedia.height);
    
    // Calculate thumbnail dimensions
    const thumbnailSize = calculateThumbnailSize(selectedMedia.width, selectedMedia.height);
    
    return (
      <View style={styles.mediaThumbnailContainer}>
        {selectedMedia.type === 'image' ? (
          <Image
            source={{ uri: selectedMedia.uri }}
            style={[
              styles.mediaThumbnail,
              aspectRatioStyle.style,
              thumbnailSize
            ]}
            resizeMode="cover"
          />
        ) : selectedMedia.type === 'video' ? (
          <View style={[
            styles.mediaThumbnail,
            aspectRatioStyle.style,
            thumbnailSize
          ]}>
            <View style={styles.videoThumbnailOverlay}>
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </View>
          </View>
        ) : (
          // Audio thumbnail
          <View style={styles.audioThumbnail}>
            <Ionicons name="musical-note" size={24} color="#FFFFFF" />
            <Text style={styles.audioThumbnailText}>Audio message</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.mediaThumbnailRemove}
          onPress={removeSelectedMedia}
        >
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  // Function to remove selected media
  const removeSelectedMedia = () => {
    setSelectedMedia(null);
  };

  // Function to start audio recording
  const startRecordingAudio = async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Audio recording requires microphone access.');
        return;
      }
      
      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecordingInstance(recording);
      setIsRecordingAudio(true);
      setRecordingStatus('recording');
      
      // Close the media menu
      setIsMediaMenuExpanded(false);
      
      // Reset the plus button animation
      Animated.timing(spin, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    } catch (error) {
      console.error('Error starting audio recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  // Add a simple audio player function
  const playAudio = async (audioUri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      
      // Unload sound when finished
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Could not play audio message');
    }
  };

  // Load media dimensions for all messages on messages change
  useEffect(() => {
    const mediaMessages = messages.filter(msg => msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video'));
    
    mediaMessages.forEach(message => {
      // Skip if we already have dimensions for this message
      if (mediaDimensions[message.id]) return;
      
      if (message.mediaUrl) {
        Image.getSize(message.mediaUrl, (width, height) => {
          setMediaDimensions(prev => ({
            ...prev,
            [message.id]: {
              width,
              height,
              aspectRatio: width / height
            }
          }));
        }, error => {
          console.error(`Error getting dimensions for message ${message.id}:`, error);
        });
      }
    });
  }, [messages]);

  // Add a formatting function for timestamp with or without username
  const formatTimestamp = (message: TMessageWithReactions, showUsername: boolean) => {
    if (showUsername) {
      const username = message.senderName || 'Unknown';
      const timestamp = formatDate(message.createdAt);
      return `${username} - ${timestamp}`;
      } else {
      return formatDate(message.createdAt);
    }
  };

  // Function to get or create gibberish for a message
  const getGibberishForMessage = (message: TMessageWithReactions) => {
    // If we already have gibberish for this message, use it
    if (cachedGibberish[message.id]) {
      return cachedGibberish[message.id];
    }
    
    // Otherwise generate new gibberish and cache it
    const newGibberish = generateGibberish(message.text);
    setCachedGibberish(prev => ({
      ...prev,
      [message.id]: newGibberish
    }));
    
    return newGibberish;
  };

  // Update renderMessageItem function to blur content instead of replacing it
  const renderMessageItem = ({ item }: { item: TMessageWithReactions }) => {
    const isCurrentUser = item.senderId === auth.currentUser?.uid;
    const isRevealed = item.isRevealed || false;
    
    // Calculate media messages array for gallery viewing
    const mediaMessages = messages
      .filter(msg => msg.mediaUrl && (msg.mediaType === 'image' || msg.mediaType === 'video'))
      .map(msg => msg.id);
    
    // Get dimensions from the map or use defaults
    const dimensions = mediaDimensions[item.id] || { width: 240, height: 240, aspectRatio: 1 };
    
    // Determine the best aspect ratio style
    const aspectRatioStyle = detectAspectRatio(dimensions.width, dimensions.height);
    
    // Message press handler for timestamp
    const handleMessagePress = (e: GestureResponderEvent) => {
      // Stop propagation - prevent parent components from responding
      e.stopPropagation();
      
      // Only toggle timestamp, don't scroll to end
      toggleMessageTimestamp(item.id);
    };

    // Get animation values for expanded timestamps
    const animValues = messageAnimations.current[item.id] || {
      height: new Animated.Value(0),
      opacity: new Animated.Value(0)
    };

    // Determine if this message has expanded timestamp
    const isExpanded = expandedMessageIds.includes(item.id);
    
    return (
      <View style={styles.messageOuterContainer}>
        <View style={[
          styles.messageRowContainer,
          isCurrentUser ? styles.currentUserMessageRow : styles.otherUserMessageRow
        ]}>
          {/* Avatar for other users - only show if message is revealed */}
          {!isCurrentUser && isRevealed && (
            <View style={styles.avatarContainer}>
              {item.senderPhotoURL ? (
                <Image 
                  source={{ uri: item.senderPhotoURL }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.avatarText}>
                    {item.senderName?.charAt(0).toUpperCase() || '?'}
                  </Text>
          </View>
              )}
        </View>
          )}
          
          {/* Message content */}
                <TouchableOpacity
            style={[
              styles.messageContainer,
              isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
              // Remove padding for image messages
              item.mediaType === 'image' && styles.noPadding
            ]}
            onPress={handleMessagePress}
            activeOpacity={0.8}
          >
            {/* Message content - conditional rendering based on message type */}
            {item.mediaUrl ? (
              <View>
                {item.mediaType === 'image' && (
                  <View 
                    style={[
                      styles.imageMessageContainer,
                      aspectRatioStyle.style,
                    ]}
                  >
                    {/* Sender name for image messages from other users - only show if revealed */}
                    {!isCurrentUser && isRevealed && (
                      <View style={styles.imageSenderNameContainer}>
                        <Text style={styles.imageSenderName}>{item.senderName || 'Unknown'}</Text>
            </View>
                    )}
                    
                    <Image
                      source={{ uri: item.mediaUrl }}
                      style={[
                        styles.backgroundImage,
                        aspectRatioStyle.style
                      ]}
                      blurRadius={isRevealed ? 0 : 40}
                      resizeMode="cover"
                    />
                    
                    {!isRevealed && (
                      <View style={styles.blurredOverlay}>
                        {/* Removing lock icon as requested */}
                      </View>
                    )}
                    
            <TouchableOpacity 
                      activeOpacity={0.9}
                      style={styles.imageOverlay}
                      onPress={() => {
                        if (isRevealed && mediaMessages.indexOf(item.id) !== -1 && item.mediaUrl) {
                          openGallery(item.mediaUrl, 'image', mediaMessages.indexOf(item.id));
                        }
                      }}
                      disabled={!isRevealed}
                    >
                      {/* Caption */}
                      {item.text && (
                        <View style={styles.captionContainer}>
                          <Text style={styles.captionText}>{item.text}</Text>
                        </View>
                      )}
            </TouchableOpacity>
      </View>
                )}
                
                {item.mediaType === 'video' && (
      <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      if (isRevealed && mediaMessages.indexOf(item.id) !== -1 && item.mediaUrl) {
                        openGallery(item.mediaUrl, 'video', mediaMessages.indexOf(item.id));
                      }
                    }}
                    disabled={!isRevealed}
      >
        <View style={[
                      styles.videoContainer,
                      aspectRatioStyle.style
                    ]}>
                      {isRevealed ? (
                        <Video
                          source={{ uri: item.mediaUrl }}
                          style={{ width: '100%', height: '100%' }}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                          isLooping={false}
                          useNativeControls={false}
                        />
                      ) : (
                        <Image
                          source={{ uri: item.mediaUrl }}
                          style={{ width: '100%', height: '100%' }}
                          blurRadius={25}
                          resizeMode="cover"
                        />
                      )}
                      
                      <View style={[
                        styles.videoPlaceholder,
                        !isRevealed && styles.blurredOverlay
                      ]}>
          {isRevealed ? (
                          <Ionicons name="play-circle" size={48} color="#FFFFFF" />
                        ) : (
                          // Removing lock icon as requested
                          null
                        )}
                      </View>
                      
                      {/* Video caption */}
                      {item.text && (
                        <View style={styles.captionContainer}>
                          <Text style={styles.captionText}>{item.text}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                
                {item.mediaType === 'audio' && (
                  <View style={styles.audioContainer}>
                    <View style={styles.audioIconContainer}>
                      <Ionicons name="musical-note" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.audioContent}>
                      <Text style={styles.audioText}>Audio Message</Text>
                      {item.text && (
                        <Text style={styles.audioCaption}>{item.text}</Text>
                      )}
                    </View>
                <TouchableOpacity 
                      style={[
                        styles.audioButton,
                        !isRevealed && { backgroundColor: '#888' }
                      ]}
                  onPress={() => {
                        if (isRevealed && item.mediaUrl) {
                          playAudio(item.mediaUrl);
                        }
                      }}
                      disabled={!isRevealed}
                    >
                      {isRevealed ? (
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                      ) : (
                        // Removing lock icon as requested
                        null
                      )}
                </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Text message
              <View>
                {!isCurrentUser && isRevealed && (
                  <Text style={styles.senderName}>{item.senderName || 'Unknown'}</Text>
                )}
                {isRevealed ? (
                  <Text style={styles.messageText}>{item.text}</Text>
                ) : (
                  // Replace with password dots instead of blur overlay
                  <Text style={[styles.messageText, {color: '#8e8e8e', letterSpacing: 1}]}>
                    {getGibberishForMessage(item)}
              </Text>
                )}
            </View>
          )}
          </TouchableOpacity>
        </View>
        
        {/* Animated timestamp with username */}
        <Animated.View 
          style={[
            styles.timestampContainer,
            isCurrentUser ? styles.timestampRight : styles.timestampLeft,
            {
              height: animValues.height,
              opacity: animValues.opacity
            }
          ]}
        >
          <Text style={[
            styles.messageTimestamp,
            isCurrentUser ? styles.timestampTextRight : styles.timestampTextLeft
          ]}>
            {formatTimestamp(item, isRevealed)}
          </Text>
        </Animated.View>
        </View>
    );
  };

  // Function to render empty component with more detail
  const renderEmptyComponent = () => (
      <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptyText}>
        {loading ? 'Loading messages...' : 'Be the first to start a conversation in this group!'}
      </Text>
      {!loading && (
        <TouchableOpacity 
          style={{
            marginTop: 16,
            backgroundColor: colors.primary,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 20
          }}
          onPress={() => {
            console.log('Attempting to send a test message');
            // Focus the input field
            inputRef.current?.focus();
          }}
        >
          <Text style={{color: '#FFF', fontWeight: 'bold'}}>Start a conversation</Text>
        </TouchableOpacity>
      )}
      </View>
    );

  // Function to stop and send audio recording
  const stopRecording = async () => {
    try {
      if (recordingInstance) {
        setRecordingStatus('processing');
        await recordingInstance.stopAndUnloadAsync();
        const uri = recordingInstance.getURI();
        
        if (uri) {
          setAudioUri(uri);
          setIsRecordingAudio(false);
          
          // Create audio media message with the correct type
          const audioMedia = {
            uri,
            type: 'audio' as const, // Use a const assertion to fix type issues
            width: 300,
            height: 80
          };
          
          // Type assertion to make TypeScript happy
          setSelectedMedia(audioMedia as any);
          
          // Focus input for caption
          setTimeout(() => {
            inputRef.current?.focus();
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to process audio recording.');
    } finally {
      setIsRecordingAudio(false);
      setRecordingStatus('idle');
    }
  };

  // Function to cancel audio recording
  const cancelRecording = async () => {
    try {
      if (recordingInstance) {
        await recordingInstance.stopAndUnloadAsync();
      }
    } catch (error) {
      console.error('Error canceling recording:', error);
    } finally {
      setIsRecordingAudio(false);
      setRecordingStatus('idle');
      setRecordingInstance(null);
    }
  };
    
    return (
    <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
      {/* Offline banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={18} color="#FFFFFF" />
          <Text style={styles.offlineText}> You are offline</Text>
          <TouchableOpacity onPress={attemptReconnect} disabled={retrying}>
            <Text style={[styles.offlineText, { marginLeft: 8, textDecorationLine: 'underline' }]}>
              {retrying ? 'Connecting...' : 'Reconnect'}
                </Text>
              </TouchableOpacity>
          </View>
        )}
        
      {/* Main content */}
      <Animated.View 
        style={[
          styles.contentContainer,
          { opacity: 1 } // Force opacity to 1 for debugging
        ]}
      >
        {/* Loading indicator */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            </View>
        ) : (
          <>
            {/* Message list */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <View style={styles.messagesContainer}>
                {/* Direct text display for messages as a fallback when FlatList fails */}
                {messages.length === 0 ? (
                  renderEmptyComponent()
                ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id || Math.random().toString()}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messageList}
                ListEmptyComponent={null} // Already handled above
                onContentSizeChange={() => messages.length > 0 && !expandedMessageIds.length && safeScrollToEnd(false)}
                onLayout={() => loading ? safeScrollToEnd(false) : null}
                initialNumToRender={50} // Increase to ensure all messages are rendered
                maxToRenderPerBatch={50}
                windowSize={21}
              />
                )}
          </View>
          
              {/* Input area */}
              <View style={styles.inputWrapperContainer}>
                <TouchableWithoutFeedback onPress={dismissAllTimestamps}>
                  <View style={styles.inputWrapper}>
                <View style={styles.inputContent}>
                      {/* Media button */}
                        <TouchableOpacity 
                          style={styles.plusButton}
                          onPress={toggleMediaMenu}
                        disabled={sending}
                      >
                        <Animated.View
                          style={{
                            transform: [
                              {
                                rotate: spin.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '360deg']
                                })
                              }
                            ]
                          }}
                        >
                          <Ionicons name="add" size={18} color="#FFFFFF" />
                        </Animated.View>
                            </TouchableOpacity>
                            
                      {/* Input field */}
                      <View
                        style={[
                          styles.inputContainer,
                          isInputFocused && styles.inputContainerFocused,
                          selectedMedia && { paddingTop: 0 }
                        ]}
                      >
                        {renderMediaThumbnail()}
                        
                              <TextInput
                                ref={inputRef}
                                style={styles.input}
                          placeholder={selectedMedia ? "Add a caption..." : "Type a message..."}
                          placeholderTextColor="#AAAAAA"
                                value={messageText}
                                onChangeText={setMessageText}
                          multiline
                          onFocus={() => {
                            setIsInputFocused(true);
                            if (isMediaMenuExpanded) {
                              toggleMediaMenu();
                            }
                          }}
                                onBlur={() => setIsInputFocused(false)}
                              />
                            </View>
                            
                      {/* Send button */}
                            <TouchableOpacity 
                              style={[
                                styles.sendButton,
                          (!messageText.trim() && !selectedMedia) && styles.sendButtonDisabled
                              ]}
                              onPress={sendMessage}
                        disabled={(!messageText.trim() && !selectedMedia) || sending}
                            >
                        {sending ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                              <Ionicons 
                            name="send"
                            size={20}
                            color={(!messageText.trim() && !selectedMedia) ? "#AAAAAA" : colors.primary}
                          />
                        )}
                      </TouchableOpacity>
        </View>

                    {/* Media options buttons */}
          <Animated.View 
                      style={{
                        height: mediaButtonsAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 80]
                        }),
                        opacity: mediaButtonsAnimation,
                        overflow: 'hidden'
                      }}
                    >
                      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-around' }}>
                        <TouchableOpacity style={styles.mediaButton} onPress={handlePickImage}>
                          <Ionicons name="image" size={24} color="#FFFFFF" />
              </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.mediaButton} onPress={handleTakePhoto}>
                          <Ionicons name="camera" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.mediaButton} onPress={startRecordingAudio}>
                          <Ionicons name="mic" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    </Animated.View>
                  </View>
                </TouchableWithoutFeedback>
                        </View>
            </KeyboardAvoidingView>
          </>
        )}
      </Animated.View>
      
      {/* Audio recording overlay */}
      {isRecordingAudio && (
        <View style={styles.recordingOverlay}>
          <View style={styles.recordingContainer}>
            <View style={styles.recordingHeader}>
              <Text style={styles.recordingTitle}>Recording Audio</Text>
              <TouchableOpacity onPress={cancelRecording}>
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

            <View style={styles.recordingContent}>
              <View style={[styles.recordingIndicator, recordingStatus === 'recording' && styles.recordingActive]}>
                <Ionicons name="mic" size={32} color={recordingStatus === 'recording' ? '#FF3B30' : '#757575'} />
                  </View>

              <Text style={styles.recordingStatus}>
                {recordingStatus === 'recording' ? 'Recording in progress...' : 'Preparing...'}
                    </Text>
                  </View>

            <View style={styles.recordingActions}>
                  <TouchableOpacity 
                style={styles.recordingButton}
                onPress={stopRecording}
              >
                <View style={styles.stopButtonInner}>
                  <Text style={styles.recordingButtonText}>Stop & Send</Text>
                </View>
                    </TouchableOpacity>
                  </View>
                  </View>
                  </View>
      )}

      {/* Media gallery modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={galleryVisible}
        onRequestClose={closeGallery}
      >
        <View style={styles.galleryContainer}>
          <View style={styles.galleryHeader}>
            <TouchableOpacity style={styles.galleryCloseButton} onPress={closeGallery}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.galleryCounter}>
              {currentGalleryIndex + 1} / {galleryMedia.length}
                    </Text>
            {/* Empty view for layout balance */}
            <View style={{ width: 44 }} />
                  </View>
                  
          <Animated.View 
            style={[
              styles.galleryContent,
              {
                transform: [{ translateX: gallerySwipeAnim }]
              }
            ]}
            {...galleryPanResponder.panHandlers}
          >
            {/* Main image */}
            {renderGalleryItem(galleryMedia[currentGalleryIndex], 'current')}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.cardBackground,
    marginTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  countdownText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  revealedText: {
    color: '#4CAF50',
  },
  messageOuterContainer: {
    marginBottom: 4,
  },
  messageRowContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  currentUserMessageRow: {
    justifyContent: 'flex-end',
  },
  otherUserMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  placeholderAvatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E8DEF8',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  senderName: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageText: {
    fontSize: 16,
    color: '#212121',
  },
  messageImage: {
    width: '100%',
    height: undefined, // Height will be determined by aspect ratio
  },
  messageTime: {
    fontSize: 10,
    color: '#9E9E9E',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  lockedMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    minWidth: 150,
  },
  lockedMessageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  inputWrapperContainer: {
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    width: '100%',
    minHeight: 55,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 0,
  },
  inputContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingHorizontal: 10,
  },
  plusButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 9,
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: 8,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(192, 255, 114, 0.25)',
    backgroundColor: 'rgba(6, 23, 8, 0.6)',
    marginRight: 8,
    padding: 8,
    minHeight: 40,
  },
  inputContainerFocused: {
    borderColor: 'rgba(192, 255, 114, 0.8)',
  },
  input: {
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
    minHeight: 24,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButton: {
    width: 30,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  offlineBanner: {
    backgroundColor: colors.error,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? ((RNStatusBar.currentHeight || 0) + 10) : 10,
  },
  offlineText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
  },
  mediaOptionsContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  mediaOptionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  mediaOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  mediaOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  recordingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  recordingContainer: {
    backgroundColor: '#1E1E1E',
    width: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  recordingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordingIndicator: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordingActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
  },
  recordingStatus: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 10,
  },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  recordingButton: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  stopButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.2)'
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  audioIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioContent: {
    flex: 1,
  },
  audioText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
  },
  audioCaption: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
  audioButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  joinContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  joinDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 150,
    alignItems: 'center',
  },
  joinButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  settingsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  settingsDrawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#1E1E1E',
    zIndex: 11,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  settingsContent: {
    flex: 1,
    padding: 16,
  },
  settingsField: {
    marginBottom: 20,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInputContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  settingsInput: {
    height: 40,
    color: '#FFFFFF',
    fontSize: 16,
  },
  settingsToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsDescription: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  coverImageContainer: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#6200EA',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 20,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    marginLeft: 16,
  },
  settingsInfoText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 24,
  },
  memberInfoContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 16,
    borderRadius: 8,
  },
  leaveButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    maxWidth: '80%',
  },
  reactionsContainerLeft: {
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
    marginLeft: 35, // Align with the message, accounting for avatar width + margin
  },
  reactionsContainerRight: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginRight: 0, // Align with the right side of the message
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  hasReactedBadge: {
    backgroundColor: 'rgba(125, 95, 255, 0.2)',
    borderColor: 'rgba(125, 95, 255, 0.3)',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  reactionPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionPickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  emojiText: {
    fontSize: 24,
  },
  // Emoji picker styles
  emojiPickerModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 100, // Leave space at the top
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  emojiPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emojiPickerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Add skeleton styles
  skeletonContainer: {
    flex: 1,
    paddingTop: 16,
  },
  skeletonMessage: {
    backgroundColor: 'rgba(224, 224, 224, 0.5)',
  },
  skeletonText: {
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    borderRadius: 4,
    height: 16,
    marginVertical: 2,
  },
  skeletonTime: {
    width: 50,
    height: 8,
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonButton: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    marginRight: 8,
    marginBottom: 9,
  },
  skeletonInput: {
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    margin: 10,
  },
  skeletonSendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(200, 200, 200, 0.5)',
    marginBottom: 5,
  },
  // Updated timestamp styles
  timestampContainer: {
    marginTop: 2,
    marginBottom: 8, // Extra space after the timestamp before next message
  },
  timestampLeft: {
    alignSelf: 'flex-start',
    marginLeft: 35, // Align with the message
  },
  timestampRight: {
    alignSelf: 'flex-end',
    marginRight: 16, // Align with the message
  },
  messageTimestamp: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  timestampTextLeft: {
    color: '#aaa',
    textAlign: 'left',
  },
  timestampTextRight: {
    color: '#aaa',
    textAlign: 'right',
  },
  // Updated mediaContainer styles to match messageContainer
  mediaContainer: {
    maxWidth: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentUserMedia: {
    alignSelf: 'flex-end',
  },
  otherUserMedia: {
    alignSelf: 'flex-start',
  },
  // Media thumbnail styles
  mediaThumbnailContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    position: 'relative',
  },
  mediaThumbnail: {
    borderRadius: 6,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoThumbnailOverlay: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  mediaThumbnailRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  inputWithMedia: {
    paddingLeft: 0,
  },
  // Updated aspect ratio styles
  aspectRatioSquare: {
    aspectRatio: 1, // 1:1
    width: 240, // Fixed width for square images
  },
  aspectRatioLandscape: {
    aspectRatio: 16/9, // 16:9
    width: 280, // Fixed width for landscape photos/videos
  },
  aspectRatioVertical: {
    aspectRatio: 9/16, // 9:16
    width: 200, // Fixed width for vertical images
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  galleryBlurBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  galleryCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  galleryImage: {
    width: '100%',
    height: '80%',
  },
  galleryVideoContainer: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  galleryVideo: {
    width: '100%',
    height: '100%',
  },
  blurredContent: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  blurredText: {
    fontSize: 16,
    color: '#AAAAAA',
    marginTop: 4,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  imageMessageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  backgroundImage: {
    borderRadius: 12,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  captionContainer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  captionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  imageSenderNameContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    paddingLeft: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  imageSenderName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  noPadding: {
    padding: 0,
    overflow: 'hidden',
  },
  audioThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 6,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioThumbnailText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  blurredMediaContainer: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 12,
    transform: [{ scale: 1.02 }], // Makes it slightly bleed out
    marginVertical: 4,
  },
  blurredImage: {
    width: 260,
    height: 200,
    borderRadius: 12,
    opacity: 0.7,
  },
  blurredAudioContainer: {
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    overflow: 'visible',
    transform: [{ scale: 1.02 }], // Makes it slightly bleed out
  },
  blurredAudioContent: {
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0.6,
  },
  blurredAudioText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#AAAAAA',
  },
  blurredTextContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  blurredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
});

export default ChatScreen; 