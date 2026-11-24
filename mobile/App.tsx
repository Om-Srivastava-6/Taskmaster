import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Tasks</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today's tasks</Text>

      <View style={styles.taskCard}>
        <View style={styles.checkbox} />
        <Text style={styles.taskText}>Write down a task</Text>
      </View>
      <View style={styles.taskCard}>
        <View style={styles.checkbox} />
        <Text style={styles.taskText}>Take a break</Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#172033",
  },
  date: {
    fontSize: 14,
    color: "#667085",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#172033",
    marginTop: 32,
    marginBottom: 14,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E8EC",
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2563EB",
    marginRight: 14,
  },
  taskText: {
    fontSize: 16,
    color: "#344054",
  },
});
