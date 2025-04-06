import React, { useState, useEffect } from 'react';
import { NavigationContainer, Theme, useNavigation, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Text, Platform, LogBox, Alert, I18nManager, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import JoinGroupScreen from './src/screens/JoinGroupScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import SplashScreen from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { colors } from './src/theme/colors';
import './src/config/firebase';
import { VerifyCodeScreen } from './src/screens/VerifyCodeScreen';
import { UsernameScreen } from './src/screens/UsernameScreen';
import { SetPasswordScreen } from './src/screens/SetPasswordScreen';
import { db } from './src/config/firebase';
import { enableIndexedDbPersistence, getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { isNativeMode } from './src/utils/environment';
import CreateGroupTypeModal from './src/components/CreateGroupTypeModal';
import { EmailLoginScreen } from './src/screens/EmailLoginScreen';
import { EmailSignupScreen } from './src/screens/EmailSignupScreen';
import GroupSettingsScreen from './src/screens/GroupSettingsScreen';
import ThemeProvider from './src/theme/ThemeProvider';
import { getStandardHeaderOptions } from './src/navigation/HeaderConfig';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Explicitly force LTR text direction
if (I18nManager.isRTL) {
  I18nManager.forceRTL(false);
  I18nManager.allowRTL(false);
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Setup Firestore persistence for better offline support
const setupFirebasePersistence = async () => {
  try {
    if (!isNativeMode()) {
      // For web mode, enable IndexedDB persistence
      await enableIndexedDbPersistence(db);
      console.log('Firebase persistence enabled for web');
    } else {
      // Native mode has persistence enabled by default
      console.log('Firebase persistence enabled by default in native mode');
    }
  } catch (error: any) {
    console.error('Error enabling Firebase persistence:', error);
    if (error.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Multiple tabs open, persistence only works in one tab at a time');
    } else if (error.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn('Current environment does not support Firestore persistence');
    }
  }
};

interface TabBarAddButtonProps {
  navigation: any; // We'll get navigation from props instead
}

// Custom tab bar button for the center "Add" button
const TabBarAddButton = ({ navigation }: TabBarAddButtonProps) => {
  const [showTypeModal, setShowTypeModal] = React.useState(false);

  const handleSelectType = (type: 'public' | 'private') => {
    setShowTypeModal(false);
    navigation.navigate('CreateGroup', { isPublic: type === 'public' });
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.addButton, showTypeModal && { opacity: 0 }]}
        onPress={() => setShowTypeModal(true)}
      >
        <View style={styles.addButtonInner}>
          <Ionicons name="add" size={28} color={colors.textPrimary} />
        </View>
        <Text style={styles.addButtonLabel}>Create</Text>
      </TouchableOpacity>

      <CreateGroupTypeModal
        visible={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        onSelectType={handleSelectType}
      />
    </>
  );
};

// Define the main tab navigator
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: true,
        tabBarStyle: {
          display: 'none', // Hide the default tab bar
        },
        headerShown: false,
      }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          tabBarLabel: "Home"
        }}
      />
      <Tab.Screen 
        name="CreateGroupTab" 
        component={CreateGroupScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add" size={size} color={color} />
          ),
          tabBarLabel: "Create"
        })}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          tabBarLabel: "Profile"
        }}
      />
    </Tab.Navigator>
  );
};

// Custom Tab Bar component with glassmorphism effect
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  return (
    <View style={styles.outerContainer}>
      <View style={styles.tabBarContainer}>
        <BlurView intensity={12} tint="dark" style={styles.tabBarBlur}>
          <View style={styles.tabBarContent}>
            {state.routes.map((route: any, index: number) => {
              const { options } = descriptors[route.key];
              const label = options.tabBarLabel ?? options.title ?? route.name;
              const isFocused = state.index === index;
              
              // Get the icon component
              const IconComponent = options.tabBarIcon;
              
              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                
                if (!isFocused && !event.defaultPrevented) {
                  // Special handling for Create tab
                  if (route.name === 'CreateGroupTab') {
                    // Show modal or navigate directly
                    navigation.navigate('CreateGroup');
                  } else {
                    // Regular navigation
                    navigation.navigate(route.name);
                  }
                }
              };
              
              // For Create button in the middle
              if (route.name === 'CreateGroupTab') {
                return (
                  <View key={index} style={styles.tabButton}>
                    {/* Empty space to maintain layout */}
                  </View>
                );
              }
              
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.tabButton}
                  onPress={onPress}
                >
                  {IconComponent && IconComponent({
                    color: isFocused ? colors.primary : colors.textTertiary,
                    size: 20,
                  })}
                  <Text
                    style={[
                      styles.tabButtonText,
                      { color: isFocused ? colors.primary : colors.textTertiary }
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
      
      {/* Floating create button positioned outside the tab bar container */}
      {state.routes.map((route: any, index: number) => {
        if (route.name === 'CreateGroupTab') {
          const onPress = () => navigation.navigate('CreateGroup');
          return (
            <View key="floating-create-button" style={styles.createButtonContainer}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={onPress}
              >
                <Ionicons name="add" size={26} color="#000000" />
              </TouchableOpacity>
            </View>
          );
        }
        return null;
      })}
    </View>
  );
};

const customTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.divider,
    notification: colors.primary,
  },
  fonts: {
    regular: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }),
      fontWeight: '400',
    },
    medium: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }),
      fontWeight: '500',
    },
    bold: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }),
      fontWeight: '700',
    },
    heavy: {
      fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
        default: 'System',
      }),
      fontWeight: '900',
    },
  }
};

// Auth Navigator
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen 
        name="EmailLogin" 
        component={EmailLoginScreen}
        options={{
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen 
        name="EmailSignup" 
        component={EmailSignupScreen}
        options={{
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen 
        name="VerifyCode" 
        component={VerifyCodeScreen}
        options={{
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen 
        name="Username" 
        component={UsernameScreen}
        options={{
          presentation: 'transparentModal',
        }}
      />
      <Stack.Screen 
        name="SetPassword" 
        component={SetPasswordScreen}
        options={{
          presentation: 'transparentModal',
        }}
      />
    </Stack.Navigator>
  );
};

// Main App Navigator
const AppStack = () => {
  // Create a new stack for the app's main navigation
  return (
    <Stack.Navigator 
      screenOptions={{
        headerShown: false, // Default to hidden, individual screens can override
      }}
    >
      {/* The main tab navigator is the home screen */}
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      
      {/* Other screens that need to be accessed from anywhere */}
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="GroupSettings" 
        component={GroupSettingsScreen}
        options={{
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

const Navigation = () => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return null; // Or a loading indicator
  }

  return user ? <AppStack /> : <AuthStack />;
};

const App = () => {
  // Set up Firebase persistence when app loads
  useEffect(() => {
    setupFirebasePersistence();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <NavigationContainer theme={customTheme}>
            <Navigation />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: colors.shadowOpacity,
    shadowRadius: 3,
    elevation: 5,
  },
  addButtonLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  outerContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  tabBarContainer: {
    width: '95%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192, 255, 114, 0.25)',
  },
  tabBarBlur: {
    flex: 1,
    backgroundColor: 'rgba(6, 23, 8, 0.4)',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    width: 65,
  },
  tabButtonText: {
    fontSize: 10,
    marginTop: 2,
  },
  createButtonContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%', 
    marginTop: -32,
    zIndex: 99,
  },
  createButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#C0FF72',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C0FF72',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
