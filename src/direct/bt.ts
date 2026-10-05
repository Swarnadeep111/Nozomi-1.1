import RNBluetoothClassic from 'react-native-bluetooth-classic';

const SERVICE_UUID = '8b6d5c4e-3a2b-4c1d-9e8f-7a6b5c4d3e2f'; // Nozomi's UUID — same on both devices

export async function isBluetoothEnabled(): Promise<boolean> {
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  return enabled;
}

export async function requestBluetoothEnable() {
  try {
    await RNBluetoothClassic.requestBluetoothEnabled(); // prompts user to turn BT on
  } catch (e) {
    console.warn('User declined Bluetooth');
  }
}

export async function requestPermissions(): Promise<boolean> {
  // Android 12+ runtime permissions — the lib exposes a helper
  const granted = await RNBluetoothClassic.requestPermissions();
  return !!granted;
}