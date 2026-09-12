// LandingScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Send } from 'lucide-react-native';
import './style.css';
import definition from './avatar.avatar.json';
import AvatarWebView from './Avatarwebview';

type AnimationState =
  | 'sleeping'
  | 'waking'
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'working'
  | 'excited'
  | 'bored'
  | 'suspicious'
  | 'angry'
  | 'drowsy'
  | 'happy'
  | 'curious'
  | 'confused'
  | 'celebrate';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TRACK_HORIZONTAL_MARGIN = 20;
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - TRACK_HORIZONTAL_MARGIN * 2, 400);
const HANDLE_SIZE = 48;
const TRACK_INSET = 8;
const MAX_DRAG = TRACK_WIDTH - HANDLE_SIZE - TRACK_INSET * 2;
const UNLOCK_THRESHOLD = 0.7;

interface LandingScreenProps {
  devicesNearby?: number;
  onPickFile?: () => void;
  onSwipeUnlock?: () => void;
}

export function LandingScreen({
  devicesNearby = 2,
  onPickFile,
  onSwipeUnlock,
}: LandingScreenProps) {
  const router = useRouter();
  const [animationState, setAnimationState] = React.useState<AnimationState>('idle');
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const successOpacity = useSharedValue(0);

  const dragX = useSharedValue(0);
  const floatY = useSharedValue(0);
  const blobOneScale = useSharedValue(1);
  const blobTwoScale = useSharedValue(1);
  const blobOneShift = useSharedValue(0);
  const blobTwoShift = useSharedValue(0);
  const nearbyDotScale = useSharedValue(1);
  const sparkleRotate = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1400 }),
        withTiming(0, { duration: 1400 }),
      ),
      -1,
      true,
    );

    blobOneScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    blobOneShift.value = withRepeat(
      withSequence(
        withTiming(14, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    blobTwoScale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.15, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    blobTwoShift.value = withRepeat(
      withSequence(
        withTiming(-16, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    nearbyDotScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      true,
    );

    sparkleRotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [
    floatY,
    blobOneScale,
    blobOneShift,
    blobTwoScale,
    blobTwoShift,
    nearbyDotScale,
    sparkleRotate,
  ]);

  // This screen is the first-install welcome/onboarding screen — it's only
  // ever shown once. Swiping right no longer leads into sign-in; it moves
  // straight to the share flow (currently a placeholder route — no content
  // built inside it yet, just the navigation).
  const goToShare = () => {
    router.push('/shares');
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
    setAnimationState('celebrate');
    successOpacity.value = withTiming(1, { duration: 200 });
    onSwipeUnlock?.();
    // Small delay so the "Sent!" state is visible before navigating
    setTimeout(() => {
      goToShare();
    }, 450);
  };

  const panGesture = Gesture.Pan()
    .enabled(!isUnlocked)
    .onStart(() => {
      runOnJS(setAnimationState)('searching');
    })
    .onUpdate(event => {
      dragX.value = Math.max(0, Math.min(event.translationX, MAX_DRAG));
    })
    .onEnd(() => {
      if (dragX.value / MAX_DRAG > UNLOCK_THRESHOLD) {
        dragX.value = withTiming(MAX_DRAG, { duration: 150 });
        runOnJS(handleUnlock)();
      } else {
        dragX.value = withTiming(0, { duration: 200 });
        runOnJS(setAnimationState)('idle');
      }
    });

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const handleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: dragX.value + HANDLE_SIZE,
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, MAX_DRAG * 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const successFillStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
  }));

  const blobOneAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: blobOneShift.value },
      { translateY: blobOneShift.value * 0.5 },
      { scale: blobOneScale.value },
    ],
  }));

  const blobTwoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: blobTwoShift.value },
      { translateY: -blobTwoShift.value * 0.4 },
      { scale: blobTwoScale.value },
    ],
  }));

  const nearbyDotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nearbyDotScale.value }],
    opacity: interpolate(nearbyDotScale.value, [1, 1.6], [1, 0.4]),
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  return (
    <GestureHandlerRootView style={styles.flexFill}>
      <View style={styles.screen}>
        <Animated.View style={[styles.glowTopRight, blobOneAnimatedStyle]}>
          <LinearGradient
            colors={['rgba(129,140,248,0.25)', 'rgba(237,233,254,0)']}
            style={styles.glowFill}
          />
        </Animated.View>
        <Animated.View style={[styles.glowBottomLeft, blobTwoAnimatedStyle]}>
          <LinearGradient
            colors={['rgba(196,181,253,0.3)', 'rgba(237,233,254,0)']}
            style={styles.glowFill}
          />
        </Animated.View>

        <View style={styles.header}>
          <Send color="#4F6BFF" strokeWidth={2.5} style={{ paddingBottom: 22 }} />
          <Pressable style={styles.menuButton}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </Pressable>
        </View>

        <View style={styles.nearbyPill}>
          <Animated.View style={[styles.nearbyDot, nearbyDotAnimatedStyle]} />
          <Text style={styles.nearbyPillText}>{devicesNearby} devices nearby</Text>
        </View>

        <Text style={styles.eyebrow}>NEARBY FILE SHARING</Text>

        <Text style={styles.headline}>Send files.{'\n'}Simply.</Text>
        <Text style={styles.subheadline}>
          Share photos, videos, and more with people close by.
        </Text>

        <View style={styles.avatarStage}>
          <Animated.View style={[styles.avatarWrapper, avatarAnimatedStyle]}>
            <AvatarWebView animation={animationState} definition={definition} />
          </Animated.View>
        </View>

        <View style={styles.spacer} />

        <Pressable style={styles.readyCard} onPress={onPickFile}>
          <View style={styles.readyCardLeft}>
            <View style={styles.readyDotRow}>
              <View style={styles.readyDot} />
              <Text style={styles.readyLabel}>READY TO SHARE</Text>
            </View>
            <Text style={styles.readyValue}>No setup. Just pick a file.</Text>
          </View>
          <Text style={styles.readyArrow}>↗</Text>
        </Pressable>

        <View style={[styles.swipeTrack, isUnlocked && styles.swipeTrackUnlocked]}>
          <Animated.View style={[styles.swipeSuccessFill, successFillStyle]} />
          <Animated.View style={[styles.swipeFill, fillAnimatedStyle]} />

          <Animated.View style={[styles.swipeLabelWrap, labelAnimatedStyle]} pointerEvents="none">
            <Text style={styles.swipeLabel}>Just swipe right...</Text>
          </Animated.View>

          {isUnlocked && (
            <View style={styles.swipeSentLabelWrap} pointerEvents="none">
              <Text style={styles.swipeSentLabel}>Sent!</Text>
            </View>
          )}

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.swipeHandle, handleAnimatedStyle]}>
              <Text style={styles.swipeHandleArrow}>{isUnlocked ? '✓' : '→'}</Text>
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Fast, private, and nearby.</Text>
          <Animated.Text style={[styles.footerSparkle, sparkleAnimatedStyle]}>✦</Animated.Text>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: '#f2f0fb',
    paddingHorizontal: TRACK_HORIZONTAL_MARGIN,
    paddingTop: 60,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  glowTopRight: {
    position: 'absolute',
    top: -60,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    overflow: 'hidden',
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    overflow: 'hidden',
  },
  glowFill: { width: '100%', height: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(30,27,46,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  menuLine: {
    width: 14,
    height: 1.5,
    backgroundColor: '#1e1b2e',
    borderRadius: 1,
  },
  nearbyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 18,
  },
  nearbyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  nearbyPillText: { fontSize: 12, color: '#4b4863', fontWeight: '600' },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c6fe0',
    letterSpacing: 0.6,
    marginTop: 10,
  },
  headline: {
    fontSize: 40,
    fontWeight: '900',
    color: '#171425',
    lineHeight: 44,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 14,
    color: '#6b6885',
    marginTop: 10,
    lineHeight: 20,
    maxWidth: 260,
  },
  avatarStage: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  avatarWrapper: { width: 190, height: 190 },
  spacer: { flex: 1 },
  readyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  readyCardLeft: { gap: 4 },
  readyDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399' },
  readyLabel: { fontSize: 10, fontWeight: '800', color: '#34d399', letterSpacing: 0.5 },
  readyValue: { fontSize: 14, fontWeight: '600', color: '#1e1b2e' },
  readyArrow: { fontSize: 18, color: '#7c6fe0' },
  swipeTrack: {
    height: 64,
    borderRadius: 32,
    backgroundColor: '#171425',
    marginTop: 14,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  swipeTrackUnlocked: { backgroundColor: '#171425' },
  swipeSuccessFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(52,211,153,0.18)',
  },
  swipeFill: {
    position: 'absolute',
    left: 8,
    top: 8,
    bottom: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 28,
  },
  swipeLabelWrap: { position: 'absolute', left: HANDLE_SIZE + 26, right: 24 },
  swipeLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  swipeSentLabelWrap: { position: 'absolute', left: HANDLE_SIZE + 26, right: 24 },
  swipeSentLabel: { fontSize: 14, fontWeight: '700', color: '#34d399' },
  swipeHandle: {
    position: 'absolute',
    left: 8,
    top: 8,
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  swipeHandleArrow: { fontSize: 18, fontWeight: '800', color: '#171425' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  footerText: { fontSize: 11, color: '#8b87a3' },
  footerSparkle: { fontSize: 12, color: '#7c6fe0' },
});

export default LandingScreen;