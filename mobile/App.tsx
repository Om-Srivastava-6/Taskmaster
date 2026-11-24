import { StatusBar } from "expo-status-bar";
import { Nunito_400Regular } from "@expo-google-fonts/nunito/400Regular";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { useFonts } from "expo-font";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  Animated,
  Alert,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function SlidingPanel({ children }: PropsWithChildren) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
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
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (!fontsLoaded) {
    return null;
  }

  function animatePanelChange() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

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

  function saveEditedTask(id: number) {
    const title = editedTaskTitle.trim();
    if (!title) {
      return;
    }

    animatePanelChange();
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === id ? { ...task, title } : task)),
    );
    setTaskTitleWidths((currentWidths) => {
      const remainingWidths = { ...currentWidths };
      delete remainingWidths[id];
      return remainingWidths;
    });
    setEditedTaskTitle("");
    setEditingTaskId(null);
  }

  function confirmDeleteTask(id: number, title: string) {
    Alert.alert("Delete task?", `Delete "${title}"?`, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          animatePanelChange();
          setSelectedTaskId(null);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          animatePanelChange();
          setTasks((currentTasks) =>
            currentTasks.filter((task) => task.id !== id),
          );
          setTaskTitleWidths((currentWidths) => {
            const remainingWidths = { ...currentWidths };
            delete remainingWidths[id];
            return remainingWidths;
          });
          setSelectedTaskId(null);
        },
      },
    ]);
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
            <Text style={styles.tagline}>Little steps add up.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today's tasks</Text>

        {tasks.map((task) => (
          <View key={task.id} style={styles.taskItem}>
            <View
              style={[
                styles.taskCard,
                task.completed && styles.taskCardCompleted,
              ]}
            >
              <Pressable
                style={styles.taskToggle}
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
              <Pressable
                style={styles.moreButton}
                onPress={() => {
                  animatePanelChange();
                  setSelectedTaskId((currentId) =>
                    currentId === task.id ? null : task.id,
                  );
                }}
                accessibilityRole="button"
                accessibilityLabel={`More options for ${task.title}`}
              >
                <Text style={styles.moreButtonText}>...</Text>
              </Pressable>
            </View>

            {editingTaskId === task.id ? (
              <SlidingPanel>
                <View style={styles.taskActionPanel}>
                  <TextInput
                    style={styles.taskInput}
                    value={editedTaskTitle}
                    onChangeText={setEditedTaskTitle}
                    placeholder="Task title"
                    placeholderTextColor="#A093A7"
                    maxLength={80}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => saveEditedTask(task.id)}
                    accessibilityLabel="Edit task title"
                  />
                  <View style={styles.formActions}>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => {
                        animatePanelChange();
                        setEditedTaskTitle("");
                        setEditingTaskId(null);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.saveButton,
                        !editedTaskTitle.trim() && styles.saveButtonDisabled,
                      ]}
                      onPress={() => saveEditedTask(task.id)}
                      disabled={!editedTaskTitle.trim()}
                      accessibilityRole="button"
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </Pressable>
                  </View>
                </View>
              </SlidingPanel>
            ) : selectedTaskId === task.id ? (
              <SlidingPanel>
                <View style={styles.taskActionPanel}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      animatePanelChange();
                      setEditedTaskTitle(task.title);
                      setEditingTaskId(task.id);
                      setSelectedTaskId(null);
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.editActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionButton}
                    onPress={() => confirmDeleteTask(task.id, task.title)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </Pressable>
                </View>
              </SlidingPanel>
            ) : null}
          </View>
        ))}
        {isAddingTask ? (
          <View style={styles.addTaskForm}>
            <TextInput
              style={styles.taskInput}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="What needs doing?"
              placeholderTextColor="#A093A7"
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
    backgroundColor: "#FFF9F3",
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
    color: "#352449",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 30,
  },
  date: {
    color: "#85768F",
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    marginTop: 4,
  },
  tagline: {
    color: "#A05D68",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    marginTop: 3,
  },
  sectionTitle: {
    color: "#352449",
    fontFamily: "Nunito_700Bold",
    fontSize: 20,
    marginTop: 32,
    marginBottom: 14,
  },
  taskItem: {
    marginBottom: 10,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EFE5F2",
    paddingRight: 10,
  },
  taskCardCompleted: {
    borderColor: "#D8C5FF",
    backgroundColor: "#FBF7FF",
  },
  taskToggle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#8B5CF6",
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: {
    backgroundColor: "#8B5CF6",
  },
  taskText: {
    color: "#40364A",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
  },
  taskTextCompleted: {
    color: "#7C6A84",
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
    backgroundColor: "#7C6A84",
  },
  checkmark: {
    color: "#FFFFFF",
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    lineHeight: 18,
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: "#F3ECFF",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginLeft: 8,
    width: 36,
  },
  moreButtonText: {
    color: "#7250AC",
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
  },
  taskActionPanel: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE5F2",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    padding: 6,
  },
  actionButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  editActionText: {
    color: "#7C3AED",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  deleteActionText: {
    color: "#E35D6A",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  addTaskButton: {
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    borderRadius: 18,
    marginTop: 8,
    padding: 16,
  },
  addTaskButtonText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  addTaskForm: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EFE5F2",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  taskInput: {
    color: "#352449",
    fontFamily: "Nunito_400Regular",
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
    color: "#85768F",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    backgroundColor: "#C8BDD2",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
});
