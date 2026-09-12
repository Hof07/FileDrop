// SettingsScreen.tsx
//
// Suggested location: app/profile.tsx — ShareScreen's avatar button already
// does router.push('/profile'), so dropping this in at that route wires it
// up with no other changes needed. Rename the route if yours differs.
import {
   forgetUserPermanently,
   getSavedUser,
   logout,
   persistAvatarImage,
   SavedUser,
   updateUser,
} from '@/screens/authStorage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
   Camera,
   ChevronLeft,
   ChevronRight,
   Eye,
   EyeOff,
   ImagePlus,
   Lock,
   LogOut,
   Smartphone,
   Trash2,
   User,
   Wifi,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
   ActivityIndicator,
   Alert,
   Animated,
   Easing,
   Image,
   ImageStyle,
   KeyboardAvoidingView,
   Modal,
   Platform,
   Pressable,
   ScrollView,
   StyleSheet,
   Switch,
   Text,
   TextInput,
   TextStyle,
   View,
   ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
   const insets = useSafeAreaInsets();

   const [user, setUser] = useState<SavedUser | null>(null);
   const [loading, setLoading] = useState(true);
   const [avatarFailed, setAvatarFailed] = useState(false);
   const [avatarBusy, setAvatarBusy] = useState(false);
   const [pickerVisible, setPickerVisible] = useState(false);

   const [deviceName, setDeviceName] = useState('');
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [passwordVisible, setPasswordVisible] = useState(false);
   const [discoverable, setDiscoverable] = useState(true);

   const toastOpacity = useRef(new Animated.Value(0)).current;
   const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

   useEffect(() => {
      let cancelled = false;

      (async () => {
         const saved = await getSavedUser();
         if (cancelled) return;

         setUser(saved);
         setDeviceName(saved?.deviceName ?? '');
         setUsername(saved?.username ?? '');
         setPassword(saved?.password ?? '');
         setDiscoverable(saved?.discoverable ?? true);
         setAvatarFailed(false);
         setLoading(false);
      })();

      return () => {
         cancelled = true;
      };
   }, []);

   function showSavedToast() {
      if (toastTimeout.current) clearTimeout(toastTimeout.current);

      Animated.timing(toastOpacity, {
         toValue: 1,
         duration: 180,
         easing: Easing.out(Easing.quad),
         useNativeDriver: true,
      }).start();

      toastTimeout.current = setTimeout(() => {
         Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 260,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
         }).start();
      }, 1100);
   }

   async function persistField(changes: Partial<SavedUser>) {
      const next = await updateUser(changes);
      setUser(next);
      showSavedToast();
   }

   async function handleDeviceNameCommit() {
      const trimmed = deviceName.trim();
      if (trimmed === (user?.deviceName ?? '')) return;
      setDeviceName(trimmed);
      await persistField({ deviceName: trimmed || null });
   }

   async function handleUsernameCommit() {
      const trimmed = username.trim();
      if (!trimmed) {
         setUsername(user?.username ?? '');
         Alert.alert('Username required', 'Username cannot be empty.');
         return;
      }
      if (trimmed === user?.username) return;
      setUsername(trimmed);
      await persistField({ username: trimmed });
   }

   async function handlePasswordCommit() {
      if (!password || password === user?.password) return;
      await persistField({ password });
   }

   async function handleToggleDiscoverable(value: boolean) {
      setDiscoverable(value);
      await persistField({ discoverable: value });
   }

   async function applyPickedPhoto(pickedUri: string) {
      setAvatarBusy(true);
      try {
         const permanentUri = await persistAvatarImage(pickedUri);
         const next = await updateUser({ avatar: permanentUri });
         setUser(next);
         setAvatarFailed(false);
         showSavedToast();
      } catch (error) {
         console.warn('Failed to save avatar:', error);
         Alert.alert('Something went wrong', 'That photo could not be saved. Please try again.');
      } finally {
         setAvatarBusy(false);
         setPickerVisible(false);
      }
   }

   async function handleTakePhoto() {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
         Alert.alert('Camera access needed', 'Enable camera access in Settings to take a photo.');
         return;
      }

      const result = await ImagePicker.launchCameraAsync({
         allowsEditing: true,
         aspect: [1, 1],
         quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
         await applyPickedPhoto(result.assets[0].uri);
      }
   }

   async function handleChooseFromLibrary() {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
         Alert.alert('Photo access needed', 'Enable photo library access in Settings to choose an image.');
         return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
         mediaTypes: ImagePicker.MediaTypeOptions.Images,
         allowsEditing: true,
         aspect: [1, 1],
         quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
         await applyPickedPhoto(result.assets[0].uri);
      }
   }

   function handleRemovePhoto() {
      setPickerVisible(false);
      Alert.alert('Remove photo?', 'You can add a new one any time.', [
         { text: 'Cancel', style: 'cancel' },
         {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
               await persistField({ avatar: null });
               setAvatarFailed(false);
            },
         },
      ]);
   }

   function handleLogout() {
      Alert.alert('Log out?', 'Your account stays saved on this device — you can jump back in any time.', [
         { text: 'Cancel', style: 'cancel' },
         { text: 'Log out', onPress: () => logout(router) },
      ]);
   }

   function handleDeleteAccount() {
      Alert.alert(
         'Delete account?',
         'This permanently erases your account and photo from this device. This can\u2019t be undone.',
         [
            { text: 'Cancel', style: 'cancel' },
            {
               text: 'Delete',
               style: 'destructive',
               onPress: async () => {
                  await forgetUserPermanently();
                  router.replace('/home');
               },
            },
         ]
      );
   }

   const showAvatarImage = user?.avatar && !avatarFailed;

   return (
      <KeyboardAvoidingView
         style={styles.container}
         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
         <View style={styles.backgroundOrbOne} />
         <View style={styles.backgroundOrbTwo} />

         <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Pressable
               onPress={() => router.back()}
               style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
               accessibilityRole="button"
               accessibilityLabel="Go back"
            >
               <ChevronLeft size={22} color="#1A1E2B" strokeWidth={2.4} />
            </Pressable>

            <Text style={styles.headerTitle}>Settings</Text>

            <View style={styles.headerSpacer} />
         </View>

         {loading ? (
            <View style={styles.loadingState}>
               <ActivityIndicator color="#526EFF" />
            </View>
         ) : (
            <ScrollView
               contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
               keyboardShouldPersistTaps="handled"
               showsVerticalScrollIndicator={false}
            >
               <View style={styles.avatarSection}>
                  <Pressable
                     onPress={() => setPickerVisible(true)}
                     style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
                     accessibilityRole="button"
                     accessibilityLabel="Change profile photo"
                  >
                     {showAvatarImage ? (
                        <Image
                           source={{ uri: user!.avatar! }}
                           style={styles.avatarImage}
                           onError={() => setAvatarFailed(true)}
                        />
                     ) : (
                        <View style={styles.avatarFallback}>
                           <Text style={styles.avatarFallbackText}>
                              {username ? username.charAt(0).toUpperCase() : '?'}
                           </Text>
                        </View>
                     )}

                     <View style={styles.avatarEditBadge}>
                        {avatarBusy ? (
                           <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                           <Camera size={15} color="#FFFFFF" strokeWidth={2.4} />
                        )}
                     </View>
                  </Pressable>

                  <Text style={styles.avatarHint}>Tap to change photo</Text>
               </View>

               <Text style={styles.sectionLabel}>Profile</Text>
               <View style={styles.card}>
                  <SettingsRow
                     icon={<Smartphone size={18} color="#4968FF" strokeWidth={2.2} />}
                     iconBackground="#EEF1FF"
                     title="Device name"
                     subtitle="Shown to nearby devices while sharing"
                  >
                     <TextInput
                        value={deviceName}
                        onChangeText={setDeviceName}
                        onEndEditing={handleDeviceNameCommit}
                        placeholder="e.g. Alex's phone"
                        placeholderTextColor="#B7BBC8"
                        style={styles.rowInput}
                        returnKeyType="done"
                     />
                  </SettingsRow>

                  <View style={styles.divider} />

                  <SettingsRow
                     icon={<User size={18} color="#4968FF" strokeWidth={2.2} />}
                     iconBackground="#EEF1FF"
                     title="Username"
                  >
                     <TextInput
                        value={username}
                        onChangeText={setUsername}
                        onEndEditing={handleUsernameCommit}
                        autoCapitalize="none"
                        style={styles.rowInput}
                        returnKeyType="done"
                     />
                  </SettingsRow>

                  <View style={styles.divider} />

                  <SettingsRow
                     icon={<Lock size={18} color="#4968FF" strokeWidth={2.2} />}
                     iconBackground="#EEF1FF"
                     title="Password"
                  >
                     <View style={styles.passwordRow}>
                        <TextInput
                           value={password}
                           onChangeText={setPassword}
                           onEndEditing={handlePasswordCommit}
                           secureTextEntry={!passwordVisible}
                           autoCapitalize="none"
                           style={[styles.rowInput, styles.passwordInput]}
                           returnKeyType="done"
                        />
                        <Pressable
                           onPress={() => setPasswordVisible((value) => !value)}
                           hitSlop={8}
                           accessibilityRole="button"
                           accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                        >
                           {passwordVisible ? (
                              <EyeOff size={18} color="#9AA0B1" strokeWidth={2} />
                           ) : (
                              <Eye size={18} color="#9AA0B1" strokeWidth={2} />
                           )}
                        </Pressable>
                     </View>
                  </SettingsRow>
               </View>

               <Text style={styles.sectionLabel}>Sharing</Text>
               <View style={styles.card}>
                  <SettingsRow
                     icon={<Wifi size={18} color="#2FAE6B" strokeWidth={2.2} />}
                     iconBackground="#E9F9F0"
                     title="Discoverable by nearby devices"
                     subtitle="Turn off to hide from other people's radar"
                  >
                     <Switch
                        value={discoverable}
                        onValueChange={handleToggleDiscoverable}
                        trackColor={{ false: '#E3E5EC', true: '#526EFF' }}
                        thumbColor="#FFFFFF"
                     />
                  </SettingsRow>
               </View>

               <Text style={styles.sectionLabel}>Account</Text>
               <View style={styles.card}>
                  <Pressable
                     onPress={handleLogout}
                     style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
                  >
                     <View style={[styles.rowIcon, { backgroundColor: '#EEF1FF' }]}>
                        <LogOut size={18} color="#4968FF" strokeWidth={2.2} />
                     </View>
                     <Text style={styles.navRowTitle}>Log out</Text>
                     <ChevronRight size={18} color="#C4C8D4" strokeWidth={2.2} />
                  </Pressable>

                  <View style={styles.divider} />

                  <Pressable
                     onPress={handleDeleteAccount}
                     style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
                  >
                     <View style={[styles.rowIcon, { backgroundColor: '#FDECEC' }]}>
                        <Trash2 size={18} color="#E5484D" strokeWidth={2.2} />
                     </View>
                     <Text style={[styles.navRowTitle, styles.dangerText]}>Delete account</Text>
                     <ChevronRight size={18} color="#C4C8D4" strokeWidth={2.2} />
                  </Pressable>
               </View>
            </ScrollView>
         )}

         <Animated.View
            pointerEvents="none"
            style={[styles.toast, { opacity: toastOpacity, bottom: insets.bottom + 24 }]}
         >
            <Text style={styles.toastText}>Saved</Text>
         </Animated.View>

         <Modal
            visible={pickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setPickerVisible(false)}
         >
            <View style={styles.modalOverlay}>
               <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerVisible(false)} />

               <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
                  <View style={styles.modalHandle} />

                  <Pressable
                     onPress={handleTakePhoto}
                     style={({ pressed }) => [styles.modalOption, pressed && styles.pressed]}
                  >
                     <Camera size={19} color="#4968FF" strokeWidth={2.2} />
                     <Text style={styles.modalOptionText}>Take photo</Text>
                  </Pressable>

                  <Pressable
                     onPress={handleChooseFromLibrary}
                     style={({ pressed }) => [styles.modalOption, pressed && styles.pressed]}
                  >
                     <ImagePlus size={19} color="#4968FF" strokeWidth={2.2} />
                     <Text style={styles.modalOptionText}>Choose from library</Text>
                  </Pressable>

                  {user?.avatar ? (
                     <Pressable
                        onPress={handleRemovePhoto}
                        style={({ pressed }) => [styles.modalOption, pressed && styles.pressed]}
                     >
                        <Trash2 size={19} color="#E5484D" strokeWidth={2.2} />
                        <Text style={[styles.modalOptionText, styles.dangerText]}>Remove photo</Text>
                     </Pressable>
                  ) : null}

                  <Pressable
                     onPress={() => setPickerVisible(false)}
                     style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                  >
                     <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
               </View>
            </View>
         </Modal>
      </KeyboardAvoidingView>
   );
}

// ---- Small presentational row used across the "Profile" and "Sharing" cards ----
function SettingsRow({
   icon,
   iconBackground,
   title,
   subtitle,
   children,
}: {
   icon: ReactNode;
   iconBackground: string;
   title: string;
   subtitle?: string;
   children: ReactNode;
}) {
   return (
      <View style={styles.row}>
         <View style={[styles.rowIcon, { backgroundColor: iconBackground }]}>{icon}</View>

         <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{title}</Text>
            {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
         </View>

         <View style={styles.rowControl}>{children}</View>
      </View>
   );
}

interface Styles {
   container: ViewStyle;
   backgroundOrbOne: ViewStyle;
   backgroundOrbTwo: ViewStyle;
   header: ViewStyle;
   backButton: ViewStyle;
   headerTitle: TextStyle;
   headerSpacer: ViewStyle;
   loadingState: ViewStyle;
   scrollContent: ViewStyle;
   avatarSection: ViewStyle;
   avatarWrap: ViewStyle;
   avatarImage: ImageStyle;
   avatarFallback: ViewStyle;
   avatarFallbackText: TextStyle;
   avatarEditBadge: ViewStyle;
   avatarHint: TextStyle;
   sectionLabel: TextStyle;
   card: ViewStyle;
   row: ViewStyle;
   rowIcon: ViewStyle;
   rowText: ViewStyle;
   rowTitle: TextStyle;
   rowSubtitle: TextStyle;
   rowControl: ViewStyle;
   rowInput: TextStyle;
   passwordRow: ViewStyle;
   passwordInput: TextStyle;
   divider: ViewStyle;
   navRow: ViewStyle;
   navRowTitle: TextStyle;
   dangerText: TextStyle;
   toast: ViewStyle;
   toastText: TextStyle;
   modalOverlay: ViewStyle;
   modalSheet: ViewStyle;
   modalHandle: ViewStyle;
   modalOption: ViewStyle;
   modalOptionText: TextStyle;
   modalCancel: ViewStyle;
   modalCancelText: TextStyle;
   pressed: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
   container: {
      flex: 1,
      backgroundColor: '#FFF',
   },

   backgroundOrbOne: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      top: -150,
      right: -120,
      backgroundColor: 'rgba(91, 112, 255, 0.11)',
   },

   backgroundOrbTwo: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      bottom: -150,
      left: -130,
      backgroundColor: 'rgba(119, 156, 255, 0.09)',
   },

   header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
   },

   backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      shadowColor: '#35437D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 2,
   },

   headerTitle: {
      color: '#131621',
      fontSize: 17,
      fontWeight: '800',
   },

   headerSpacer: {
      width: 38,
   },

   loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
   },

   scrollContent: {
      paddingHorizontal: 22,
      paddingTop: 8,
   },

   avatarSection: {
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 28,
   },

   avatarWrap: {
      width: 96,
      height: 96,
      borderRadius: 48,
   },

   avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 48,
   },

   avatarFallback: {
      width: '100%',
      height: '100%',
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#526EFF',
   },

   avatarFallbackText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '800',
   },

   avatarEditBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#526EFF',
      borderWidth: 3,
      borderColor: '#F6F7FB',
   },

   avatarHint: {
      marginTop: 12,
      color: '#9AA0B1',
      fontSize: 13,
      fontWeight: '600',
   },

   sectionLabel: {
      marginBottom: 10,
      marginLeft: 4,
      color: '#8790A3',
      fontSize: 13,
      fontWeight: '700',
   },

   card: {
      marginBottom: 24,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(29, 39, 76, 0.06)',
      shadowColor: '#283562',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
      overflow: 'hidden',
   },

   row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
   },

   rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
   },

   rowText: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
   },

   rowTitle: {
      color: '#1A1E2B',
      fontSize: 14,
      fontWeight: '700',
   },

   rowSubtitle: {
      marginTop: 2,
      color: '#9AA0B1',
      fontSize: 11.5,
      lineHeight: 15,
   },

   rowControl: {
      maxWidth: 150,
      alignItems: 'flex-end',
   },

   rowInput: {
      minWidth: 90,
      color: '#1A1E2B',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      paddingVertical: 0,
   },

   passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
   },

   passwordInput: {
      marginRight: 8,
   },

   divider: {
      height: 1,
      marginLeft: 62,
      backgroundColor: 'rgba(29, 39, 76, 0.06)',
   },

   navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
   },

   navRowTitle: {
      flex: 1,
      marginLeft: 12,
      color: '#1A1E2B',
      fontSize: 14,
      fontWeight: '700',
   },

   dangerText: {
      color: '#E5484D',
   },

   toast: {
      position: 'absolute',
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 18,
      backgroundColor: 'rgba(26, 30, 43, 0.92)',
   },

   toastText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '700',
   },

   modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(15, 18, 30, 0.4)',
   },

   modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 18,
      paddingTop: 10,
      backgroundColor: '#FFFFFF',
   },

   modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 12,
      backgroundColor: '#E3E5EC',
   },

   modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
   },

   modalOptionText: {
      marginLeft: 14,
      color: '#1A1E2B',
      fontSize: 15,
      fontWeight: '600',
   },

   modalCancel: {
      marginTop: 4,
      paddingVertical: 14,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: 'rgba(29, 39, 76, 0.06)',
   },

   modalCancelText: {
      color: '#9AA0B1',
      fontSize: 15,
      fontWeight: '700',
   },

   pressed: {
      opacity: 0.75,
   },
});