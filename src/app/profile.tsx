// app/profile.tsx
import { getSavedUser, logout, SavedUser } from '@/screens/authStorage';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Adjust this relative path to wherever authStorage.ts actually lives.
// import { getSavedUser, logout, SavedUser } from './authStorage';

export default function ProfileScreen() {
   const [user, setUser] = useState<SavedUser | null>(null);

   useEffect(() => {
      let cancelled = false;
      (async () => {
         const saved = await getSavedUser();
         if (!cancelled) setUser(saved);
      })();
      return () => {
         cancelled = true;
      };
   }, []);

   const handleLogout = () => {
      // Does NOT delete the saved account — next launch will still find it
      // and skip straight back past login. This just sends you there now.
      // logout(router, '/login');
   };

   return (
      <SafeAreaView style={styles.container}>
         <Text style={styles.title}>Profile</Text>

         <View style={styles.card}>
            {user?.avatar ? (
               <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
               <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                     {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                  </Text>
               </View>
            )}
            <Text style={styles.username}>{user?.username ?? 'Not signed in'}</Text>
         </View>

         <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color="#EF4444" strokeWidth={2.2} />
            <Text style={styles.logoutText}>Log out</Text>
         </Pressable>
      </SafeAreaView>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      backgroundColor: '#F7F7FC',
      paddingHorizontal: 24,
      paddingTop: 20,
      alignItems: 'center',
   },
   title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#171717',
      alignSelf: 'flex-start',
      marginBottom: 24,
   },
   card: {
      width: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      paddingVertical: 28,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
   },
   avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
   },
   avatarFallback: {
      backgroundColor: '#4F6BFF',
      alignItems: 'center',
      justifyContent: 'center',
   },
   avatarFallbackText: {
      color: '#FFFFFF',
      fontSize: 30,
      fontWeight: '700',
   },
   username: {
      marginTop: 14,
      fontSize: 18,
      fontWeight: '700',
      color: '#171717',
   },
   logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 24,
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderRadius: 16,
      backgroundColor: '#FEF2F2',
   },
   logoutText: {
      color: '#EF4444',
      fontSize: 15,
      fontWeight: '700',
   },
});