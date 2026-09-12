// authStorage.ts
//
// Single source of truth for the "one-time login" account.
//
// Product rule this file encodes: a device only ever fills out the sign-in
// form ONCE. After that, the account stays in AsyncStorage permanently —
// logging out does NOT delete it. So on every future app launch we can look
// for a saved account and, if one exists, skip straight past Landing/Login
// into the main app.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

export const USER_STORAGE_KEY = '@app_user_credentials';
const AVATAR_FILENAME = 'profile-avatar.jpg';

export interface SavedUser {
   username: string;
   password: string;
   avatar: string | null;
   /** Name shown to nearby devices during discovery. Falls back to a default if unset. */
   deviceName?: string | null;
   /** Whether this device shows up on other people's "nearby" radar. Defaults to true. */
   discoverable?: boolean;
}

/** Returns the saved account, or null if this device has never signed in. */
export async function getSavedUser(): Promise<SavedUser | null> {
   try {
      const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedUser) : null;
   } catch {
      return null;
   }
}

/** Called once, from the login screen's "slide to sign in". Writes the account permanently. */
export async function saveUser(user: SavedUser): Promise<void> {
   await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Called from wherever your profile/edit-account UI lives on the main page.
 * Merges over the existing saved account instead of replacing it wholesale.
 */
export async function updateUser(changes: Partial<SavedUser>): Promise<SavedUser | null> {
   const current = await getSavedUser();
   const next = { ...current, ...changes } as SavedUser;
   await saveUser(next);
   return next;
}

/**
 * "Logout" intentionally does NOT touch AsyncStorage. Per the product
 * requirement, the saved account is never removed by logging out — call
 * this only to know where to navigate (e.g. router.replace('/login')).
 * The account will still be found by getSavedUser() on the next launch,
 * so the app will route straight back to the main page automatically.
 */
export function logout(router: { replace: (path: any) => void }, loginRoute = '/login') {
   router.replace(loginRoute);
}

/**
 * Real, permanent delete. Only wire this up to an explicit "delete my
 * account" action if you ever add one — it is NOT what the logout button
 * should call.
 */
export async function forgetUserPermanently(): Promise<void> {
   await AsyncStorage.removeItem(USER_STORAGE_KEY);

   try {
      const avatarFile = new File(Paths.document, AVATAR_FILENAME);
      if (avatarFile.exists) {
         avatarFile.delete();
      }
   } catch {
      // Nothing to clean up, or the file was already gone — safe to ignore.
   }
}

/**
 * Copies a picked photo (e.g. the URI returned by expo-image-picker) into
 * this app's permanent document directory and returns a stable URI.
 *
 * Why this exists: image pickers hand back a URI that lives in a cache or
 * tmp directory. That directory is NOT guaranteed to survive an app
 * restart — iOS in particular can clear it at any time. If you save that
 * raw URI straight into AsyncStorage, the string persists but the file it
 * points to can vanish, so the avatar silently fails to render later even
 * though `avatar` is non-null.
 *
 * Call this BEFORE saveUser/updateUser:
 *
 *   const picked = await ImagePicker.launchImageLibraryAsync({ ... });
 *   if (!picked.canceled) {
 *      const permanentUri = await persistAvatarImage(picked.assets[0].uri);
 *      await updateUser({ avatar: permanentUri });
 *   }
 */
export async function persistAvatarImage(pickedUri: string): Promise<string> {
   const source = new File(pickedUri);
   const destination = new File(Paths.document, AVATAR_FILENAME);

   // Overwrite any previous avatar so storage doesn't accumulate stale files.
   if (destination.exists) {
      destination.delete();
   }

   source.copy(destination);

   // Bust the Image component's cache: RN/iOS can cache by URI, and since
   // we always reuse the same filename a stale image can otherwise stick
   // around after the user picks a new photo.
   return `${destination.uri}?v=${Date.now()}`;
}