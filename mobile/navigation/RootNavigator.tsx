import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AccountDetailScreen } from "../screens/AccountDetail";
import { Dashboard } from "../screens/Dashboard";
import { SettingsScreen } from "../screens/Settings";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  onUnlinked: () => void;
};

export function RootNavigator({ onUnlinked }: RootNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerStyle: { backgroundColor: "#f8fafc" },
          headerShadowVisible: false,
          headerTintColor: "#0f172a",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#f8fafc" },
        }}
      >
        <Stack.Screen
          name="Dashboard"
          component={Dashboard}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AccountDetail"
          component={AccountDetailScreen}
          options={{ title: "Account" }}
        />
        <Stack.Screen name="Settings" options={{ title: "Settings" }}>
          {() => <SettingsScreen onUnlinked={onUnlinked} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
