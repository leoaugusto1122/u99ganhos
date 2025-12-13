// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Adiciona 'wasm' a assetExts para suportar expo-sqlite/wa-sqlite no ambiente web
if (config.resolver && config.resolver.assetExts) {
    config.resolver.assetExts.push('wasm');
}

// REMOVIDO: A configuração 'babelTransformerPath' para o Reanimated
// é propensa a erros no carregamento do Node.js.
// O plugin deve ser configurado no babel.config.js.

module.exports = config;