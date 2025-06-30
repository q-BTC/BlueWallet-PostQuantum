#!/bin/bash

echo "🚀 Launching BlueWallet with qBTC support on iOS Simulator..."

# Kill any existing Metro bundler
echo "🛑 Stopping any existing Metro bundler..."
pkill -f "react-native start" || true

# Navigate to project directory
cd /Users/chris/Desktop/Development/BlueWallet

# Start Metro bundler in a new terminal window
echo "📦 Starting Metro bundler..."
osascript -e 'tell app "Terminal" to do script "cd /Users/chris/Desktop/Development/BlueWallet && npm start"'

# Wait for Metro to start
echo "⏳ Waiting for Metro bundler to start..."
sleep 5

# Build and run iOS app
echo "🔨 Building iOS app..."
npx react-native run-ios --simulator="iPhone 15"

echo "✅ BlueWallet should now be running on the iOS simulator!"
echo ""
echo "📱 To test qBTC functionality:"
echo "1. Tap the '+' button to add a new wallet"
echo "2. Select 'qBTC' from the wallet types"
echo "3. Configure your qBTC node URL (default: http://localhost:8000)"
echo "4. Create the wallet and backup your keys"
echo ""
echo "⚠️  Note: Make sure you have a qBTC node running if you want to test transactions"