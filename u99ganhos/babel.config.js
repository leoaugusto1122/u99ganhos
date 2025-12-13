
// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ... outros plugins, se houver
      'react-native-reanimated/plugin', // ESSA LINHA É ESSENCIAL
    ],
  };
};