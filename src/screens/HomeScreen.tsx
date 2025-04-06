import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  PanResponder,
  PanResponderGestureState,
  Easing
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { formatDate, getTimeRemaining } from '../utils';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { TGroup } from '../types/group';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { getPublicGroups, getUserGroups, subscribeToUserGroups } from '../services/groupService';

const { width, height } = Dimensions.get('window');

// Define the navigation param list type
type RootStackParamList = {
  Home: undefined;
  Chat: { groupId: string; groupName: string; revealDate: any };
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupSettings: { groupId: string };
};

// Define the navigation prop type
type HomeScreenNavigationProp = NavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'myReveals'>('discover');
  const [groups, setGroups] = useState<TGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const flatListRef = useRef<FlatList>(null);
  const [discoverGroups, setDiscoverGroups] = useState<TGroup[]>([]);
  const [myRevealsGroups, setMyRevealsGroups] = useState<TGroup[]>([]);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState(true);
  const [isLoadingMyReveals, setIsLoadingMyReveals] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);

  // Animation value for tab swiping
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Animation value for the tab indicator
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  
  // Calculate indicator position based on the slide animation
  const indicatorPosition = useMemo(() => {
    // This is now disconnected from slideAnim to prevent gradual animation
    return new Animated.Value(activeTab === 'discover' ? 0 : 1);
  }, [activeTab]);
  
  // Calculate the translateX for the indicator
  const indicatorTranslateX = useMemo(() => {
    // Fixed position based on active tab, not gradually animated
    return activeTab === 'discover' ? 0 : 110;
  }, [activeTab]);
  
  // Update slide position when tab changes programmatically
  useEffect(() => {
    // Animate content slide
    Animated.spring(slideAnim, {
      toValue: activeTab === 'discover' ? 0 : -width,
      velocity: 1,
      tension: 70,
      friction: 10,
      useNativeDriver: true,
    }).start();
    
    // Instantly update the indicator position
    indicatorPosition.setValue(activeTab === 'discover' ? 0 : 1);
  }, [activeTab]);

  // Enhanced pan responder for swipe gestures
  const panResponder = useMemo(() => 
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal gestures
        const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
        const hasMovedEnough = Math.abs(gestureState.dx) > 10;
        return isHorizontalSwipe && hasMovedEnough;
      },
      onPanResponderGrant: () => {
        // When touch starts, ensure animation isn't running
        slideAnim.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Update animation value for visual feedback during swipe
        if (activeTab === 'discover') {
          // When on discover tab, gesture.dx will be negative when swiping left (to myReveals)
          let newPosition = gestureState.dx;
          // Apply resistance if trying to swipe right when already at rightmost position
          if (newPosition > 0) {
            newPosition = gestureState.dx * 0.3;
          }
          slideAnim.setValue(newPosition);
        } else {
          // When on myReveals tab, gesture.dx will be positive when swiping right (to discover)
          let newPosition = -width + gestureState.dx;
          // Apply resistance if trying to swipe left when already at leftmost position
          if (newPosition < -width) {
            newPosition = -width + (gestureState.dx * 0.3);
          }
          slideAnim.setValue(newPosition);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const velocity = Math.abs(gestureState.vx);
        
        // Calculate distance swiped as percentage of screen width
        const distancePercentage = Math.abs(gestureState.dx) / width;
        
        // Determine if it's a quick swipe based on velocity
        const isVeryFastSwipe = velocity > 1.2;  // Very fast flick
        const isFastSwipe = velocity > 0.6;      // Fast swipe
        const isSlowSwipe = velocity <= 0.3;     // Slow, deliberate swipe
        
        // Dynamic threshold based on velocity
        // Fast swipes need less distance, slow swipes need more
        let requiredDistanceThreshold;
        
        if (isVeryFastSwipe) {
          requiredDistanceThreshold = 0;
        } else if (isFastSwipe) {
          requiredDistanceThreshold = 0;
        } else if (isSlowSwipe) {
          requiredDistanceThreshold = 0.4;  // Need 40% for slow swipes
        } else {
          requiredDistanceThreshold = 0;
        }
        
        // Handle swipe directions based on active tab
        const shouldCompleteSwipe = distancePercentage >= requiredDistanceThreshold;
        
        // Left swipe on discover tab
        if (activeTab === 'discover' && gestureState.dx < 0 && (shouldCompleteSwipe || isVeryFastSwipe)) {
          // Transition to My Reveals
          setActiveTab('myReveals');
          if (myRevealsGroups.length === 0 && user) {
            fetchMyGroups();
          }
          
          // More speed for faster swipes
          const animationSpeed = Math.min(3, velocity * 2 || 1);
          
          // Animate to My Reveals position with bounce
          Animated.spring(slideAnim, {
            toValue: -width,
            useNativeDriver: true,
            velocity: animationSpeed,
            tension: isVeryFastSwipe ? 120 : 70,
            friction: isVeryFastSwipe ? 8 : 6,
            overshootClamping: false,
          }).start();
        } 
        // Right swipe on myReveals tab
        else if (activeTab === 'myReveals' && gestureState.dx > 0 && (shouldCompleteSwipe || isVeryFastSwipe)) {
          // Transition to Discover
          setActiveTab('discover');
          if (discoverGroups.length === 0) {
            fetchPublicGroups();
          }
          
          // More speed for faster swipes
          const animationSpeed = Math.min(3, velocity * 2 || 1);
          
          // Animate to Discover position with bounce
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            velocity: animationSpeed,
            tension: isVeryFastSwipe ? 120 : 70,
            friction: isVeryFastSwipe ? 8 : 6,
            overshootClamping: false,
          }).start();
        } 
        // Not enough distance or wrong direction
        else {
          // Return to original position with appropriate bounce effect
          Animated.spring(slideAnim, {
            toValue: activeTab === 'discover' ? 0 : -width,
            useNativeDriver: true,
            // Faster reset for faster swipes
            velocity: velocity > 0.3 ? velocity : 0.3,
            tension: 80,
            friction: 7,
            overshootClamping: false,
          }).start();
        }
      },
    }),
    [activeTab, width, user, myRevealsGroups.length, discoverGroups.length]
  );

  // Reference to store our subscription
  const unsubscribeRef = useRef<() => void>(() => {});

  // Memoize the current groups based on active tab
  const currentGroups = useMemo(() => {
    return activeTab === 'discover' ? discoverGroups : myRevealsGroups;
  }, [activeTab, discoverGroups, myRevealsGroups]);

  const currentLoading = useMemo(() => {
    return activeTab === 'discover' ? isLoadingDiscover : isLoadingMyReveals;
  }, [activeTab, isLoadingDiscover, isLoadingMyReveals]);

  // Set up real-time listener for user's groups
  useEffect(() => {
    if (user) {
      // Subscribe to real-time updates
      unsubscribeRef.current = subscribeToUserGroups((updatedGroups) => {
        setMyRevealsGroups(updatedGroups);
        setIsLoadingMyReveals(false);
      });
      
      return () => {
        unsubscribeRef.current();
      };
    }
  }, [user]);

  const fetchPublicGroups = async () => {
    try {
      setIsLoadingDiscover(true);
      const publicGroups = await getPublicGroups();
      setDiscoverGroups(publicGroups);
    } catch (error: any) {
      console.error('Error fetching public groups:', error);
      Alert.alert('Error', error.message || 'Failed to fetch public groups');
    } finally {
      setIsLoadingDiscover(false);
    }
  };

  const fetchMyGroups = async () => {
    try {
      setIsLoadingMyReveals(true);
      if (!unsubscribeRef.current) {
        const userGroups = await getUserGroups();
        setMyRevealsGroups(userGroups);
      }
    } catch (error: any) {
      console.error('Error fetching user groups:', error);
      Alert.alert('Error', error.message || 'Failed to fetch your groups');
    } finally {
      setIsLoadingMyReveals(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchPublicGroups();
    if (user) {
      fetchMyGroups();
    }
  }, [user]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'discover') {
        await fetchPublicGroups();
      } else {
        await fetchMyGroups();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const navigateToCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const navigateToJoinGroup = () => {
    navigation.navigate('JoinGroup');
  };

  const scaleAnimMap = useRef(new Map<string, Animated.Value>()).current;
  
  const getScaleAnim = (itemId: string) => {
    if (!scaleAnimMap.has(itemId)) {
      scaleAnimMap.set(itemId, new Animated.Value(1));
    }
    return scaleAnimMap.get(itemId)!;
  };

  const renderGroupItem = ({ item }: { item: TGroup }) => {
    const scaleAnim = getScaleAnim(item.id);
    
    const onPressIn = () => {
      if (!isRefreshing && !refreshing) {
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          useNativeDriver: true,
          tension: 140,
          friction: 12
        }).start();
      }
    };
    
    const onPressOut = () => {
      if (!isRefreshing && !refreshing) {
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 140,
          friction: 12
        }).start();
      }
    };

    return (
      <Animated.View 
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={() => {
            if (!isRefreshing && !refreshing) {
              navigation.navigate('Chat', {
                groupId: item.id,
                groupName: item.name,
                revealDate: item.revealDate,
              });
            }
          }}
        >
          {item.coverImage && (
            <Image
              source={{ uri: item.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
            style={styles.cardContent}
          >
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.cardFooter}>
              <View style={styles.memberCount}>
                <Ionicons name="people-outline" size={20} color="rgba(255, 255, 255, 0.9)" />
                <Text style={styles.memberCountText}>
                  {item.members.length} members
                </Text>
              </View>
              <Text style={styles.revealDate}>
                Reveals {format(item.revealDate instanceof Timestamp ? item.revealDate.toDate() : item.revealDate, 'MMM d, yyyy')}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={60} color="#666" />
      <Text style={styles.emptyTitle}>
        {activeTab === 'discover' ? 'No public reveals available' : 'You haven\'t joined any reveals yet'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'discover' 
          ? 'Check back later for new public reveals' 
          : 'Use the create button in the tab bar to start a new reveal'}
      </Text>
    </View>
  );

  // Render the content for each tab
  const renderTabContent = () => {
    return (
      <Animated.View 
        style={[
          styles.tabContentContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}
        {...panResponder.panHandlers}
      >
        {/* Discover Tab */}
        <View style={styles.tabPage}>
          <FlatList
            data={discoverGroups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              isLoadingDiscover ? styles.loadingContainer : discoverGroups.length === 0 ? {flex: 1} : undefined
            ]}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing || isRefreshing}
                onRefresh={onRefresh}
                progressViewOffset={Platform.OS === 'ios' ? 120 : 100}
              />
            }
            ListEmptyComponent={isLoadingDiscover 
              ? <ActivityIndicator size="large" color="#FFD700" /> 
              : renderEmptyComponent()
            }
            ref={flatListRef}
          />
        </View>
        
        {/* My Reveals Tab */}
        <View style={styles.tabPage}>
          <FlatList
            data={myRevealsGroups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              isLoadingMyReveals ? styles.loadingContainer : myRevealsGroups.length === 0 ? {flex: 1} : undefined
            ]}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing || isRefreshing}
                onRefresh={onRefresh}
                progressViewOffset={Platform.OS === 'ios' ? 120 : 100}
              />
            }
            ListEmptyComponent={isLoadingMyReveals 
              ? <ActivityIndicator size="large" color="#FFD700" /> 
              : renderEmptyComponent()
            }
          />
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Tab content with swipe animation */}
      {renderTabContent()}

      {/* Transparent Header */}
      <View style={styles.headerContainer}>
        <SafeAreaView>
          <View style={styles.header}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => {
                  setActiveTab('discover');
                  if (discoverGroups.length === 0) {
                    fetchPublicGroups();
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: activeTab === 'discover' ? colors.textPrimary : colors.textTertiary
                    }
                  ]}
                >
                  Discover
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toggleOption}
                onPress={() => {
                  setActiveTab('myReveals');
                  if (myRevealsGroups.length === 0 && user) {
                    fetchMyGroups();
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: activeTab === 'myReveals' ? colors.textPrimary : colors.textTertiary
                    }
                  ]}
                >
                  My Reveals
                </Text>
              </TouchableOpacity>
              
              {/* Fixed position indicator */}
              <View 
                style={[
                  styles.animatedIndicator,
                  {
                    left: activeTab === 'discover' ? '12%' : '62%'
                  }
                ]} 
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingTop: Platform.OS === 'ios' ? 120 : 100, // Space for header
    paddingBottom: 100, // Increased bottom padding to provide more space at the end of the list
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 20,
    paddingBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 80,
    backgroundColor: 'transparent',
    borderRadius: 25,
    padding: 4,
    position: 'relative', // For absolute positioned indicator
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  animatedIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 25,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: height,
    backgroundColor: colors.background,
  },
  cardContainer: {
    width: width - 32,
    height: height - 220,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: colors.cardBackground,
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    height: '50%',
    justifyContent: 'flex-end',
  },
  groupName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  memberCountText: {
    color: colors.textSecondary,
    marginLeft: 6,
    fontSize: 16,
  },
  revealDate: {
    color: colors.textSecondary,
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    height: height - 150,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  tabContentContainer: {
    flex: 1,
    width: width * 2,
    flexDirection: 'row',
  },
  tabPage: {
    width: width,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.surface,
    paddingBottom: Platform.OS === 'android' ? 20 : 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    marginHorizontal: 12,
    backgroundColor: colors.inputBackground,
    height: 36,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingVertical: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  input: {
    height: 36,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default HomeScreen; 