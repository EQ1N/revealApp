import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { BlurView } from 'expo-blur';

interface AudioWaveformProps {
  isRevealed: boolean;
  onPlay: () => void;
  width?: number | string;
  barCount?: number;
  isPlaying?: boolean;
  progress?: number;
}

/**
 * Clean vertical bar waveform component showing different states for revealed and unrevealed audio
 */
const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRevealed,
  onPlay,
  width = '100%',
  barCount = 24,
  isPlaying = false,
  progress = 0
}) => {
  const [animatedProgress] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(0));
  
  // Use a number for calculations
  const effectiveWidth = typeof width === 'string' ? 300 : width;
  
  // Animate the progress if playing changes
  useEffect(() => {
    if (isPlaying && isRevealed) {
      // Animate to the current progress
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
        easing: Easing.linear
      }).start();
    }
  }, [isPlaying, progress, isRevealed]);
  
  // Create a subtle pulse animation for the waveform when playing
  useEffect(() => {
    if (isPlaying && isRevealed) {
      // Start a continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.sin)
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
            easing: Easing.inOut(Easing.sin)
          })
        ])
      ).start();
    } else {
      // Reset the animation
      pulseAnim.setValue(0);
    }
  }, [isPlaying, isRevealed]);

  // Generate a clean waveform pattern with distinct vertical bars like in the image
  const generateWaveformPattern = (barCount: number) => {
    // Create a classic waveform pattern with more pronounced peaks and valleys
    return Array.from({ length: barCount }, (_, i) => {
      // Create a base sine wave pattern - use multiple frequencies for a more natural look
      const phase = Math.PI * 2 * (i / barCount);
      
      // Primary wave pattern
      const wave1 = Math.sin(phase * 2.5) * 0.4;
      const wave2 = Math.sin(phase * 5 + 0.5) * 0.2;
      const wave3 = Math.sin(phase * 1.2 + 1) * 0.25;
      
      // Combine waves for a more natural pattern
      const combinedHeight = wave1 + wave2 + wave3;
      
      // Map to [0.15, 0.9] range
      return 0.15 + (Math.abs(combinedHeight) * 0.75);
    });
  };

  // Use the same clean waveform pattern for both revealed and unrevealed,
  // but with different styles
  const waveformPattern = useMemo(() => 
    generateWaveformPattern(barCount), [barCount]);
  
  // Configure bar width and spacing for the clean look
  const barWidth = 2;
  const barSpacing = Math.min(4, (effectiveWidth / barCount) - barWidth);
  
  // Calculate the number of bars that should be shown as "played"
  const playedBarCount = Math.floor(progress * barCount);

  // Interpolate the pulse animation for the active bars
  const activeBarOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1]
  });
  
  const activeBarScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05]
  });

  return (
    <View style={styles.container}>
      {isRevealed && (
        <TouchableOpacity 
          style={[
            styles.playButton,
            isPlaying && styles.playButtonActive
          ]}
          onPress={onPlay}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={16}
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      )}
      
      <View style={[
        styles.waveformContainer,
        !isRevealed && { paddingVertical: 12, paddingHorizontal: 12 }
      ]}>
        {/* Always render the waveform */}
        {waveformPattern.map((height, index) => {
          // Determine if this bar should be shown as "played"
          const isPlayed = isRevealed && index < playedBarCount;
          
          // Calculate spacing based on available width
          const dynamicSpacing = index < barCount - 1 ? barSpacing : 0;
          
          // For revealed and played bars with animation when playing
          if (isRevealed && isPlayed && isPlaying) {
            return (
              <Animated.View
                key={`bar-${index}`}
                style={[
                  styles.bar,
                  {
                    height: `${height * 100}%`,
                    width: barWidth,
                    backgroundColor: colors.primary,
                    marginRight: dynamicSpacing,
                    opacity: activeBarOpacity,
                    transform: [{ scaleY: activeBarScale }]
                  }
                ]}
              />
            );
          }
          
          // Regular bars
          return (
            <View
              key={`bar-${index}`}
              style={[
                styles.bar,
                {
                  height: `${height * 100}%`,
                  width: barWidth,
                  backgroundColor: isRevealed 
                    ? (isPlayed ? colors.primary : '#000000') 
                    : '#888888',
                  marginRight: dynamicSpacing,
                }
              ]}
            />
          );
        })}

        {/* Apply a blur overlay when not revealed */}
        {!isRevealed && (
          <View style={styles.blurOverlay}>
            <BlurView 
              intensity={10} 
              tint="default" 
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: 18 }
              ]} 
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    width: '100%',
    marginVertical: 0,
    padding: 0,
  },
  playButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  playButtonActive: {
    backgroundColor: '#FF3B30', // Red color when playing
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 0,
    margin: 0,
  },
  bar: {
    borderRadius: 0, // Sharp corners for the clean look
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    margin: 0,
    padding: 0,
    borderRadius: 18,
  },
});

export default AudioWaveform; 