import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DO IT</Text>

      <Text style={styles.subtitle}>Today</Text>

      <View style={styles.taskCard}>
        <Text style={styles.taskText}>[ ] Write down a task</Text>
      </View>
      <View style={styles.taskCard}>
        <Text style={styles.taskText}>[ ] Take a break</Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffc7f9",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#302030",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  taskText: {
    fontSize: 16,
  },
});
