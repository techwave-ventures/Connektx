// Script to clear news store cache
// Run this with: node clear-news-cache.js

const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing news store cache...');

// For React Native apps, AsyncStorage is typically cleared by:
// 1. Clearing app data on device/simulator
// 2. Or adding code to clear specific keys

console.log('✅ Instructions to clear cache:');
console.log('   1. For iOS Simulator: Device > Erase All Content and Settings');
console.log('   2. For Android Emulator: Settings > Apps > [Your App] > Storage > Clear Data');
console.log('   3. For physical device: Uninstall and reinstall the app');
console.log('   4. Or restart the app - categories are now excluded from cache');

console.log('\n📱 Categories have been updated to:');
const categories = ['All', "analysis", "defence", "economy", "environment", "explainer", "finance", "general", "india", "industry", "lifestyle", "markets", "nri", "opinion", "politics", "science", "sme", "social", "sports", "startup", "technology", "world-news"];
categories.forEach((cat, idx) => {
  console.log(`   ${idx + 1}. ${cat}`);
});

console.log('\n🔄 The app will now load the new categories from code, not from cache.');
