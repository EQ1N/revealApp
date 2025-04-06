import React, { ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './colors';

interface IThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<IThemeProviderProps> = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Background with gradient */}
      <LinearGradient
        colors={['#061708', '#0A2012', '#061708']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <StatusBar style="light" />
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    flex: 1,
  },
});

export default ThemeProvider; 