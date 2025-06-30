# Fixing CocoaPods Installation

## The Problem
Your system Ruby (2.6) is too old for the latest CocoaPods. You need Ruby 3.1.0+.

## Solution Options

### Option 1: Install CocoaPods with compatible version (Quickest)

1. **Exit root mode**:
   ```bash
   exit
   ```

2. **Install compatible CocoaPods version**:
   ```bash
   sudo gem install cocoapods -v 1.15.2
   ```

3. **Then install pods**:
   ```bash
   cd /Users/chris/Desktop/Development/BlueWallet/ios
   pod install
   ```

### Option 2: Use Homebrew (Recommended for macOS)

1. **Exit root mode**:
   ```bash
   exit
   ```

2. **Install Homebrew** (if not already installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. **Install CocoaPods via Homebrew**:
   ```bash
   brew install cocoapods
   ```

4. **Install pods**:
   ```bash
   cd /Users/chris/Desktop/Development/BlueWallet/ios
   pod install
   ```

### Option 3: Update Ruby (More involved)

1. **Exit root mode**:
   ```bash
   exit
   ```

2. **Install rbenv**:
   ```bash
   brew install rbenv ruby-build
   echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. **Install newer Ruby**:
   ```bash
   rbenv install 3.3.0
   rbenv global 3.3.0
   ```

4. **Install CocoaPods**:
   ```bash
   gem install cocoapods
   ```

5. **Install pods**:
   ```bash
   cd /Users/chris/Desktop/Development/BlueWallet/ios
   pod install
   ```

## Quick Fix (Try this first)

Since npm install succeeded, you can try running the app without CocoaPods for now:

```bash
# Exit root
exit

# For Android (doesn't need CocoaPods)
cd /Users/chris/Desktop/Development/BlueWallet
npm run android

# For iOS without pods (may have limited functionality)
npm run ios
```

## Alternative: Skip iOS for now

If you just want to test qBTC functionality, you can:

1. Use Android (doesn't require CocoaPods)
2. Use the web version if available
3. Fix CocoaPods later when needed

## Verifying Installation

The good news is that npm install succeeded, which means:
- ✅ @noble/post-quantum is installed
- ✅ axios is installed
- ✅ All JavaScript dependencies are ready

You can now:
1. Run on Android without any issues
2. Fix CocoaPods for iOS when convenient