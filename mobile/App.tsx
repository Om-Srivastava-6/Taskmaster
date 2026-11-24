import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Write down a task", completed: false },
    { id: 2, title: "Take a break", completed: false },
  ]);
  const [nextTaskId, setNextTaskId] = useState(3);
  const [taskTitleWidths, setTaskTitleWidths] = useState<Record<number, number>>(
    {},
  );
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
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

  function addTask() {
    const title = newTaskTitle.trim();
    if (!title) {
      return;
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      { id: nextTaskId, title, completed: false },
    ]);
    setNextTaskId((currentId) => currentId + 1);
    setNewTaskTitle("");
    setIsAddingTask(false);
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
            <View style={styles.taskTitleContainer}>
              <Text
                style={[
                  styles.taskText,
                  task.completed && styles.taskTextCompleted,
                ]}
                numberOfLines={1}
                onTextLayout={(event) => {
                  const width = event.nativeEvent.lines[0]?.width;
                  if (
                    width !== undefined &&
                    taskTitleWidths[task.id] !== width
                  ) {
                    setTaskTitleWidths((currentWidths) => ({
                      ...currentWidths,
                      [task.id]: width,
                    }));
                  }
                }}
              >
                {task.title}
              </Text>
              {task.completed && taskTitleWidths[task.id] !== undefined && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.strikethrough,
                    { width: taskTitleWidths[task.id] },
                  ]}
                />
              )}
            </View>
          </Pressable>
        ))}
        {isAddingTask ? (
          <View style={styles.addTaskForm}>
            <TextInput
              style={styles.taskInput}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="What needs doing?"
              placeholderTextColor="#98A2B3"
              maxLength={80}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={addTask}
              accessibilityLabel="New task title"
            />
            <View style={styles.formActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setNewTaskTitle("");
                  setIsAddingTask(false);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveButton,
                  !newTaskTitle.trim() && styles.saveButtonDisabled,
                ]}
                onPress={addTask}
                disabled={!newTaskTitle.trim()}
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>Add task</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.addTaskButton}
            onPress={() => setIsAddingTask(true)}
            accessibilityRole="button"
          >
            <Text style={styles.addTaskButtonText}>+ Add a task</Text>
          </Pressable>
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
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
  },
  taskTitleContainer: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
  },
  strikethrough: {
    position: "absolute",
    left: 0,
    top: "50%",
    height: 1.5,
    backgroundColor: "#667085",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  addTaskButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 14,
    marginTop: 8,
    padding: 16,
  },
  addTaskButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  addTaskForm: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6E8EC",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  taskInput: {
    color: "#172033",
    fontSize: 16,
    paddingVertical: 10,
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  cancelButton: {
    borderRadius: 10,
    justifyContent: "center",
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#667085",
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    backgroundColor: "#98A2B3",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
