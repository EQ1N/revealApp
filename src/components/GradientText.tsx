import React, { ReactNode } from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, Animated } from 'react-native';
import { colors } from '../theme/colors';

interface IGradientTextProps {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  glowIntensity?: 'low' | 'medium' | 'high';
  animated?: boolean;
}

/**
 * A component that renders text with a glow effect.
 */
const GradientText: React.FC<IGradientTextProps> = ({
  children,
  style,
  glowIntensity = 'medium',
  animated = false,
}) => {
  // Configure glow based on intensity
  const glowRadius = {
    low: 4,
    medium: 8,
    high: 15
  }[glowIntensity];
  
  if (animated) {
    const glowAnim = React.useRef(new Animated.Value(0.5)).current;
    
    React.useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [glowAnim]);
    
    return (
      <Animated.Text
        style={[
          styles.text,
          {
            textShadowRadius: Animated.multiply(glowAnim, glowRadius),
            textShadowColor: colors.primary,
          },
          style,
        ]}
      >
        {children}
      </Animated.Text>
    );
  }
  
  return (
    <Text
      style={[
        styles.text,
        {
          textShadowRadius: glowRadius,
          textShadowColor: colors.primary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
  },
});

export default GradientText; 