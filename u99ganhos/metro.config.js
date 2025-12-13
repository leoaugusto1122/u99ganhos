const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add 'wasm' to assetExts to support expo-sqlite/wa-sqlite on web
if (config.resolver && config.resolver.assetExts) {
    config.resolver.assetExts.push('wasm');
}

module.exports = config;
