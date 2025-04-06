import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

interface IButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  glowEffect?: boolean;
}

const Button: React.FC<IButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  glowEffect = false,
}) => {
  const buttonVariantStyle = {
    primary: styles.primaryButton,
    secondary: styles.secondaryButton,
    outline: styles.outlineButton,
    ghost: styles.ghostButton,
  }[variant];

  const textVariantStyle = {
    primary: styles.primaryText,
    secondary: styles.secondaryText,
    outline: styles.outlineText,
    ghost: styles.ghostText,
  }[variant];

  const buttonSizeStyle = {
    small: styles.smallButton,
    medium: styles.mediumButton,
    large: styles.largeButton,
  }[size];

  const textSizeStyle = {
    small: styles.smallText,
    medium: styles.mediumText,
    large: styles.largeText,
  }[size];

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : colors.primary} />
      ) : (
        <Text style={[textVariantStyle, textSizeStyle, textStyle]}>{title}</Text>
      )}
    </>
  );

  const buttonStyles = [
    styles.button,
    buttonVariantStyle,
    buttonSizeStyle,
    disabled && styles.disabledButton,
    glowEffect && !disabled && styles.glowEffect,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={disabled || loading ? undefined : onPress}
      style={buttonStyles}
      activeOpacity={0.7}
      disabled={disabled || loading}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  primaryText: {
    color: '#000000',
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  outlineText: {
    color: colors.primary,
    fontWeight: '600',
  },
  ghostText: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  largeButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 160,
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: colors.buttonDisabled,
  },
  glowEffect: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default Button; 