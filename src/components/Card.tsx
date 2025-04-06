import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface ICardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  glassEffect?: boolean;
  gradientBorder?: boolean;
  neonGlow?: boolean;
}

const Card: React.FC<ICardProps> = ({
  children,
  style,
  onPress,
  glassEffect = true,
  gradientBorder = true,
  neonGlow = false,
}) => {
  const CardContainer = onPress ? TouchableOpacity : View;
  
  return (
    <CardContainer
      style={[styles.container, neonGlow && styles.neonShadow, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : undefined}
    >
      {glassEffect ? (
        <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
          <View style={styles.content}>
            {children}
          </View>
        </BlurView>
      ) : (
        <View style={styles.content}>
          {children}
        </View>
      )}
      
      {gradientBorder && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        />
      )}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    position: 'relative',
    marginVertical: 8,
  },
  blurContainer: {
    overflow: 'hidden',
    backgroundColor: colors.glass.background,
  },
  content: {
    padding: 16,
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
    opacity: 0.7,
  },
  neonShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
});

export default Card; 