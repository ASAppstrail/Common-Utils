import { Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import DeviceInfo from 'react-native-device-info';

export interface LocationEnablementStatus {
  permissionGranted: boolean;
  locationServicesEnabled: boolean;
  isReady: boolean;
}

async function isAppPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // LOCATION_WHEN_IN_USE returns GRANTED for both "While Using" and "Always".
    // Check LOCATION_ALWAYS separately only if you need background location.
    const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return status === RESULTS.GRANTED;
  }

  // On Android 12+, users can grant approximate (coarse) location only.
  // If approximate is acceptable for your app, also check ACCESS_COARSE_LOCATION.
  const fine = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  return fine === RESULTS.GRANTED;
}

async function isDeviceLocationEnabled(): Promise<boolean> {
  try {
    // Cross-platform: system-wide Location Services on iOS, GPS/location toggle on Android.
    return await DeviceInfo.isLocationEnabled();
  } catch {
    return false;
  }
}

export async function checkLocationEnablement(): Promise<LocationEnablementStatus> {
  const [permissionGranted, locationServicesEnabled] = await Promise.all([
    isAppPermissionGranted(),
    isDeviceLocationEnabled(),
  ]);

  const isReady = permissionGranted && locationServicesEnabled;

  return { permissionGranted, locationServicesEnabled, isReady };
}