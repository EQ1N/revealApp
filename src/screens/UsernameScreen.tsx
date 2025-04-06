import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { TextInput } from '../components/TextInput';
import { colors } from '../theme/colors';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { doc, getDoc, setDoc, enableNetwork, collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  VerifyCode: { verificationId: string; phoneNumber: string };
  Username: { phoneNumber: string };
  SetPassword: { phoneNumber: string; username: string; email: string };
};

type UsernameScreenRouteProp = RouteProp<RootStackParamList, 'Username'>;
type UsernameScreenNavigationProp = NavigationProp<RootStackParamList, 'Username'>;

export const UsernameScreen = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isConnected, setIsConnected] = useState(true);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [bypassOfflineCheck, setBypassOfflineCheck] = useState(__DEV__);
  const navigation = useNavigation<UsernameScreenNavigationProp>();
  const route = useRoute<UsernameScreenRouteProp>();
  const { phoneNumber } = route.params;

  // Check Firebase connection when component mounts
  useEffect(() => {
    if (!bypassOfflineCheck) {
      testFirestoreConnection();
    }
  }, [bypassOfflineCheck]);

  const testFirestoreConnection = async () => {
    if (bypassOfflineCheck) return;
    setCheckingConnection(true);
    try {
      // Try to enable network first
      await enableNetwork(db);
      
      // Try to get a single document from a collection
      const testQuery = query(collection(db, 'usernames'), limit(1));
      await getDocs(testQuery);
      setIsConnected(true);
      setError('');
    } catch (error: any) {
      console.error('Firebase connection test failed:', error);
      setIsConnected(false);
      if (error.code === 'failed-precondition' || error.code === 'unavailable') {
        setError('You appear to be offline. Please check your internet connection and tap Retry to try again.');
      } else {
        setError(`Connection error: ${error.message}`);
      }
    } finally {
      setCheckingConnection(false);
    }
  };

  const toggleBypassOfflineCheck = () => {
    const newValue = !bypassOfflineCheck;
    setBypassOfflineCheck(newValue);
    if (newValue) {
      // When enabling dev mode, clear connection-related states
      setIsConnected(true);
      setError('');
      setCheckingConnection(false);
    }
  };

  const attemptReconnect = async () => {
    setLoading(true);
    setError('Attempting to reconnect...');
    
    try {
      await testFirestoreConnection();
    } catch (err) {
      console.error('Reconnection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (username: string) => {
    if (!isConnected && !bypassOfflineCheck) {
      throw new Error('You are offline. Please check your internet connection and try again.');
    }
    
    try {
      const usernameRef = doc(db, 'usernames', username.toLowerCase());
      const usernameDoc = await getDoc(usernameRef);
      return !usernameDoc.exists();
    } catch (error: any) {
      console.error('Error checking username:', error);
      
      // Check if it's a connectivity issue
      if (error.code === 'unavailable' || error.code === 'failed-precondition') {
        setIsConnected(false);
        throw new Error('Unable to check username. You appear to be offline.');
      }
      
      throw error;
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleContinue = async () => {
    // Reset errors
    setError('');
    setEmailError('');
    
    // Validate username
    if (!username) {
      setError('Please enter a username');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Validate email
    if (!email) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Check connection first - unless bypass is enabled
    if (!isConnected && !bypassOfflineCheck) {
      Alert.alert(
        'You are offline',
        'Please check your internet connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry connection', onPress: attemptReconnect }
        ]
      );
      return;
    }

    try {
      setLoading(true);

      // Check if username is available
      let isAvailable = true;
      if (!bypassOfflineCheck) {
        isAvailable = await checkUsername(username);
        if (!isAvailable) {
          setError('This username is already taken');
          setLoading(false);
          return;
        }
      }

      if (bypassOfflineCheck) {
        console.warn("⚠️ DEVELOPMENT MODE: Bypassing offline check and username verification");
      }

      // Reserve the username (skip in bypass mode)
      if (!bypassOfflineCheck) {
        await setDoc(doc(db, 'usernames', username.toLowerCase()), {
          phoneNumber,
          email,
          createdAt: new Date(),
        });
      }

      // Navigate to password screen
      navigation.navigate('SetPassword', { phoneNumber, username, email });
    } catch (err: any) {
      // Check for offline errors
      if (err.message?.includes('offline') || err.code === 'unavailable') {
        setIsConnected(false);
        setError('You appear to be offline. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to check username availability');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={attemptReconnect}
            disabled={loading}
          >
            <Text style={styles.retryButtonText}>
              {loading ? 'Connecting...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.formContainer}>
          <Text style={styles.title}>Set up your profile</Text>
          
          {/* Dev mode button - Visible only in dev/testing */}
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.devModeButton, bypassOfflineCheck && styles.devModeButtonActive]} 
              onPress={toggleBypassOfflineCheck}
            >
              <Text style={styles.devModeButtonText}>
                {bypassOfflineCheck ? "DEV MODE: ON" : "DEV MODE: OFF"}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Continue with the rest of your form */}
          <View style={styles.form}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              autoCapitalize="none"
              autoComplete="username"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.spacer} />

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <TouchableOpacity
              style={[
                styles.button, 
                (!bypassOfflineCheck && (loading || checkingConnection || !isConnected)) && styles.disabledButton
              ]}
              onPress={handleContinue}
              disabled={!bypassOfflineCheck && (loading || checkingConnection || !isConnected)}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 16,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  form: {
    marginBottom: 24,
  },
  spacer: {
    height: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  disabledButton: {
    backgroundColor: colors.buttonDisabled,
  },
  disabledText: {
    color: colors.textDisabled,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20', // semi-transparent error color
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectionText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.error + '80',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offlineText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
  },
  devModeButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    padding: 6,
    marginBottom: 12,
  },
  devModeButtonActive: {
    backgroundColor: colors.primaryDark,
  },
  devModeButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkedBox: {
    backgroundColor: colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
}); 