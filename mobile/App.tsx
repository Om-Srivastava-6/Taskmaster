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
import {
  loadTasks,
  resetSavedTasks,
  saveTasks,
  type Task,
} from "./taskStorage";
import { pastelRainbowTheme, type AppTheme } from "./theme";

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

function getStorageErrorDetails(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected storage error.";
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextTaskId, setNextTaskId] = useState(3);
  const [storageStatus, setStorageStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [taskTitleWidths, setTaskTitleWidths] = useState<Record<number, number>>(
    {},
  );
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function restoreTasks() {
      try {
        const loadedTasks = await loadTasks();
        if (cancelled) {
          return;
        }

        setTasks(loadedTasks);
        setNextTaskId(
          loadedTasks.reduce(
            (largestId, task) => Math.max(largestId, task.id),
            0,
          ) + 1,
        );
        setStorageError(null);
        setStorageStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setStorageError(
          `Couldn't load saved tasks: ${getStorageErrorDetails(error)}`,
        );
        setStorageStatus("error");
      }
    }

    void restoreTasks();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (storageStatus !== "ready") {
      return;
    }

    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await saveTasks(tasks);
        setStorageError(null);
      } catch (error) {
        setStorageError(
          `Couldn't save task changes: ${getStorageErrorDetails(error)}`,
        );
      }
    });
  }, [storageStatus, tasks]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (!fontsLoaded) {
    return null;
  }

  const theme = pastelRainbowTheme;
  const styles = createStyles(theme.colors);
  const completedTaskCount = tasks.filter((task) => task.completed).length;
  const progressPercent =
    tasks.length === 0 ? 0 : (completedTaskCount / tasks.length) * 100;
  const progressMessage =
    tasks.length === 0
      ? "Add a task to get started."
      : completedTaskCount === tasks.length
        ? "All done! You did it. Go celebrate!"
        : completedTaskCount === 0
          ? "Let's get one small win on the board."
          : completedTaskCount === 1
            ? "One down! You're off to a lovely start."
            : `${completedTaskCount} down - you're on a roll!`;

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

  function retryTaskLoad() {
    setStorageError(null);
    setStorageStatus("loading");
    setLoadAttempt((attempt) => attempt + 1);
  }

  async function resetSavedTasksAndRetry() {
    try {
      await resetSavedTasks();
      retryTaskLoad();
    } catch (error) {
      setStorageError(
        `Couldn't reset saved tasks: ${getStorageErrorDetails(error)}`,
      );
    }
  }

  function confirmResetSavedTasks() {
    Alert.alert(
      "Reset saved tasks?",
      "This removes the saved list and restores the sample tasks.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void resetSavedTasksAndRetry();
          },
        },
      ],
    );
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

  if (storageStatus === "loading") {
    return (
      <View style={[styles.container, styles.storageScreen]}>
        <Text style={styles.title}>Getting your tasks ready...</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  if (storageStatus === "error") {
    return (
      <View style={[styles.container, styles.storageScreen]}>
        <Text style={styles.title}>Couldn't open your tasks</Text>
        <Text style={styles.storageMessage}>{storageError}</Text>
        <Pressable
          style={styles.addTaskButton}
          onPress={retryTaskLoad}
          accessibilityRole="button"
        >
          <Text style={styles.addTaskButtonText}>Try again</Text>
        </Pressable>
        <Pressable
          style={styles.resetStorageButton}
          onPress={confirmResetSavedTasks}
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>Reset saved tasks</Text>
        </Pressable>
        <StatusBar style="dark" />
      </View>
    );
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
            {storageError && (
              <Text style={styles.storageWarning}>{storageError}</Text>
            )}
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
            <Text style={styles.progressCount}>
              {completedTaskCount} / {tasks.length}
            </Text>
          </View>
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: Math.max(tasks.length, 1),
              now: completedTaskCount,
            }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressMessage}>{progressMessage}</Text>
        </View>

        <Text style={styles.sectionTitle}>Today's tasks</Text>

        {tasks.map((task, index) => {
          const taskAccent = theme.taskAccents[index % theme.taskAccents.length];

          return (
            <View key={task.id} style={styles.taskItem}>
              <View
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: taskAccent.surface,
                    borderColor: taskAccent.border,
                  },
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
                      { borderColor: taskAccent.accent },
                      task.completed && {
                        backgroundColor: taskAccent.accent,
                      },
                    ]}
                  >
                    {task.completed && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
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
                    {task.completed &&
                      taskTitleWidths[task.id] !== undefined && (
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
                      placeholderTextColor={theme.colors.placeholder}
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
                          !editedTaskTitle.trim() &&
                            styles.saveButtonDisabled,
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
          );
        })}
        {isAddingTask ? (
          <View style={styles.addTaskForm}>
            <TextInput
              style={styles.taskInput}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder="What needs doing?"
              placeholderTextColor={theme.colors.placeholder}
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
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </View>
  );
}

const createStyles = (colors: AppTheme["colors"]) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
  },
  storageScreen: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  storageMessage: {
    color: colors.mutedText,
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  storageWarning: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.danger,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    marginTop: 12,
    padding: 12,
  },
  resetStorageButton: {
    alignItems: "center",
    borderRadius: 10,
    marginTop: 8,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 24,
    padding: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    color: colors.mutedText,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    letterSpacing: 0.8,
  },
  progressCount: {
    color: colors.primary,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 24,
  },
  progressTrack: {
    backgroundColor: colors.primarySoft,
    borderRadius: 5,
    height: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 5,
    height: "100%",
  },
  progressMessage: {
    color: colors.mutedText,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    marginTop: 8,
  },
  title: {
    color: colors.text,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 30,
  },
  date: {
    color: colors.mutedText,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    marginTop: 4,
  },
  tagline: {
    color: colors.danger,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    marginTop: 3,
  },
  sectionTitle: {
    color: colors.text,
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
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 10,
  },
  taskCardCompleted: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
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
    borderColor: colors.primary,
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  taskText: {
    color: colors.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
  },
  taskTextCompleted: {
    color: colors.mutedText,
  },
  taskTitleContainer: {
    flex: 1,
    justifyContent: "center",
    position: "relative",
  },
  strikethrough: {
    position: "absolute",
    left: 0,
    top: "40%",
    height: 1.5,
    backgroundColor: colors.strikethrough,
  },
  checkmark: {
    color: colors.text,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 14,
    lineHeight: 18,
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginLeft: 8,
    width: 36,
  },
  moreButtonText: {
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
  },
  taskActionPanel: {
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: colors.surface,
    borderColor: colors.border,
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
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  deleteActionText: {
    color: colors.danger,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  addTaskButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    marginTop: 8,
    padding: 16,
  },
  addTaskButtonText: {
    color: colors.primaryText,
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  addTaskForm: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  taskInput: {
    color: colors.text,
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
    color: colors.mutedText,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  saveButtonText: {
    color: colors.primaryText,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
});
