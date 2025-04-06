import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RouteProp, useNavigation, useRoute, NavigationProp, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { colors } from '../theme/colors';
import { getStandardHeaderOptions } from '../navigation/HeaderConfig';
import { Switch } from 'react-native-gesture-handler';

// Define the navigation param list type
type RootStackParamList = {
  Home: undefined;
  Chat: { groupId: string; groupName: string };
  GroupSettings: { groupId: string };
};

type GroupSettingsScreenNavigationProp = NavigationProp<RootStackParamList, 'GroupSettings'>;
type GroupSettingsScreenRouteProp = RouteProp<RootStackParamList, 'GroupSettings'>;

const GroupSettingsScreen = () => {
  const route = useRoute<GroupSettingsScreenRouteProp>();
  const navigation = useNavigation<GroupSettingsScreenNavigationProp>();
  const { groupId } = route.params;
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allowAllToPost, setAllowAllToPost] = useState(false);
  const currentUser = auth.currentUser;

  // Set up the navigation header
  useLayoutEffect(() => {
    navigation.setOptions(
      getStandardHeaderOptions({
        navigation,
        title: 'Group Settings',
        hasRightButton: false
      })
    );
  }, [navigation]);

  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true);
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          const groupData = { id: groupDoc.id, ...groupDoc.data() };
          setGroup(groupData);
          setAllowAllToPost(groupData.allowAllToPost || false);
        } else {
          setError('Group not found');
        }
      } catch (err) {
        console.error('Error fetching group:', err);
        setError('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'groups', groupId));
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })
              );
            } catch (err) {
              console.error('Error deleting group:', err);
              Alert.alert('Error', 'Failed to delete group');
            }
          }
        }
      ]
    );
  };

  const togglePostingPermissions = async (value: boolean) => {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        allowAllToPost: value
      });
      setAllowAllToPost(value);
    } catch (err) {
      console.error('Error updating group:', err);
      Alert.alert('Error', 'Failed to update posting permissions');
      // Revert the switch state
      setAllowAllToPost(!value);
    }
  };

  // Check if current user is the owner
  const isOwner = currentUser && group && currentUser.uid === group.ownerId;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: colors.error, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 12, backgroundColor: colors.primary, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: colors.error, textAlign: 'center' }}>
          You do not have permission to access group settings.
        </Text>
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 12, backgroundColor: colors.primary, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar style="light" />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Who can post messages</Text>
              <Text style={styles.settingDescription}>
                {allowAllToPost ? 'All members can post messages' : 'Only you can post messages'}
              </Text>
            </View>
            <Switch
              value={allowAllToPost}
              onValueChange={togglePostingPermissions}
              trackColor={{ false: '#d3d3d3', true: '#34C759' }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Edit Group Details</Text>
              <Text style={styles.settingDescription}>Change group name, description, or image</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#757575" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.error }]}>Danger Zone</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.dangerItem]}
            onPress={handleDeleteGroup}
          >
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.error }]}>Delete Group</Text>
              <Text style={styles.settingDescription}>
                This will permanently delete the group and all its messages
              </Text>
            </View>
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    marginBottom: 24,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
});

export default GroupSettingsScreen; 