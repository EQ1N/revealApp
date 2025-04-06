import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getTimeRemaining } from '../utils/helpers';
import { getPublicGroups, joinGroup } from '../services/groupService';
import { TGroup } from '../types/group';
import { format } from 'date-fns';

// Define the navigation param list type
type RootStackParamList = {
  Home: undefined;
  Chat: { groupId: string; groupName: string; revealDate: any };
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupSettings: { groupId: string };
};

// Define the navigation prop type
type JoinGroupScreenNavigationProp = NavigationProp<RootStackParamList, 'JoinGroup'>;

const JoinGroupScreen = () => {
  const navigation = useNavigation<JoinGroupScreenNavigationProp>();
  const [groups, setGroups] = useState<TGroup[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<TGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [searchText, setSearchText] = useState('');
  const currentUser = auth.currentUser;
  
  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredGroups(groups);
    } else {
      const filtered = groups.filter(group => 
        group.name.toLowerCase().includes(searchText.toLowerCase()) ||
        group.description.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  }, [searchText, groups]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const publicGroups = await getPublicGroups();
      setGroups(publicGroups);
      setFilteredGroups(publicGroups);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load public groups');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (group: TGroup) => {
    try {
      setJoining(true);
      await joinGroup(group.id);
      Alert.alert(
        'Success', 
        `You have joined "${group.name}"`,
        [
          {
            text: 'Go to Group',
            onPress: () => navigation.navigate('Chat', {
              groupId: group.id,
              groupName: group.name,
              revealDate: group.revealDate
            })
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  const formatRevealDate = (date: any) => {
    if (!date) return 'Unknown';
    
    const jsDate = date.toDate ? date.toDate() : new Date(date);
    return format(jsDate, 'MMMM d, yyyy');
  };

  const renderGroupItem = ({ item }: { item: TGroup }) => {
    const memberCount = item.members.length;
    const timeRemaining = getTimeRemaining(item.revealDate);
    
    return (
      <View style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupName}>{item.name}</Text>
        </View>
        
        <Text style={styles.groupDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.groupInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={16} color="#757575" />
            <Text style={styles.infoText}>{memberCount} member{memberCount !== 1 ? 's' : ''}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={16} color="#757575" />
            <Text style={styles.infoText}>{timeRemaining}</Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.joinButton, joining && styles.joinButtonDisabled]}
          onPress={() => handleJoinGroup(item)}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.joinButtonText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render empty component
  const renderEmptyComponent = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={64} color="#E0E0E0" />
        <Text style={styles.emptyTitle}>No Groups Found</Text>
        <Text style={styles.emptyText}>
          {searchText.trim() ? 
            'Try a different search query' : 
            'There are no public groups available to join'}
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join a Group</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9E9E9E" />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search for groups"
          placeholderTextColor="#9E9E9E"
          clearButtonMode="while-editing"
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EA" />
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
    paddingLeft: 8,
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 16,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  groupDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  groupInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  joinButton: {
    backgroundColor: '#03DAC6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});

export default JoinGroupScreen; 