# Installing BlueWallet with qBTC Support

## Prerequisites

1. **Node.js** (v20 or higher)
2. **CocoaPods** (for iOS builds)
3. **React Native development environment**

## Installation Steps

### 1. Exit root mode (if you're in root)
```bash
exit
```

### 2. Install CocoaPods (macOS only, for iOS builds)
```bash
sudo gem install cocoapods
```

### 3. Install npm dependencies
```bash
cd /Users/chris/Desktop/Development/BlueWallet
npm install
```

### 4. For iOS: Install iOS dependencies
```bash
cd ios
pod install
cd ..
```

### 5. For Android: 
No additional steps needed after npm install

## Running the App

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

## Troubleshooting

### If npm install fails with @noble/post-quantum

The package.json has been updated to use version 0.4.1 which is the latest stable version.

### If pod install fails

Make sure you have:
1. Xcode installed
2. Xcode command line tools: `xcode-select --install`
3. CocoaPods: `sudo gem install cocoapods`

### If you get "command not found: pod"

1. Install CocoaPods: `sudo gem install cocoapods`
2. If you still get the error, you may need to add the gem bin directory to your PATH:
   ```bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

### For M1/M2 Macs

If you encounter architecture-related issues:
```bash
cd ios
arch -x86_64 pod install
cd ..
```

## Verifying qBTC Integration

After successful installation, you can verify qBTC support:

1. Run the app
2. Go to "Add Wallet"
3. You should see "qBTC" as one of the wallet options

## Next Steps

1. Run a local qBTC node (optional):
   ```bash
   cd ../qBTC-core
   docker-compose up
   ```

2. Create a qBTC wallet in BlueWallet
3. Configure the qBTC node URL (default: http://localhost:8000)