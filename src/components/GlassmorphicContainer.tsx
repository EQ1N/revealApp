import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

interface IGlassmorphicContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  gradientBorder?: boolean;
  glowEffect?: boolean;
}

const GlassmorphicContainer: React.FC<IGlassmorphicContainerProps> = ({
  children,
  style,
  intensity = 20,
  tint = 'dark',
  gradientBorder = true,
  glowEffect = false,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Glass background with blur */}
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={styles.blurView}
      >
        {/* Inner content container */}
        <View style={styles.contentContainer}>
          {children}
        </View>
      </BlurView>
      
      {/* Gradient border effect */}
      {gradientBorder && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        />
      )}
      
      {/* Glow effect */}
      {glowEffect && (
        <LinearGradient
          colors={colors.gradients.glow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glowEffect}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  blurView: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.glass.background,
  },
  contentContainer: {
    padding: 16,
    borderRadius: 16,
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  glowEffect: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 50,
    opacity: 0.5,
    zIndex: -1,
  },
});

export default GlassmorphicContainer; 