import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { verifyPhoneCode } from '../utils/unifiedAuth';
import { collection, query, where, getDocs, getDoc, doc, enableNetwork } from 'firebase/firestore';

type RootStackParamList = {
  Login: undefined;
  VerifyCode: { verificationId: string; phoneNumber: string; isLogin?: boolean };
  Username: { phoneNumber: string };
  SetPassword: { phoneNumber: string; username: string; email: string };
};

type VerifyCodeRouteProp = RouteProp<RootStackParamList, 'VerifyCode'>;

export const VerifyCodeScreen = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds countdown
  const navigation = useNavigation<any>();
  const route = useRoute<VerifyCodeRouteProp>();
  const { verificationId, phoneNumber, isLogin = false } = route.params;
  const inputRef = useRef<RNTextInput>(null);

  // Auto-focus the input field
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, []);

  // Countdown timer for resend code
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft]);

  // Validate verification ID when screen loads
  useEffect(() => {
    if (!verificationId) {
      setError('Missing verification ID. Please request a new code.');
      Alert.alert(
        'Verification Error',
        'Your verification session may have expired. Please request a new code.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [verificationId, navigation]);

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (code.length === 6) {
      handleVerifyCode();
    }
  }, [code]);

  const sanitizeCode = (inputCode: string): string => {
    // Remove any non-digit characters and trim whitespace
    return inputCode.replace(/\D/g, '').trim();
  };

  const checkUserExists = async (phoneNumber: string): Promise<{ exists: boolean, userData?: any }> => {
    try {
      console.log(`Checking if user exists with phone: ${phoneNumber}`);
      
      // Ensure network is enabled
      try {
        await enableNetwork(db);
      } catch (err) {
        console.log("Warning: Could not enable network", err);
      }
      
      // Normalize phone number by removing spaces and any formatting
      const normalizedPhone = phoneNumber.replace(/\s+/g, '');
      console.log(`Normalized phone number: ${normalizedPhone}`);
      
      // Try different phone number formats
      const phoneFormats = [
        normalizedPhone,
        normalizedPhone.replace(/^\+/, ''), // Without plus
      ];
      
      console.log('Checking users collection...');
      
      // Check for any format in users collection
      for (const phone of phoneFormats) {
        console.log(`Trying format: ${phone}`);
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phoneNumber', '==', phone));
        
        try {
          const querySnapshot = await getDocs(q);
          console.log(`Found ${querySnapshot.size} results for format: ${phone}`);
          
          if (!querySnapshot.empty) {
            // Return the first matching user
            const userData = querySnapshot.docs[0].data();
            console.log('User found in users collection:', userData);
            return { exists: true, userData };
          }
        } catch (e) {
          console.error(`Error querying for ${phone}:`, e);
        }
      }
      
      console.log('Checking usernames collection...');
      
      // Check for any format in usernames collection
      for (const phone of phoneFormats) {
        const usernamesRef = collection(db, 'usernames');
        const usernameQuery = query(usernamesRef, where('phoneNumber', '==', phone));
        
        try {
          const usernameSnapshot = await getDocs(usernameQuery);
          console.log(`Found ${usernameSnapshot.size} results in usernames for format: ${phone}`);
          
          if (!usernameSnapshot.empty) {
            console.log('User found in usernames collection');
            return { exists: true };
          }
        } catch (e) {
          console.error(`Error querying usernames for ${phone}:`, e);
        }
      }
      
      // No user found in any collection with any format
      console.log('No user found with this phone number');
      return { exists: false };
    } catch (error) {
      console.error('Error checking if user exists:', error);
      Alert.alert(
        'Database Error',
        'Failed to check if user exists. Please try again or check your internet connection.'
      );
      return { exists: false };
    }
  };

  const handleVerifyCode = async () => {
    try {
      // Sanitize the code first
      const sanitizedCode = sanitizeCode(code);
      
      if (sanitizedCode.length !== 6) {
        setError('Please enter a valid 6-digit code');
        return;
      }

      if (!verificationId) {
        setError('Verification session expired. Please request a new code.');
        return;
      }

      setLoading(true);
      setError('');
      
      console.log(`Verifying code: ${sanitizedCode} with ID: ${verificationId}`);
      
      // Use the unified auth service to verify the code
      await verifyPhoneCode(verificationId, sanitizedCode);
      
      console.log('Verification successful, checking user existence...');
      
      // Check user existence based on phone number
      const { exists } = await checkUserExists(phoneNumber);
      
      if (exists) {
        // User exists - authentication will handle redirection through the auth listener
        console.log('✓ User exists, authentication successful');
        Alert.alert('Success', 'Authentication successful, you will be redirected to home screen.');
        return;
      } else if (isLogin) {
        // This was a login attempt but user doesn't exist
        console.log('⚠ Login attempt but no account found');
        Alert.alert(
          'Account Not Found',
          'No account found with this phone number. Would you like to create one?',
          [
            {
              text: 'Cancel',
              onPress: () => navigation.navigate('Login'),
              style: 'cancel',
            },
            {
              text: 'Sign Up',
              onPress: () => navigation.navigate('Username', { phoneNumber }),
            },
          ]
        );
      } else {
        // This was a signup attempt and the user doesn't exist
        // Proceed with the signup flow
        console.log('→ New user, proceeding with signup flow');
        navigation.navigate('Username', { phoneNumber });
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // Check specifically for Firebase auth errors
      if (err.code && err.code.startsWith('auth/')) {
        console.log('Firebase auth error:', err.code);
      }
      
      // Show a more user-friendly error
      const errorMessage = err.message || 'Failed to verify code';
      setError(errorMessage);
      
      // Clear the input on error for a better UX
      setCode('');
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    // Reset state
    setCode('');
    setError('');
    
    // Navigate back to resend the code
    navigation.goBack();
  };

  // Only allow numeric input
  const handleCodeChange = (text: string) => {
    // Filter out non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    setCode(numericText);
  };

  return (
    <SafeAreaView style={styles.container}>
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

        <View style={styles.header}>
          <Text style={styles.title}>Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to <Text style={styles.phoneText}>{phoneNumber}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Verification Code</Text>
          <RNTextInput
            ref={inputRef}
            style={styles.input}
            value={code}
            onChangeText={handleCodeChange}
            placeholder="123456"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading || code.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResendCode}
            disabled={timeLeft > 0}
          >
            <Text style={[styles.resendText, timeLeft > 0 && styles.resendTextDisabled]}>
              {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 16,
    padding: 8,
    alignSelf: 'flex-start',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  phoneText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  resendTextDisabled: {
    color: colors.textSecondary,
  },
}); 