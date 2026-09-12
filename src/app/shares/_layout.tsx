import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Colors } from '../constants/theme';

// import { Colors } from '@/constants/theme';
// import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SharesTabs() {
  const scheme = useColorScheme();
  const theme: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.accent}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Share</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="paperplane.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="album">
        <NativeTabs.Trigger.Label>Album</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="photo.on.rectangle.angled" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}