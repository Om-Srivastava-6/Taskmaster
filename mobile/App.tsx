import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Write down a task", completed: false },
    { id: 2, title: "Take a break", completed: false },
  ]);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function toggleTask(id: number) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Tasks</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Today's tasks</Text>

      {tasks.map((task) => (
        <Pressable
          key={task.id}
          style={[
            styles.taskCard,
            task.completed && styles.taskCardCompleted,
          ]}
          onPress={() => toggleTask(task.id)}
          accessibilityRole="checkbox"
          accessibilityLabel={task.title}
          accessibilityState={{ checked: task.completed }}
        >
          <View
            style={[
              styles.checkbox,
              task.completed && styles.checkboxCompleted,
            ]}
          >
            {task.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text
            style={[
              styles.taskText,
              task.completed && styles.taskTextCompleted,
            ]}
          >
            {task.title}
          </Text>
        </Pressable>
      ))}
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
  taskCardCompleted: {
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FBFF",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#2563EB",
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#2563EB",
  },
  taskText: {
    fontSize: 16,
    color: "#344054",
  },
  taskTextCompleted: {
    color: "#667085",
    textDecorationLine: "line-through",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
});
