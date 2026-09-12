import { getSavedUser, SavedUser } from '@/screens/authStorage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { CheckCircle2, File, Plus, Send, ShieldCheck, Sparkles, Wifi } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
   Animated,
   Easing,
   Image,
   ImageStyle,
   Pressable,
   StyleSheet,
   Text,
   TextStyle,
   useWindowDimensions,
   View,
   ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SatelliteConfig = {
   id: string;
   Icon: typeof File;
   color: string;
   background: string;
   orbitRadius: number; // distance from center in px
   size: number;
   duration: number; // orbital period in ms
   initialRotationDeg: number; // starting position along circumference
};

export default function ShareScreen() {
   const { width, height } = useWindowDimensions();
   const insets = useSafeAreaInsets();
   const [user, setUser] = useState<SavedUser | null>(null);
   const [avatarFailed, setAvatarFailed] = useState(false);

   const orbSize = Math.min(width - 56, 320);
   const isCompact = height < 750;

   // ---------------------------------------------------------------------------
   // SATELLITE SETUP
   // Pure circular orbital radii calculated from orb center
   // ---------------------------------------------------------------------------
   const satellites: SatelliteConfig[] = [
      {
         id: 'file',
         Icon: File,
         color: '#3B82F6',
         background: '#EFF6FF',
         orbitRadius: orbSize * 0.38,
         size: 46,
         duration: 12000,
         initialRotationDeg: 0,
      },
      {
         id: 'wifi',
         Icon: Wifi,
         color: '#10B981',
         background: '#ECFDF5',
         orbitRadius: orbSize * 0.44,
         size: 40,
         duration: 9500,
         initialRotationDeg: 120,
      },
      {
         id: 'shield',
         Icon: ShieldCheck,
         color: '#8B5CF6',
         background: '#F5F3FF',
         orbitRadius: orbSize * 0.38,
         size: 42,
         duration: 15000,
         initialRotationDeg: 240,
      },
   ];

   // ---------------------------------------------------------------------------
   // ANIMATION DRIVERS
   // ---------------------------------------------------------------------------
   // Continuous single-revolution drivers: 0 to 1 linearly without start offsets
   const orbitDrivers = useRef(satellites.map(() => new Animated.Value(0))).current;

   // Central breathing & wave drivers
   const breathe = useRef(new Animated.Value(0)).current;
   const radarWave1 = useRef(new Animated.Value(0)).current;
   const radarWave2 = useRef(new Animated.Value(0)).current;
   const dotPulse = useRef(new Animated.Value(0)).current;
   const contentIn = useRef(new Animated.Value(0)).current;

   useEffect(() => {
      let active = true;
      (async () => {
         const saved = await getSavedUser();
         if (active) {
            setUser(saved);
            setAvatarFailed(false);
         }
      })();
      return () => {
         active = false;
      };
   }, []);

   useEffect(() => {
      // Content slide-up on enter
      Animated.spring(contentIn, {
         toValue: 1,
         damping: 20,
         stiffness: 140,
         useNativeDriver: true,
      }).start();

      // Continuous, infinite, perfectly linear orbit loops
      const activeOrbits = orbitDrivers.map((driver, index) =>
         Animated.loop(
            Animated.timing(driver, {
               toValue: 1,
               duration: satellites[index].duration,
               easing: Easing.linear,
               useNativeDriver: true,
               isInteraction: false,
            })
         )
      );

      // Core pulsating motion
      const breatheLoop = Animated.loop(
         Animated.sequence([
            Animated.timing(breathe, {
               toValue: 1,
               duration: 2200,
               easing: Easing.inOut(Easing.sin),
               useNativeDriver: true,
            }),
            Animated.timing(breathe, {
               toValue: 0,
               duration: 2200,
               easing: Easing.inOut(Easing.sin),
               useNativeDriver: true,
            }),
         ])
      );

      // Staggered dual radar rings for authentic searching flow
      const makeRadarWave = (val: Animated.Value) =>
         Animated.loop(
            Animated.timing(val, {
               toValue: 1,
               duration: 3200,
               easing: Easing.out(Easing.cubic),
               useNativeDriver: true,
               isInteraction: false,
            })
         );

      const radar1 = makeRadarWave(radarWave1);
      const radar2Timeout = setTimeout(() => {
         makeRadarWave(radarWave2).start();
      }, 1600);

      // Status indicator dot
      const dotLoop = Animated.loop(
         Animated.sequence([
            Animated.timing(dotPulse, {
               toValue: 1,
               duration: 900,
               easing: Easing.inOut(Easing.ease),
               useNativeDriver: true,
            }),
            Animated.timing(dotPulse, {
               toValue: 0,
               duration: 900,
               easing: Easing.inOut(Easing.ease),
               useNativeDriver: true,
            }),
         ])
      );

      activeOrbits.forEach((anim) => anim.start());
      breatheLoop.start();
      radar1.start();
      dotLoop.start();

      return () => {
         clearTimeout(radar2Timeout);
         activeOrbits.forEach((anim) => anim.stop());
         breatheLoop.stop();
         radar1.stop();
         radarWave2.stopAnimation();
         dotLoop.stop();
      };
   }, [breathe, contentIn, dotPulse, orbitDrivers, radarWave1, radarWave2]);

   const centerScale = breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.06],
   });

   const centerGlow = breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.42],
   });

   const contentTranslateY = contentIn.interpolate({
      inputRange: [0, 1],
      outputRange: [24, 0],
   });

   return (
      <View style={styles.container}>
         <View style={styles.ambientOrbBlue} />
         <View style={styles.ambientOrbPurple} />

         {/* Header */}
         <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View>
               <View style={styles.brandRow}>
                  <Text style={styles.brand}>FileDrop</Text>
                  <View style={styles.statusChip}>
                     <Text style={styles.statusChipText}>P2P</Text>
                  </View>
               </View>
               <Text style={styles.brandCaption}>Ultra-fast local peer link</Text>
            </View>

            <Pressable
               onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/profile');
               }}
               style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
               accessibilityRole="button"
               accessibilityLabel="Open profile"
            >
               {user?.avatar && !avatarFailed ? (
                  <Image
                     source={{ uri: user.avatar }}
                     style={styles.avatarImage}
                     onError={() => setAvatarFailed(true)}
                  />
               ) : (
                  <View style={styles.avatarFallback}>
                     <Text style={styles.avatarFallbackText}>
                        {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                     </Text>
                  </View>
               )}
            </Pressable>
         </View>

         {/* Main Content */}
         <Animated.View
            style={[
               styles.content,
               {
                  opacity: contentIn,
                  transform: [{ translateY: contentTranslateY }],
               },
            ]}
         >
            {/* Heading */}
            <View style={styles.headingBlock}>
               <View style={styles.liveBadge}>
                  <Animated.View style={[styles.liveDot, { opacity: dotPulse }]} />
                  <Text style={styles.liveBadgeText}>Searching wireless space</Text>
               </View>

               <Text style={styles.heading}>Share effortlessly.</Text>
               <Text style={styles.subtitle}>
                  Hold devices nearby to initiate direct stream transfer with zero loss.
               </Text>
            </View>

            {/* Orbital Stage */}
            <View style={[styles.orbStage, { width: orbSize, height: orbSize, marginVertical: isCompact ? 10 : 22 }]}>
               {/* Dual Continuous Radar Waves */}
               {[radarWave1, radarWave2].map((wave, i) => {
                  const scale = wave.interpolate({
                     inputRange: [0, 1],
                     outputRange: [0.35, 1.12],
                  });
                  const opacity = wave.interpolate({
                     inputRange: [0, 0.45, 1],
                     outputRange: [0.55, 0.25, 0],
                  });
                  return (
                     <Animated.View
                        key={`wave-${i}`}
                        pointerEvents="none"
                        style={[
                           styles.radarRing,
                           {
                              width: orbSize,
                              height: orbSize,
                              borderRadius: orbSize / 2,
                              opacity,
                              transform: [{ scale }],
                           },
                        ]}
                     />
                  );
               })}

               {/* Static Concentric Guide Tracks */}
               <View
                  style={[
                     styles.guideRing,
                     {
                        width: orbSize * 0.88,
                        height: orbSize * 0.88,
                        borderRadius: orbSize,
                     },
                  ]}
               />
               <View
                  style={[
                     styles.guideRing,
                     {
                        width: orbSize * 0.76,
                        height: orbSize * 0.76,
                        borderRadius: orbSize,
                     },
                  ]}
               />

               {/* Continuous Orbit Satellites */}
               {satellites.map((sat, index) => {
                  // Full 360 rotation without phase displacement string artifacts
                  const rotationAngle = orbitDrivers[index].interpolate({
                     inputRange: [0, 1],
                     outputRange: ['0deg', '360deg'],
                  });

                  const counterRotationAngle = orbitDrivers[index].interpolate({
                     inputRange: [0, 1],
                     outputRange: ['0deg', '-360deg'],
                  });

                  return (
                     <Animated.View
                        key={sat.id}
                        pointerEvents="none"
                        style={[
                           styles.satelliteAnchor,
                           {
                              width: orbSize,
                              height: orbSize,
                              transform: [
                                 { rotate: `${sat.initialRotationDeg}deg` }, // Static radial slot
                                 { rotate: rotationAngle },                  // Continuous motion
                              ],
                           },
                        ]}
                     >
                        {/* Positioned on exact circular radius via translateY */}
                        <Animated.View
                           style={[
                              styles.satelliteNode,
                              {
                                 width: sat.size,
                                 height: sat.size,
                                 transform: [
                                    { translateY: -sat.orbitRadius },
                                    { rotate: counterRotationAngle }, // Keeps icon upright at all times
                                    { rotate: `${-sat.initialRotationDeg}deg` },
                                 ],
                              },
                           ]}
                        >
                           <View
                              style={[
                                 styles.satelliteBubble,
                                 {
                                    width: sat.size,
                                    height: sat.size,
                                    borderRadius: sat.size / 2,
                                    backgroundColor: sat.background,
                                 },
                              ]}
                           >
                              <sat.Icon size={sat.size * 0.44} color={sat.color} strokeWidth={2.3} />
                           </View>
                        </Animated.View>
                     </Animated.View>
                  );
               })}

               {/* Center Core Glow */}
               <Animated.View
                  pointerEvents="none"
                  style={[
                     styles.centerGlow,
                     {
                        width: orbSize * 0.46,
                        height: orbSize * 0.46,
                        borderRadius: orbSize,
                        opacity: centerGlow,
                        transform: [{ scale: centerScale }],
                     },
                  ]}
               />

               {/* Central Send Hub */}
               <Animated.View
                  style={[
                     styles.centerHub,
                     {
                        width: orbSize * 0.34,
                        height: orbSize * 0.34,
                        borderRadius: orbSize,
                        transform: [{ scale: centerScale }],
                     },
                  ]}
               >
                  <View
                     style={[
                        styles.centerIconCircle,
                        {
                           width: orbSize * 0.22,
                           height: orbSize * 0.22,
                           borderRadius: orbSize,
                        },
                     ]}
                  >
                     <Send size={orbSize * 0.088} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
               </Animated.View>
            </View>

            {/* Radar Scan Status */}
            <View style={styles.radarStatus}>
               <Animated.View style={[styles.statusDot, { opacity: dotPulse }]} />
               <Text style={styles.radarStatusText}>Scanning for receivers nearby</Text>
            </View>

            {/* File Pick Card */}
            <Pressable
               onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
               style={({ pressed }) => [styles.fileCard, pressed && styles.fileCardPressed]}
               accessibilityRole="button"
               accessibilityLabel="Select files to send"
            >
               <View style={styles.fileIconWrapper}>
                  <File size={22} color="#3B82F6" strokeWidth={2.2} />
                  <View style={styles.fileBadgeDot}>
                     <Sparkles size={8} color="#FFFFFF" />
                  </View>
               </View>

               <View style={styles.fileInfo}>
                  <View style={styles.fileHeaderRow}>
                     <Text style={styles.fileTitle}>Select payload</Text>
                     <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>READY</Text>
                     </View>
                  </View>
                  <Text style={styles.fileSubtitle}>Original raw files, photos, 4K video</Text>
               </View>

               <View style={styles.actionBtn}>
                  <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
               </View>
            </Pressable>
         </Animated.View>

         {/* Bottom Status */}
         <View style={[styles.bottom, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.pillContainer}>
               <View style={styles.metaBadge}>
                  <ShieldCheck size={13} color="#059669" strokeWidth={2.2} />
                  <Text style={styles.metaBadgeText}>AES-256 GCM</Text>
               </View>
               <View style={styles.metaDivider} />
               <View style={styles.metaBadge}>
                  <CheckCircle2 size={13} color="#3B82F6" strokeWidth={2.2} />
                  <Text style={styles.metaBadgeText}>Offline Direct</Text>
               </View>
            </View>
         </View>
      </View>
   );
}

interface Styles {
   container: ViewStyle;
   ambientOrbBlue: ViewStyle;
   ambientOrbPurple: ViewStyle;
   header: ViewStyle;
   brandRow: ViewStyle;
   brand: TextStyle;
   statusChip: ViewStyle;
   statusChipText: TextStyle;
   brandCaption: TextStyle;
   avatarButton: ViewStyle;
   avatarImage: ImageStyle;
   avatarFallback: ViewStyle;
   avatarFallbackText: TextStyle;
   content: ViewStyle;
   headingBlock: ViewStyle;
   liveBadge: ViewStyle;
   liveDot: ViewStyle;
   liveBadgeText: TextStyle;
   heading: TextStyle;
   subtitle: TextStyle;
   orbStage: ViewStyle;
   radarRing: ViewStyle;
   guideRing: ViewStyle;
   satelliteAnchor: ViewStyle;
   satelliteNode: ViewStyle;
   satelliteBubble: ViewStyle;
   centerGlow: ViewStyle;
   centerHub: ViewStyle;
   centerIconCircle: ViewStyle;
   radarStatus: ViewStyle;
   statusDot: ViewStyle;
   radarStatusText: TextStyle;
   fileCard: ViewStyle;
   fileCardPressed: ViewStyle;
   fileIconWrapper: ViewStyle;
   fileBadgeDot: ViewStyle;
   fileInfo: ViewStyle;
   fileHeaderRow: ViewStyle;
   fileTitle: TextStyle;
   badgePill: ViewStyle;
   badgePillText: TextStyle;
   fileSubtitle: TextStyle;
   actionBtn: ViewStyle;
   bottom: ViewStyle;
   pillContainer: ViewStyle;
   metaBadge: ViewStyle;
   metaBadgeText: TextStyle;
   metaDivider: ViewStyle;
   pressed: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
   container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
      overflow: 'hidden',
   },
   ambientOrbBlue: {
      position: 'absolute',
      width: 380,
      height: 380,
      borderRadius: 190,
      top: -160,
      right: -130,
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
   },
   ambientOrbPurple: {
      position: 'absolute',
      width: 320,
      height: 320,
      borderRadius: 160,
      bottom: -120,
      left: -120,
      backgroundColor: 'rgba(139, 92, 246, 0.07)',
   },
   header: {
      paddingHorizontal: 22,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
   },
   brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
   },
   brand: {
      color: '#0F172A',
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.6,
   },
   statusChip: {
      backgroundColor: '#EFF6FF',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#DBEAFE',
   },
   statusChipText: {
      color: '#3B82F6',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.5,
   },
   brandCaption: {
      marginTop: 2,
      color: '#94A3B8',
      fontSize: 12,
      fontWeight: '500',
   },
   avatarButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      padding: 2,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#F1F5F9',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
   },
   avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 19,
   },
   avatarFallback: {
      flex: 1,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3B82F6',
   },
   avatarFallbackText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
   },
   content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
   },
   headingBlock: {
      alignItems: 'center',
      marginTop: 6,
   },
   liveBadge: {
      height: 28,
      paddingHorizontal: 12,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#EFF6FF',
      borderWidth: 1,
      borderColor: '#DBEAFE',
   },
   liveDot: {
      width: 7,
      height: 7,
      marginRight: 7,
      borderRadius: 4,
      backgroundColor: '#3B82F6',
   },
   liveBadgeText: {
      color: '#3B82F6',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: -0.2,
   },
   heading: {
      marginTop: 12,
      color: '#0F172A',
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -1,
      textAlign: 'center',
   },
   subtitle: {
      maxWidth: 290,
      marginTop: 7,
      color: '#64748B',
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
   },
   orbStage: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
   },
   radarRing: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: '#3B82F6',
   },
   guideRing: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: 'rgba(59, 130, 246, 0.12)',
      borderStyle: 'dashed',
   },
   satelliteAnchor: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
   },
   satelliteNode: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
   },
   satelliteBubble: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 5,
   },
   centerGlow: {
      position: 'absolute',
      backgroundColor: '#3B82F6',
   },
   centerHub: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.9)',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.24,
      shadowRadius: 20,
      elevation: 7,
   },
   centerIconCircle: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3B82F6',
   },
   radarStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
   },
   statusDot: {
      width: 7,
      height: 7,
      marginRight: 8,
      borderRadius: 4,
      backgroundColor: '#3B82F6',
   },
   radarStatusText: {
      color: '#64748B',
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: -0.2,
   },
   fileCard: {
      width: '100%',
      marginTop: 20,
      marginBottom: 6,
      padding: 14,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F1F5F9',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
   },
   fileCardPressed: {
      transform: [{ scale: 0.985 }],
      backgroundColor: '#F8FAFC',
   },
   fileIconWrapper: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#EFF6FF',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
   },
   fileBadgeDot: {
      position: 'absolute',
      top: -3,
      right: -3,
      backgroundColor: '#3B82F6',
      borderRadius: 8,
      width: 15,
      height: 15,
      alignItems: 'center',
      justifyContent: 'center',
   },
   fileInfo: {
      flex: 1,
      marginLeft: 13,
   },
   fileHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
   },
   fileTitle: {
      color: '#0F172A',
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: -0.3,
   },
   badgePill: {
      backgroundColor: '#F1F5F9',
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
   },
   badgePillText: {
      color: '#64748B',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
   },
   fileSubtitle: {
      marginTop: 3,
      color: '#94A3B8',
      fontSize: 12,
   },
   actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#3B82F6',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 2,
   },
   bottom: {
      alignItems: 'center',
      paddingHorizontal: 22,
   },
   pillContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#F1F5F9',
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
   },
   metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
   },
   metaBadgeText: {
      color: '#475569',
      fontSize: 11,
      fontWeight: '600',
   },
   metaDivider: {
      width: 1,
      height: 11,
      backgroundColor: '#E2E8F0',
      marginHorizontal: 12,
   },
   pressed: {
      opacity: 0.8,
   },
});