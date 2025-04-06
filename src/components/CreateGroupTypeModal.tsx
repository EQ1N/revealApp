import React, { FC, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface CreateGroupTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectType: (type: 'public' | 'private') => void;
  // Optional mode to determine if we're showing from create button or indicator
  mode?: 'create' | 'indicator';
  // Reference to the position of the indicator to position the modal
  indicatorPosition?: { x: number, y: number, width: number, height: number };
  // Current selection state
  currentSelection?: 'public' | 'private';
}

const { width, height } = Dimensions.get('window');

const CreateGroupTypeModal: FC<CreateGroupTypeModalProps> = ({ 
  visible, 
  onClose, 
  onSelectType, 
  mode = 'create', 
  indicatorPosition,
  currentSelection = 'public'
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 7
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible]);

  // Calculate position based on the mode and indicator
  const getModalPosition = () => {
    if (mode === 'indicator' && indicatorPosition) {
      return {
        top: indicatorPosition.y + indicatorPosition.height + 10,
        alignSelf: 'center' as const,
      };
    }
    
    // Default position for 'create' mode is at the bottom
    return {
      bottom: 140,
      alignSelf: 'center' as const,
    };
  };

  // Calculate triangle position and orientation
  const getTriangleStyles = () => {
    if (mode === 'indicator') {
      // Triangle at the top of the modal, pointing up to the indicator
      return {
        container: {
          top: -10,
          alignSelf: 'center' as const,
        },
        triangle: {
          transform: [{ rotate: '135deg' }],
        }
      };
    }
    
    // Default triangle at the bottom of the modal, pointing down to the create button
    return {
      container: {
        bottom: -10,
        alignSelf: 'center' as const,
      },
      triangle: {
        top: -10,
        transform: [{ rotate: '45deg' }],
      }
    };
  };

  // Get modal title based on mode
  const getTitle = () => {
    return mode === 'indicator' ? 'Group Type' : 'Create New Reveal';
  };

  // Handle option press with different behavior for selected vs unselected
  const handleOptionPress = (type: 'public' | 'private') => {
    if (mode === 'indicator' && type === currentSelection) {
      // If in indicator mode and user clicks the already selected option, just close the modal
      onClose();
    } else {
      // Otherwise, update the selection and close
      onSelectType(type);
    }
  };

  const triangleStyles = getTriangleStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}
        />
        
        {/* Show create button only in create mode */}
        {mode === 'create' && (
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {}}
            >
              <View style={styles.addButtonInner}>
                <Ionicons name="add" size={28} color={colors.textPrimary} />
              </View>
              <Text style={styles.addButtonLabel}>Create</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.dismissOverlay} 
          onPress={onClose} 
          activeOpacity={1}
        />
        
        <Animated.View
          style={[
            styles.modalContent,
            getModalPosition(),
            {
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          {/* Title only shown in create mode now, removed from indicator mode */}
          {mode === 'create' && (
            <Text style={[styles.title, { marginBottom: 16 }]}>
              {getTitle()}
            </Text>
          )}

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.option,
                currentSelection === 'public' && mode === 'indicator' && styles.optionSelected
              ]}
              onPress={() => handleOptionPress('public')}
            >
              <View style={[
                styles.iconContainer,
                currentSelection === 'public' && mode === 'indicator' && styles.iconContainerSelected
              ]}>
                <Ionicons 
                  name="globe-outline" 
                  size={24} 
                  color={currentSelection === 'public' && mode === 'indicator' 
                    ? colors.textTertiary 
                    : colors.primary} 
                />
              </View>
              <Text style={[
                styles.optionTitle,
                currentSelection === 'public' && mode === 'indicator' && styles.textSelected
              ]}>Public Reveal</Text>
              <Text style={[
                styles.optionDescription,
                currentSelection === 'public' && mode === 'indicator' && styles.textSelected
              ]}>
                Anyone can find and join
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.option,
                currentSelection === 'private' && mode === 'indicator' && styles.optionSelected
              ]}
              onPress={() => handleOptionPress('private')}
            >
              <View style={[
                styles.iconContainer,
                currentSelection === 'private' && mode === 'indicator' && styles.iconContainerSelected
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={24} 
                  color={currentSelection === 'private' && mode === 'indicator' 
                    ? colors.textTertiary 
                    : colors.primary} 
                />
              </View>
              <Text style={[
                styles.optionTitle,
                currentSelection === 'private' && mode === 'indicator' && styles.textSelected
              ]}>Private Reveal</Text>
              <Text style={[
                styles.optionDescription,
                currentSelection === 'private' && mode === 'indicator' && styles.textSelected
              ]}>
                Only invited members
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Triangle pointer */}
          <View style={[styles.triangleContainer, triangleStyles.container]}>
            <View style={[styles.triangle, triangleStyles.triangle]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  addButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: colors.shadowOpacity,
    shadowRadius: 3,
    elevation: 5,
  },
  addButtonLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    width: width * 0.85,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    position: 'absolute',
  },
  triangleContainer: {
    position: 'absolute',
    width: 20,
    height: 10,
    overflow: 'hidden',
  },
  triangle: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  option: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    padding: 12,
    flex: 1,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#0A0A0A',
    opacity: 0.7,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: '#0A0A0A',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  textSelected: {
    color: colors.textTertiary,
  },
});

export default CreateGroupTypeModal; 