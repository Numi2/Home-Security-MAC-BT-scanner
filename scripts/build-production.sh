#!/bin/bash

# Home Security Hub - Production Build Script
# This script builds the app for production release

set -e

echo "🏠 Home Security Hub - Production Build"
echo "======================================"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/cli
fi

# Check if logged in to Expo
echo "🔐 Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    echo "❌ Not logged in to Expo. Please run 'eas login' first."
    exit 1
fi

echo "✅ Expo authentication verified"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf .expo/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Build for Android production
echo "🔨 Building Android production APK..."
eas build --platform android --profile production --non-interactive

echo "✅ Production build completed!"
echo ""
echo "📱 Next steps:"
echo "1. Download the APK from the EAS build dashboard"
echo "2. Test the APK on a physical device"
echo "3. Submit to Google Play Store with: npm run submit:android"
echo ""
echo "🔗 Build dashboard: https://expo.dev/accounts/[your-account]/projects/home-security-hub/builds" 