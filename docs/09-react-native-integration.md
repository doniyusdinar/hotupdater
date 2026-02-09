# React Native Integration

This guide covers integrating Hot Updater into your React Native application to enable over-the-air updates.

## Overview

Hot Updater React Native SDK provides:
- Automatic update checking
- Bundle downloading and caching
- Update strategy (by app version or device fingerprint)
- Multiple update modes (auto, sync, none)
- Custom UI for loading screens

## Step 1: Install SDK

In your React Native app:

```bash
npm install @hot-updater/react-native
```

For iOS, update pods:

```bash
cd ios && pod install && cd ..
```

## Step 2: Configure SDK

Update your `App.tsx` (or `index.js`):

```typescript
import { HotUpdater } from '@hot-updater/react-native';
import { View, Text, ActivityIndicator } from 'react-native';

function App() {
  return (
    <View>
      <Text>Welcome to my app!</Text>
    </View>
  );
}

// Wrap your app with HotUpdater
export default HotUpdater.wrap({
  // Server endpoint
  baseURL: 'http://localhost:3000/hot-updater',

  // Update strategy
  updateStrategy: 'appVersion', // or 'fingerprint'

  // When to check for updates
  updateMode: 'auto', // 'auto' | 'sync' | 'none'

  // Fallback UI while updating
  fallbackComponent: ({ progress, status }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>
        {status === 'downloading' ? `Downloading... ${progress}%` : 'Updating...'}
      </Text>
    </View>
  ),

  // Error handling
  onError: (error) => {
    console.error('Update error:', error);
  },
})(App);
```

## Configuration Options

### baseURL

Your Hot Updater server endpoint.

**Development:**
```typescript
baseURL: 'http://localhost:3000/hot-updater'
```

**Production:**
```typescript
baseURL: 'https://updates.yourdomain.com/hot-updater'
```

### updateStrategy

How to match updates to your app.

**appVersion** (Recommended):
```typescript
updateStrategy: 'appVersion'
```

Updates are matched based on:
- Platform (ios/android)
- App version (e.g., 1.0.0)
- Channel (production/staging)
- Minimum bundle ID (for rollbacks)

**fingerprint**:
```typescript
updateStrategy: 'fingerprint'
```

Updates are matched based on:
- Platform
- Device fingerprint (unique hash of device)
- Channel
- Bundle ID

Use `fingerprint` for more granular control, like A/B testing.

### updateMode

When to check for and apply updates.

**auto** (Recommended):
```typescript
updateMode: 'auto'
```

- Checks for updates on app launch
- Downloads and applies updates automatically
- Shows loading UI during update

**sync**:
```typescript
updateMode: 'sync'
```

- Checks for updates synchronously on app launch
- Blocks app start until update check completes
- Use when you need to guarantee latest bundle

**none**:
```typescript
updateMode: 'none'
```

- Disables automatic updates
- You can manually trigger updates:
  ```typescript
  import { checkAndApplyUpdate } from '@hot-updater/react-native';
  await checkAndApplyUpdate();
  ```

### fallbackComponent

Custom loading UI shown during updates.

```typescript
fallbackComponent: ({ progress, status }) => (
  <View style={styles.container}>
    {status === 'checking' && <Text>Checking for updates...</Text>}
    {status === 'downloading' && (
      <>
        <ActivityIndicator size="large" />
        <Text>Downloading... {Math.round(progress)}%</Text>
        <ProgressBar progress={progress / 100} />
      </>
    )}
    {status === 'applying' && <Text>Installing update...</Text>}
  </View>
)
```

Status values:
- `checking`: Verifying if update is available
- `downloading`: Downloading bundle (0-100%)
- `applying`: Installing the update

### onError

Handle update errors.

```typescript
onError: (error) => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      // Network connection failed
      break;
    case 'SERVER_ERROR':
      // Server returned error
      break;
    case 'BUNDLE_ERROR':
      // Bundle download/apply failed
      break;
    default:
      console.error('Update error:', error);
  }
}
```

## Step 3: Configure Channel

Set the update channel (development, staging, production).

```typescript
import { HotUpdater } from '@hot-updater/react-native';

// Set channel (call before wrap())
HotUpdater.setChannel('production');
```

Common channels:
- `production`: Production updates (default)
- `staging`: Staging/pre-production updates
- `development`: Development builds

## Step 4: Test the Integration

### Run on iOS Simulator

```bash
npx react-native run-ios
```

### Run on Android Emulator

```bash
npx react-native run-android
```

### Check for Updates Manually

```typescript
import { checkAndApplyUpdate } from '@hot-updater/react-native';

// In a button handler or useEffect
const handleCheckForUpdates = async () => {
  try {
    const hasUpdate = await checkAndApplyUpdate();
    if (hasUpdate) {
      console.log('Update applied!');
    } else {
      console.log('No updates available');
    }
  } catch (error) {
    console.error('Update failed:', error);
  }
};
```

## Advanced Usage

### Custom Channel Selection

Let users select channel (for beta testing):

```typescript
import { HotUpdater } from '@hot-updater/react-native';
import { Settings } from './Settings';

function ChannelSelector() {
  const [channel, setChannel] = React.useState('production');

  const changeChannel = (newChannel) => {
    HotUpdater.setChannel(newChannel);
    setChannel(newChannel);
  };

  return (
    <Picker
      selectedValue={channel}
      onValueChange={changeChannel}
    >
      <Picker.Item label="Production" value="production" />
      <Picker.Item label="Beta" value="staging" />
      <Picker.Item label="Dev" value="development" />
    </Picker>
  );
}
```

### Manual Update Check with UI

```typescript
import { useHotUpdater } from '@hot-updater/react-native';

function UpdateButton() {
  const { checkForUpdates, isChecking, hasUpdate, progress, status } = useHotUpdater();

  return (
    <View>
      <Button
        title="Check for Updates"
        onPress={checkForUpdates}
        disabled={isChecking}
      />

      {isChecking && <Text>Checking...</Text>}

      {hasUpdate && (
        <View>
          <Text>Update available!</Text>
          <Text>Downloading: {progress}%</Text>
          <Text>Status: {status}</Text>
        </View>
      )}
    </View>
  );
}
```

### Version Constraints

Specify minimum/maximum app versions for updates:

```typescript
export default HotUpdater.wrap({
  baseURL: 'http://localhost:3000/hot-updater',
  updateStrategy: 'appVersion',

  // Only show updates for app versions >= 1.0.0
  minBundleId: '1.0.0',

  // Only show updates for app versions <= 2.0.0
  bundleId: '2.0.0',
})(App);
```

### Update Notifications

Notify users when updates are available:

```typescript
import { HotUpdater } from '@hot-updater/react-native';
import { Alert } from 'react-native';

HotUpdater.wrap({
  baseURL: 'http://localhost:3000/hot-updater',
  updateStrategy: 'appVersion',
  updateMode: 'sync',

  onAvailable: (updateInfo) => {
    Alert.alert(
      'Update Available',
      `A new update (${updateInfo.version}) is available. Download now?`,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Download', onPress: () => HotUpdater.applyUpdate() }
      ]
    );
  },
})(App);
```

## Expo Integration

If you're using Expo, use a slightly different approach:

```bash
npx expo install @hot-updater/react-native
```

In your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@hot-updater/react-native",
        {
          "baseURL": "http://localhost:3000/hot-updater",
          "updateStrategy": "appVersion",
          "updateMode": "auto"
        }
      ]
    ]
  }
}
```

## Best Practices

### Update Strategy

| Scenario | Recommended Strategy |
|----------|---------------------|
| Production app | `appVersion` with `auto` |
| Beta testing | `fingerprint` with `auto` |
| Enterprise apps | `appVersion` with `sync` |
| Offline-first apps | `appVersion` with `auto` |

### Channel Management

- **Production**: Stable, tested releases
- **Staging**: Pre-production testing
- **Development**: Latest features (for internal team)

### Error Handling

```typescript
onError: (error) => {
  // Log to error tracking service
  Sentry.captureException(error);

  // Show user-friendly message
  Alert.alert(
    'Update Failed',
    'Could not update app. Please restart the app.'
  );
}
```

### Loading UI

Keep the loading UI simple and informative:

```typescript
fallbackComponent: ({ progress, status }) => (
  <View style={styles.container}>
    <Logo size={80} />
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={styles.text}>
      {status === 'downloading'
        ? `Downloading update... ${Math.round(progress)}%`
        : 'Preparing app...'}
    </Text>
  </View>
)
```

## Troubleshooting

### Issue: "Network request failed"

**Solutions:**
1. Verify baseURL is correct
2. Check server is accessible
3. Ensure iOS/Android has network permissions
4. Test on physical device (simulator may have issues)

### Issue: "Update not applied"

**Solutions:**
1. Check server has bundles for your app version
2. Verify channel matches server
3. Check updateStrategy configuration
4. Look for errors in onError callback

### Issue: "Bundle download fails"

**Solutions:**
1. Verify S3 bucket is accessible
2. Check storageUri in database
3. Ensure bundle file exists in S3
4. Check file size (very large files may timeout)

### Issue: "App crashes after update"

**Solutions:**
1. Test bundle locally before deploying
2. Check bundle for syntax errors
3. Verify all dependencies are bundled
4. Rollback to previous bundle via API

## Next Steps

With React Native integration complete:

1. [Authentication & Security](10-authentication-security.md) - Secure your API
2. [Deployment Checklist](11-deployment-checklist.md) - Prepare for production
3. [Troubleshooting](12-troubleshooting.md) - Common issues and solutions

## Additional Resources

- [React Native SDK Docs](https://hot-updater.dev/docs/react-native)
- [Example App](https://github.com/gronxbhot-updater/tree/main/examples/react-native)
- [Update Strategies Guide](https://hot-updater.dev/docs/guides/update-strategies)
