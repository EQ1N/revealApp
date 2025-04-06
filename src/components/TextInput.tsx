import React, { useState } from 'react';
import { 
  View, 
  TextInput as RNTextInput, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  TouchableOpacity,
  TextInputProps as RNTextInputProps
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CustomTextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  autoCorrect?: boolean;
  spellCheck?: boolean;
}

export const TextInput: React.FC<CustomTextInputProps> = ({
  label,
  error,
  style,
  containerStyle,
  autoCorrect = true,
  spellCheck = true,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          props.editable === false && styles.inputContainerDisabled,
        ]}
      >
        <RNTextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCorrect={autoCorrect}
          spellCheck={spellCheck}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: colors.inputBackground,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.divider,
    overflow: 'hidden',
    height: 52,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  inputContainerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    opacity: 0.7,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 4,
  },
});

export default TextInput; 