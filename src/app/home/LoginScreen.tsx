// LoginScreen.tsx
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
   ArrowRight,
   Camera,
   Check,
   Eye,
   EyeOff,
   ImagePlus,
   Lock,
   Sparkles,
   User,
   X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
   ActivityIndicator,
   Alert,
   Dimensions,
   Image,
   KeyboardAvoidingView,
   Modal,
   Platform,
   Pressable,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
   Extrapolation,
   FadeIn,
   FadeInDown,
   FadeInUp,
   interpolate,
   runOnJS,
   useAnimatedStyle,
   useSharedValue,
   withSequence,
   withSpring,
   withTiming,
   ZoomIn,
} from 'react-native-reanimated';
import { getSavedUser, saveUser, USER_STORAGE_KEY } from '../../screens/authStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_HORIZONTAL_MARGIN = 20;
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - TRACK_HORIZONTAL_MARGIN * 2, 400);
const HANDLE_SIZE = 52;
const TRACK_INSET = 6;
const MAX_DRAG = TRACK_WIDTH - HANDLE_SIZE - TRACK_INSET * 2;
const UNLOCK_THRESHOLD = 0.72;

export { USER_STORAGE_KEY };

const PRESET_AVATARS = [
   { id: 'pile_1', source: require('../../../assets/images/pile_1.webp') },
   { id: 'pile_2', source: require('../../../assets/images/pile_2.webp') },
   { id: 'pile_3', source: require('../../../assets/images/pile_3.webp') },
   { id: 'pile_4', source: require('../../../assets/images/pile_4.webp') },
   { id: 'pile_5', source: require('../../../assets/images/pile_5.webp') },
   { id: 'pile_6', source: require('../../../assets/images/pile_6.webp') },
   { id: 'pile_7', source: require('../../../assets/images/pile_7.webp') },
];

function resolvePresetUri(source: any): string {
   const resolved = Image.resolveAssetSource(source);
   return resolved ? resolved.uri : '';
}

function getRandomPresetAvatar() {
   const index = Math.floor(Math.random() * PRESET_AVATARS.length);
   return PRESET_AVATARS[index];
}

export function LoginScreen() {
   const router = useRouter();
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [isUnlocked, setIsUnlocked] = useState(false);
   const [saving, setSaving] = useState(false);

   const [avatarUri, setAvatarUri] = useState<string | null>(null);
   const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
   const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
   const [activeField, setActiveField] = useState<'user' | 'pass' | null>(null);

   const dragX = useSharedValue(0);
   const successOpacity = useSharedValue(0);
   const avatarScale = useSharedValue(1);
   const avatarJitterX = useSharedValue(0);
   const avatarRotate = useSharedValue(0);
   const formShakeX = useSharedValue(0);

   // This screen only needs to be filled out once per device. If a saved
   // account already exists (e.g. the user tapped logout and landed back
   // here), pre-fill everything instead of asking them to type it again —
   // logging out never deletes the saved account.
   useEffect(() => {
      (async () => {
         const saved = await getSavedUser();
         if (saved) {
            setUsername(saved.username);
            setPassword(saved.password);
            if (saved.avatar) {
               setAvatarUri(saved.avatar);
            }
         }
      })();
   }, []);

   const resetSlider = () => {
      dragX.value = withSpring(0, { damping: 18, stiffness: 200 });
   };

   const shakeForm = () => {
      formShakeX.value = withSequence(
         withTiming(-8, { duration: 45 }),
         withTiming(8, { duration: 45 }),
         withTiming(-6, { duration: 45 }),
         withTiming(6, { duration: 45 }),
         withTiming(0, { duration: 45 }),
      );
   };

   const openAvatarPicker = () => setAvatarPickerVisible(true);
   const closeAvatarPicker = () => setAvatarPickerVisible(false);

   // Small "jitter" wiggle that plays on the avatar before the picker sheet
   // is presented, so tapping never feels like an instant, jarring push-up.
   const playAvatarTapFeedback = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      avatarRotate.value = withSequence(
         withTiming(-7, { duration: 40 }),
         withTiming(7, { duration: 75 }),
         withTiming(-5, { duration: 65 }),
         withTiming(4, { duration: 65 }),
         withTiming(0, { duration: 55 }),
      );
      avatarJitterX.value = withSequence(
         withTiming(-3, { duration: 40 }),
         withTiming(3, { duration: 75 }),
         withTiming(-2, { duration: 65 }),
         withTiming(2, { duration: 65 }),
         withTiming(0, { duration: 55 }, finished => {
            if (finished) {
               runOnJS(openAvatarPicker)();
            }
         }),
      );
   };

   const pickFromGallery = async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
         Alert.alert('Permission needed', 'Please allow photo library access to choose an avatar.');
         return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
         mediaTypes: ImagePicker.MediaTypeOptions.Images,
         allowsEditing: true,
         aspect: [1, 1],
         quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
         setAvatarUri(result.assets[0].uri);
         setSelectedPresetId(null);
         closeAvatarPicker();
      }
   };

   const pickPreset = (preset: (typeof PRESET_AVATARS)[number]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const uri = resolvePresetUri(preset.source);
      setAvatarUri(uri);
      setSelectedPresetId(preset.id);
      setTimeout(() => closeAvatarPicker(), 220);
   };

   const ensureAvatarSelected = () => {
      if (!avatarUri) {
         const fallback = getRandomPresetAvatar();
         const uri = resolvePresetUri(fallback.source);
         setAvatarUri(uri);
         setSelectedPresetId(fallback.id);
         return uri;
      }
      return avatarUri;
   };

   const persistCredentials = async () => {
  try {
    setSaving(true);

    const finalAvatar = ensureAvatarSelected();

    // Save user credentials and avatar
    await saveUser({
      username,
      password,
      avatar: finalAvatar,
    });

    setIsUnlocked(true);

    // Success haptic
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    // Success animation
    successOpacity.value = withTiming(1, {
      duration: 250,
    });

    setTimeout(() => {

      router.replace('/shares');
    }, 550);

  } catch (err) {
    console.error('❌ Failed to save credentials:', err);

    Alert.alert(
      'Error',
      'Could not save your details. Please try again.'
    );

    resetSlider();

  } finally {
    setSaving(false);
  }
};
   const handleUnlock = () => {
      if (!username.trim() || !password.trim()) {
         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
         shakeForm();
         resetSlider();
         return;
      }
      persistCredentials();
   };

   const panGesture = Gesture.Pan()
      .enabled(!isUnlocked && !saving)
      .onUpdate(event => {
         dragX.value = Math.max(0, Math.min(event.translationX, MAX_DRAG));
      })
      .onEnd(() => {
         if (dragX.value / MAX_DRAG > UNLOCK_THRESHOLD) {
            dragX.value = withSpring(MAX_DRAG, { damping: 20, stiffness: 220 });
            runOnJS(handleUnlock)();
         } else {
            resetSlider();
         }
      });

   const handleAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: dragX.value }],
   }));

   const fillAnimatedStyle = useAnimatedStyle(() => ({
      width: dragX.value + HANDLE_SIZE,
   }));

   const labelAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(dragX.value, [0, MAX_DRAG * 0.45], [1, 0], Extrapolation.CLAMP),
      transform: [
         {
            translateX: interpolate(dragX.value, [0, MAX_DRAG * 0.5], [0, 15], Extrapolation.CLAMP),
         },
      ],
   }));

   const successFillStyle = useAnimatedStyle(() => ({
      opacity: successOpacity.value,
   }));

   const avatarAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
         { scale: avatarScale.value },
         { translateX: avatarJitterX.value },
         { rotate: `${avatarRotate.value}deg` },
      ],
   }));

   const formShakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: formShakeX.value }],
   }));

   return (
      <GestureHandlerRootView style={styles.flexFill}>
         {/* Full-bleed background: sits outside the SafeAreaView so the
             gradient + glows run edge-to-edge, behind the status bar and
             home indicator, instead of stopping at the safe-area inset. */}
         <View style={styles.rootBackground}>
            <LinearGradient
               colors={['#eef2ff', '#f8fafc', '#f5f3ff']}
               style={StyleSheet.absoluteFill}
            />
            <View style={styles.glowTopRight}>
               <LinearGradient
                  colors={['rgba(99, 102, 241, 0.32)', 'rgba(238, 242, 255, 0)']}
                  style={styles.glowFill}
               />
            </View>
            <View style={styles.glowBottomLeft}>
               <LinearGradient
                  colors={['rgba(168, 85, 247, 0.26)', 'rgba(243, 232, 255, 0)']}
                  style={styles.glowFill}
               />
            </View>

            <SafeAreaView style={styles.flexFill} edges={['top', 'bottom']}>
               <KeyboardAvoidingView
                  style={styles.flexFill}
                  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
               >
                  <ScrollView
                     contentContainerStyle={styles.scrollContent}
                     keyboardShouldPersistTaps="handled"
                     showsVerticalScrollIndicator={false}
                     bounces={false}
                  >
                     <View style={styles.screen}>
                        {/* Header */}
                        <Animated.View entering={FadeInDown.duration(450)}>
                           <View style={styles.tagWrap}>
                              <Sparkles size={13} color="#6366f1" strokeWidth={2.5} />
                              <Text style={styles.eyebrow}>AUTHENTICATION</Text>
                           </View>
                           <Text style={styles.headline}>Welcome back</Text>
                           <Text style={styles.subheadline}>
                              Select a custom avatar, enter your credentials, and swipe to access your account.
                           </Text>
                        </Animated.View>

                        {/* Avatar Button */}
                        <Animated.View
                           style={styles.avatarSection}
                           entering={FadeInDown.delay(100).duration(450)}
                        >
                           <Pressable
                              onPress={playAvatarTapFeedback}
                              onPressIn={() => (avatarScale.value = withSpring(0.93, { damping: 15 }))}
                              onPressOut={() => (avatarScale.value = withSpring(1, { damping: 12 }))}
                              style={styles.avatarCircleWrap}
                              accessibilityRole="button"
                              accessibilityLabel="Choose avatar"
                           >
                              <Animated.View style={[styles.avatarBorderGlow, avatarAnimatedStyle]}>
                                 {avatarUri ? (
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                                 ) : (
                                    <View style={styles.avatarPlaceholder}>
                                       <ImagePlus size={32} color="#6366f1" strokeWidth={2.2} />
                                    </View>
                                 )}
                              </Animated.View>
                              <View style={styles.avatarEditBadge}>
                                 <Camera size={13} color="#ffffff" strokeWidth={2.5} />
                              </View>
                           </Pressable>
                           <Text style={styles.avatarHint}>
                              {avatarUri ? 'Change chosen avatar' : 'Tap to select avatar'}
                           </Text>
                        </Animated.View>

                        {/* Inputs Card */}
                        <Animated.View
                           style={[styles.formCard, formShakeStyle]}
                           entering={FadeInDown.delay(180).duration(450)}
                        >
                           <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>USERNAME</Text>
                              <View
                                 style={[
                                    styles.inputContainer,
                                    activeField === 'user' && styles.inputContainerFocused,
                                 ]}
                              >
                                 <User size={18} color={activeField === 'user' ? '#6366f1' : '#94a3b8'} />
                                 <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Riya..."
                                    placeholderTextColor="#94a3b8"
                                    autoCapitalize="none"
                                    value={username}
                                    onChangeText={setUsername}
                                    onFocus={() => setActiveField('user')}
                                    onBlur={() => setActiveField(null)}
                                    editable={!isUnlocked && !saving}
                                    returnKeyType="next"
                                 />
                              </View>
                           </View>

                           <View style={[styles.inputGroup, { marginTop: 18 }]}>
                              <Text style={styles.inputLabel}>PASSWORD</Text>
                              <View
                                 style={[
                                    styles.inputContainer,
                                    activeField === 'pass' && styles.inputContainerFocused,
                                 ]}
                              >
                                 <Lock size={18} color={activeField === 'pass' ? '#6366f1' : '#94a3b8'} />
                                 <TextInput
                                    style={styles.input}
                                    placeholder="••••••••••••"
                                    placeholderTextColor="#94a3b8"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    onFocus={() => setActiveField('pass')}
                                    onBlur={() => setActiveField(null)}
                                    editable={!isUnlocked && !saving}
                                    returnKeyType="done"
                                 />
                                 <Pressable
                                    onPress={() => setShowPassword(prev => !prev)}
                                    hitSlop={10}
                                    accessibilityRole="button"
                                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                                 >
                                    {showPassword ? (
                                       <EyeOff size={18} color="#94a3b8" />
                                    ) : (
                                       <Eye size={18} color="#94a3b8" />
                                    )}
                                 </Pressable>
                              </View>
                           </View>
                        </Animated.View>

                        <View style={styles.spacer} />

                        {/* Slide to Login Track */}
                        <Animated.View
                           style={[styles.swipeTrack, isUnlocked && styles.swipeTrackUnlocked]}
                           entering={FadeInDown.delay(240).duration(450)}
                        >
                           <Animated.View style={[styles.swipeSuccessFill, successFillStyle]} />
                           <Animated.View style={[styles.swipeFill, fillAnimatedStyle]} />

                           <Animated.View
                              style={[styles.swipeLabelWrap, labelAnimatedStyle]}
                              pointerEvents="none"
                           >
                              <Text style={styles.swipeLabel}>
                                 {saving ? 'Signing in...' : 'Slide to sign in'}
                              </Text>
                           </Animated.View>

                           {isUnlocked && (
                              <Animated.View
                                 entering={FadeIn.duration(200)}
                                 style={styles.swipeSentLabelWrap}
                                 pointerEvents="none"
                              >
                                 <Text style={styles.swipeSentLabel}>Authenticated</Text>
                              </Animated.View>
                           )}

                           <GestureDetector gesture={panGesture}>
                              <Animated.View style={[styles.swipeHandle, handleAnimatedStyle]}>
                                 {saving ? (
                                    <ActivityIndicator size="small" color="#0f172a" />
                                 ) : isUnlocked ? (
                                    <Check size={22} color="#0f172a" strokeWidth={3} />
                                 ) : (
                                    <ArrowRight size={20} color="#0f172a" strokeWidth={2.8} />
                                 )}
                              </Animated.View>
                           </GestureDetector>
                        </Animated.View>
                     </View>
                  </ScrollView>
               </KeyboardAvoidingView>
            </SafeAreaView>
         </View>

         {/* Avatar Selection Modal */}
         <Modal
            visible={avatarPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={closeAvatarPicker}
         >
            <Pressable style={styles.modalBackdrop} onPress={closeAvatarPicker}>
               <Animated.View
                  entering={FadeInUp.springify().damping(16)}
                  style={styles.modalCard}
               >
                  <Pressable onPress={() => {}}>
                     <View style={styles.modalHandleIndicator} />

                     <View style={styles.modalHeader}>
                        <View>
                           <Text style={styles.modalTitle}>Choose Avatar</Text>
                           <Text style={styles.modalSubtitle}>Pick an illustration or upload your own</Text>
                        </View>
                        <Pressable onPress={closeAvatarPicker} style={styles.modalXButton} hitSlop={10}>
                           <X size={16} color="#64748b" strokeWidth={2.5} />
                        </Pressable>
                     </View>

                     <Pressable style={styles.galleryButton} onPress={pickFromGallery}>
                        <LinearGradient
                           colors={['#6366f1', '#4f46e5']}
                           start={{ x: 0, y: 0 }}
                           end={{ x: 1, y: 1 }}
                           style={styles.galleryButtonGradient}
                        >
                           <Camera size={18} color="#ffffff" strokeWidth={2.4} />
                           <Text style={styles.galleryButtonText}>Upload from photo library</Text>
                        </LinearGradient>
                     </Pressable>

                     <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or pick a preset</Text>
                        <View style={styles.dividerLine} />
                     </View>

                     <View style={styles.presetGrid}>
                        {PRESET_AVATARS.map((preset, index) => {
                           const isSelected = selectedPresetId === preset.id;
                           return (
                              <Animated.View
                                 key={preset.id}
                                 entering={FadeInDown.delay(index * 35).springify()}
                              >
                                 <Pressable
                                    style={[
                                       styles.presetItem,
                                       isSelected && styles.presetItemSelected,
                                    ]}
                                    onPress={() => pickPreset(preset)}
                                 >
                                    <Image source={preset.source} style={styles.presetImage} />

                                    {isSelected && (
                                       <Animated.View
                                          entering={ZoomIn.duration(180)}
                                          style={styles.presetOverlay}
                                       >
                                          <View style={styles.checkCircle}>
                                             <Check size={16} color="#ffffff" strokeWidth={3} />
                                          </View>
                                       </Animated.View>
                                    )}
                                 </Pressable>
                              </Animated.View>
                           );
                        })}
                     </View>
                  </Pressable>
               </Animated.View>
            </Pressable>
         </Modal>
      </GestureHandlerRootView>
   );
}

const styles = StyleSheet.create({
   flexFill: { flex: 1 },
   // The true full-screen surface: no SafeAreaView wraps this, so its
   // background (and the two ambient glows) paint underneath the status
   // bar and the home-indicator area instead of leaving plain bars there.
   rootBackground: {
      flex: 1,
      backgroundColor: '#f8fafc',
   },
   scrollContent: { flexGrow: 1 },
   screen: {
      flex: 1,
      paddingHorizontal: TRACK_HORIZONTAL_MARGIN,
      paddingTop: 20,
      paddingBottom: 28,
      minHeight: '100%',
   },
   glowTopRight: {
      position: 'absolute',
      top: -80,
      right: -80,
      width: 320,
      height: 320,
      borderRadius: 160,
      overflow: 'hidden',
   },
   glowBottomLeft: {
      position: 'absolute',
      bottom: -40,
      left: -100,
      width: 340,
      height: 340,
      borderRadius: 170,
      overflow: 'hidden',
   },
   glowFill: { width: '100%', height: '100%' },
   tagWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
   },
   eyebrow: {
      fontSize: 11,
      fontWeight: '800',
      color: '#6366f1',
      letterSpacing: 1.2,
   },
   headline: {
      fontSize: 34,
      fontWeight: '900',
      color: '#0f172a',
      letterSpacing: -0.8,
   },
   subheadline: {
      fontSize: 14,
      color: '#64748b',
      marginTop: 8,
      lineHeight: 22,
      maxWidth: 320,
   },
   avatarSection: {
      alignItems: 'center',
      marginTop: 28,
   },
   avatarCircleWrap: {
      width: 100,
      height: 100,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
   },
   avatarBorderGlow: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#eef2ff',
      padding: 4,
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6,
   },
   avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 48,
   },
   avatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 48,
      backgroundColor: '#e0e7ff',
      alignItems: 'center',
      justifyContent: 'center',
   },
   avatarEditBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#6366f1',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2.5,
      borderColor: '#f8fafc',
      elevation: 4,
   },
   avatarHint: {
      fontSize: 13,
      color: '#6366f1',
      marginTop: 10,
      fontWeight: '700',
   },
   formCard: {
      backgroundColor: '#ffffff',
      borderRadius: 24,
      padding: 20,
      marginTop: 26,
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 20,
      elevation: 3,
      borderWidth: 1,
      borderColor: '#f1f5f9',
   },
   inputGroup: {
      width: '100%',
   },
   inputLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#475569',
      letterSpacing: 0.8,
      marginBottom: 8,
   },
   inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      borderWidth: 1.5,
      borderColor: '#e2e8f0',
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 52,
      gap: 12,
   },
   inputContainerFocused: {
      borderColor: '#6366f1',
      backgroundColor: '#ffffff',
   },
   input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: '#0f172a',
   },
   spacer: { minHeight: 20, flexGrow: 1 },
   swipeTrack: {
      height: 66,
      borderRadius: 33,
      backgroundColor: '#0f172a',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 4,
   },
   swipeTrackUnlocked: { backgroundColor: '#0f172a' },
   swipeSuccessFill: {
      ...StyleSheet.absoluteFill,
      backgroundColor: '#10b981',
   },
   swipeFill: {
      position: 'absolute',
      left: TRACK_INSET,
      top: TRACK_INSET,
      bottom: TRACK_INSET,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 28,
   },
   swipeLabelWrap: {
      position: 'absolute',
      left: HANDLE_SIZE + 20,
      right: 20,
      alignItems: 'center',
   },
   swipeLabel: {
      fontSize: 15,
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.75)',
      letterSpacing: 0.3,
   },
   swipeSentLabelWrap: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
   },
   swipeSentLabel: {
      fontSize: 16,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 0.5,
   },
   swipeHandle: {
      position: 'absolute',
      left: TRACK_INSET,
      top: TRACK_INSET,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 5,
   },

   // Bottom Sheet / Modal Styles
   modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'flex-end',
   },
   modalCard: {
      backgroundColor: '#ffffff',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 40,
   },
   modalHandleIndicator: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#cbd5e1',
      alignSelf: 'center',
      marginBottom: 16,
   },
   modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 20,
   },
   modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#0f172a',
   },
   modalSubtitle: {
      fontSize: 13,
      color: '#64748b',
      marginTop: 2,
      fontWeight: '500',
   },
   modalXButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#f1f5f9',
      alignItems: 'center',
      justifyContent: 'center',
   },
   galleryButton: {
      borderRadius: 16,
      overflow: 'hidden',
   },
   galleryButtonGradient: {
      flexDirection: 'row',
      gap: 10,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
   },
   galleryButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '700',
   },
   dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
      gap: 12,
   },
   dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#e2e8f0',
   },
   dividerText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
   },
   presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      justifyContent: 'center',
   },
   presetItem: {
      width: 68,
      height: 68,
      borderRadius: 34,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: '#f1f5f9',
      position: 'relative',
      backgroundColor: '#f8fafc',
   },
   presetItemSelected: {
      borderColor: '#6366f1',
      borderWidth: 2.5,
      transform: [{ scale: 1.05 }],
   },
   presetImage: {
      width: '100%',
      height: '100%',
   },
   presetOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(99, 102, 241, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
   },
   checkCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#6366f1',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#ffffff',
   },
});

export default LoginScreen;