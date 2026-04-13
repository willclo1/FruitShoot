import { Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { CopilotStep, walkthroughable } from 'react-native-copilot';

const WalkthroughView = walkthroughable(View);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <CopilotStep name="Home" order={7} text="Come back here anytime to scan more fruit.">
              <WalkthroughView>
                <IconSymbol size={28} name="house.fill" color={color} />
              </WalkthroughView>
            </CopilotStep>
          ),
        }}
      />
      <Tabs.Screen
        name="explore-recipes"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <CopilotStep name="Explore" order={5} text="Browse and save community recipes here.">
              <WalkthroughView>
                <Ionicons name="compass-outline" size={size} color={color} />
              </WalkthroughView>
            </CopilotStep>
          ),
        }}
      />
      <Tabs.Screen
        name="profileScreen"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <CopilotStep name="Profile" order={6} text="Create, import, and manage your recipes.">
              <WalkthroughView>
                <IconSymbol size={28} name="person.fill" color={color} />
              </WalkthroughView>
            </CopilotStep>
          ),
        }}
      />
    </Tabs>
  );
}
