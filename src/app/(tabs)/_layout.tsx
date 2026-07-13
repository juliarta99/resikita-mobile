import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Feather } from "@expo/vector-icons";
import { Tabs, router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

function CenterButton() {
  const { user } = useAuth();
  return (
    <View style={styles.centerWrap}>
      <Pressable
        style={styles.fab}
        onPress={() => router.push((user ? "/aksi" : "/login") as Href)}
      >
        <Feather
          name={user ? "maximize" : "lock"}
          size={22}
          color={colors.white}
        />
      </Pressable>
      <Text style={styles.fabLabel}>{user ? "Pindai" : "Login"}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: { height: 66, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="beranda"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="peta"
        options={{
          title: "Peta",
          tabBarIcon: ({ color }) => (
            <Feather name="map" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="aksi"
        options={{ title: "", tabBarButton: () => <CenterButton /> }}
      />
      <Tabs.Screen
        name="pasar"
        options={{
          title: "Pasar",
          tabBarIcon: ({ color }) => (
            <Feather name="shopping-bag" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabLabel: {
    fontSize: 11,
    color: colors.brand,
    marginTop: 2,
    fontWeight: "600",
  },
});
