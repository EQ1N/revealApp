import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.logoText}>Reveal</Text>
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
      <Text style={styles.loadingText}>Just a moment...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6200EA',
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  spinner: {
    marginVertical: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});

export default LoadingScreen; 