import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';

import FloatingActionButton from './FloatingActionButton';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

interface CustomTabBarProps extends BottomTabBarProps {
  onPressGanhos: () => void;
  onPressDespesas: () => void;
  onPressStartSession: () => void;
  onPressRetroactive: () => void;
}

export default function CustomTabBar({ state, descriptors, navigation, onPressGanhos, onPressDespesas, onPressStartSession, onPressRetroactive }: CustomTabBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const color = isFocused ? '#00A85A' : '#9CA3AF';

          const icon = options.tabBarIcon
            ? options.tabBarIcon({ focused: isFocused, color, size: 24 })
            : null;

          if (index === 2) {
            return <View key={route.key} style={styles.fabContainer} />;
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as any).tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              {icon}
              <Text style={{ color: isFocused ? '#00A85A' : '#9CA3AF', fontSize: 12 }}>
                {label as any}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.fabWrapper}>
        {state.index === 0 && (
          <FloatingActionButton
            onPressGanhos={onPressGanhos}
            onPressDespesas={onPressDespesas}
            onPressStartSession={onPressStartSession}
            onPressRetroactive={onPressRetroactive}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    height: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    width: 80,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90,
    left: '50%',
    marginLeft: -30,
    zIndex: 10,
  },
});
