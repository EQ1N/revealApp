import React from 'react';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParamListBase } from '@react-navigation/native';

// Custom header configuration that can be used across the app
export const getStandardHeaderOptions = ({
  navigation,
  title,
  hasRightButton = false,
  rightButtonIcon = 'settings-outline',
  rightButtonAction,
  showLabels = false,
  backLabel = 'Back',
  rightButtonLabel,
}: {
  navigation: any; // Changed to any to support different navigation types
  title?: string;
  hasRightButton?: boolean;
  rightButtonIcon?: any;
  rightButtonAction?: () => void;
  showLabels?: boolean;
  backLabel?: string;
  rightButtonLabel?: string;
}) => {
  // Determine the right button label if not provided
  const defaultRightButtonLabel = () => {
    if (!rightButtonLabel) {
      switch (rightButtonIcon) {
        case 'settings-outline':
          return 'Settings';
        case 'exit-outline':
          return 'Leave';
        default:
          return '';
      }
    }
    return rightButtonLabel;
  };

  return {
    headerShown: true,
    headerTitle: title,
    headerTitleAlign: 'center' as const,
    headerLeft: () => (
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.headerButton}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="arrow-back" size={24} color="#FFD700" />
          {showLabels && <Text style={styles.buttonLabel}>{backLabel}</Text>}
        </View>
      </TouchableOpacity>
    ),
    headerRight: () => (
      hasRightButton ? (
        <TouchableOpacity 
          onPress={rightButtonAction}
          style={styles.headerButton}
        >
          <View style={styles.buttonContent}>
            <Ionicons name={rightButtonIcon} size={24} color="#FFD700" />
            {showLabels && <Text style={styles.buttonLabel}>{defaultRightButtonLabel()}</Text>}
          </View>
        </TouchableOpacity>
      ) : (
        // Empty view with same width as the left button to balance the header
        <View style={{ width: showLabels ? 80 : 24, marginRight: 12 }} />
      )
    ),
    headerStyle: {
      backgroundColor: '#121212',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 0,
    },
    headerTitleStyle: {
      color: 'white',
      fontSize: 18,
      fontWeight: '600' as const,
    },
  };
};

const styles = StyleSheet.create({
  headerButton: {
    padding: 8,
    marginHorizontal: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonLabel: {
    color: '#FFD700',
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 14,
  },
}); 