import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { TextInput } from '../components/TextInput';
import { colors } from '../theme/colors';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmail, isUsernameAvailable } from '../utils/emailAuth';

type RootStackParamList = {
  Login: undefined;
  EmailLogin: undefined;
  EmailSignup: undefined;
  Home: undefined;
};

type EmailSignupScreenNavigationProp = NavigationProp<RootStackParamList, 'EmailSignup'>;

export const EmailSignupScreen = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigation = useNavigation<EmailSignupScreenNavigationProp>();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Reset errors
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    
    // Validate inputs
    let hasError = false;
    
    // Validate username
    if (!username) {
      setUsernameError('Username is required');
      hasError = true;
    } else if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      hasError = true;
    }

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    } else if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setLoading(true);
      
      // Check if username is available
      const isAvailable = await isUsernameAvailable(username);
      if (!isAvailable) {
        setUsernameError('Username is already taken');
        setLoading(false);
        return;
      }
      
      // Create user
      await createUserWithEmail(email, password, username);
      
      // The user will be automatically navigated to the main app
      // through the auth state change listener in AuthContext
    } catch (err: any) {
      // Display appropriate error message
      if (err.message.includes('email-already-in-use')) {
        setEmailError('Email address is already in use');
      } else {
        Alert.alert('Error', err.message || 'Signup failed');
      }
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up with your email</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="johndoe"
            autoCapitalize="none"
            error={usernameError}
          />

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={emailError}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            error={passwordError}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[
              styles.button,
              (loading ||
                !username ||
                !email ||
                !password ||
                !confirmPassword) &&
                styles.buttonDisabled,
            ]}
            onPress={handleSignup}
            disabled={
              loading ||
              !username ||
              !email ||
              !password ||
              !confirmPassword
            }
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EmailLogin')}>
            <Text style={styles.footerLink}>Sign In</Text>
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
    padding: 8,
    marginLeft: -8,
    marginBottom: 24,
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
  form: {
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: colors.primaryDisabled,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  footerText: {
    color: colors.textSecondary,
    marginRight: 8,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
}); 