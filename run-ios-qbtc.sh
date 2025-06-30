#!/bin/bash

echo "Setting up BlueWallet with qBTC support for iOS..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please run this script as a regular user, not as root"
   echo "Exit root mode with: exit"
   exit 1
fi

# Check for Xcode
if ! command_exists xcodebuild; then
    echo "❌ Xcode is not installed. Please install Xcode from the App Store."
    exit 1
fi

echo "✅ Xcode is installed"

# Check for Homebrew
if ! command_exists brew; then
    echo "❌ Homebrew is not installed. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "✅ Homebrew is installed"
fi

# Update PATH for Homebrew (for M1/M2 Macs)
if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Install CocoaPods via Homebrew
if ! command_exists pod; then
    echo "📦 Installing CocoaPods via Homebrew..."
    brew install cocoapods
else
    echo "✅ CocoaPods is installed"
fi

# Navigate to project directory
cd /Users/chris/Desktop/Development/BlueWallet

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
else
    echo "✅ npm dependencies are installed"
fi

# Install iOS dependencies
echo "📦 Installing iOS dependencies..."
cd ios

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ~/Library/Developer/Xcode/DerivedData/BlueWallet-*
rm -rf Pods
rm -f Podfile.lock

# Install pods
echo "📦 Installing CocoaPods dependencies..."
pod install

# Return to main directory
cd ..

# Check if simulator is running
if ! pgrep -x "Simulator" > /dev/null; then
    echo "🚀 Starting iOS Simulator..."
    open -a Simulator
    sleep 5
fi

# Run the app
echo "🚀 Building and running BlueWallet on iOS..."
npm run ios

echo "✅ Done! BlueWallet should now be running on the iOS simulator."
echo ""
echo "To test qBTC:"
echo "1. Tap 'Add Wallet'"
echo "2. Select 'qBTC'"
echo "3. Configure qBTC node URL (default: http://localhost:8000)"
echo "4. Create wallet"