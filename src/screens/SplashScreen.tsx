import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: true,
          })
        ])
      )
    ]).start();

    // Set a timeout to navigate away after animations
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    // Clear timeout on unmount
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, glowAnim, onComplete]);

  return (
    <LinearGradient
      colors={['#061708', '#0A2012', '#061708']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.glowContainer,
            {
              opacity: glowAnim
            }
          ]}
        >
          <LinearGradient
            colors={['transparent', colors.primary, 'transparent']}
            style={styles.glow}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>
        
        <View style={styles.logoContainer}>
          <BlurView intensity={30} tint="dark" style={styles.logoBlur}>
            <View style={styles.logoCircle}>
              <Ionicons name="camera-outline" size={60} color={colors.primary} />
            </View>
          </BlurView>
        </View>
        
        <Animated.Text 
          style={[
            styles.appName,
            {
              textShadowRadius: Animated.multiply(glowAnim, 10),
              textShadowColor: colors.primary,
            }
          ]}
        >
          Reveal
        </Animated.Text>
        <Text style={styles.tagline}>Share now, reveal later</Text>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    overflow: 'hidden',
    zIndex: -1,
  },
  glow: {
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  logoContainer: {
    marginBottom: 24,
    borderRadius: 60,
    overflow: 'hidden',
  },
  logoBlur: {
    borderRadius: 60,
    padding: 2,
    backgroundColor: 'rgba(15, 36, 26, 0.3)',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(15, 36, 26, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  }
});

export default SplashScreen; 