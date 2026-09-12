// app/index.tsx

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getSavedUser } from '@/screens/authStorage';
import LandingScreen from './components/views';

export default function Index() {
   const router = useRouter();
   const [checking, setChecking] = useState(true);

   useEffect(() => {
      let cancelled = false;

      const checkUser = async () => {
         try {
            const saved = await getSavedUser();

            if (cancelled) return;

            if (saved) {
               // User credentials already exist locally
               // Skip Landing + Login and go directly to Share screen.
               console.log(' Saved credentials found');
               console.log(' Going to /shares');

               router.replace('/shares');
               return;
            }

            // No saved credentials → first-time user
            console.log(' No saved credentials');
            console.log(' Showing Landing Screen');
            router.replace('/home')
            setChecking(false);
         } catch (error) {
            console.error(' Failed to check saved user:', error);

            if (!cancelled) {
               setChecking(false);
            }
         }
      };

      checkUser();

      return () => {
         cancelled = true;
      };
   }, [router]);

   // Keep Landing/Login hidden while checking storage
   if (checking) {
      return (
         <View style={styles.loadingScreen}>
            <ActivityIndicator
               size="large"
               color="#7c6fe0"
            />
         </View>
      );
   }

   // No credentials → show Landing
   return <LandingScreen />;
}

const styles = StyleSheet.create({
   loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f2f0fb',
   },
});