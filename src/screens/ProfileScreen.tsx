import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { colors } from '../theme/colors';

export const ProfileScreen = () => {
  const currentUser = auth.currentUser;

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {currentUser?.photoURL ? (
              <Image 
                source={{ uri: currentUser.photoURL }} 
                style={styles.avatar} 
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Text style={styles.avatarText}>
                  {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.displayName}>
            {currentUser?.displayName || 'User'}
          </Text>
          
          <Text style={styles.email}>
            {currentUser?.email || 'No email provided'}
          </Text>
        </View>
        
        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingsText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingsText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="moon-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingsText}>Appearance</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="help-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.settingsText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.headerBlur,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  placeholderAvatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: 'bold',
  },
  displayName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingsSection: {
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  settingsText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 32,
  },
  logoutText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
}); 