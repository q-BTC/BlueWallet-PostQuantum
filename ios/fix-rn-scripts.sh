#!/bin/bash

# Fix React Native script permissions for Xcode builds
# This script ensures all React Native build scripts have proper permissions

echo "Fixing React Native script permissions..."

REACT_NATIVE_SCRIPTS_DIR="/Users/chris/Desktop/Development/BlueWallet/node_modules/react-native/scripts"

# Make all shell scripts executable
find "$REACT_NATIVE_SCRIPTS_DIR" -name "*.sh" -type f -exec chmod +x {} \;

# Remove quarantine attributes that might block execution
find "$REACT_NATIVE_SCRIPTS_DIR" -name "*.sh" -type f -exec xattr -d com.apple.quarantine {} \; 2>/dev/null || true

# Specifically fix the with-environment.sh script
WITH_ENV_SCRIPT="$REACT_NATIVE_SCRIPTS_DIR/xcode/with-environment.sh"
if [ -f "$WITH_ENV_SCRIPT" ]; then
    chmod +x "$WITH_ENV_SCRIPT"
    xattr -d com.apple.quarantine "$WITH_ENV_SCRIPT" 2>/dev/null || true
    echo "Fixed permissions for with-environment.sh"
else
    echo "Warning: with-environment.sh not found at expected location"
fi

echo "Script permissions fixed successfully!"