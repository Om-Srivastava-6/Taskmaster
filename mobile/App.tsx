import { StatusBar } from "expo-status-bar";
import { Nunito_400Regular } from "@expo-google-fonts/nunito/400Regular";
import { Nunito_600SemiBold } from "@expo-google-fonts/nunito/600SemiBold";
import { Nunito_700Bold } from "@expo-google-fonts/nunito/700Bold";
import { Nunito_800ExtraBold } from "@expo-google-fonts/nunito/800ExtraBold";
import { useFonts } from "expo-font";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { dateFromKey, getDateKey, getMonthGrid } from "./dateUtils";
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

type Confirmation = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
};

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
  const [taskTitleLayouts, setTaskTitleLayouts] = useState<
    Record<number, { width: number; strikeTop: number }>
  >({});
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");
  const [todayKey] = useState(() => getDateKey(new Date()));
  const [activeScreen, setActiveScreen] = useState<"home" | "calendar">(
    "home",
  );
  const screenTransition = useRef(new Animated.Value(1)).current;
  const isScreenTransitioning = useRef(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const [reschedulingTaskId, setReschedulingTaskId] = useState<number | null>(
    null,
  );
  const [rescheduleMonth, setRescheduleMonth] = useState(displayedMonth);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

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

  const today = dateFromKey(todayKey).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (!fontsLoaded) {
    return null;
  }

  const theme = pastelRainbowTheme;
  const styles = createStyles(theme.colors);
  const activeDate = activeScreen === "home" ? todayKey : selectedDate;
  const visibleTasks = tasks.filter((task) => task.dueDate === activeDate);
  const completedTaskCount = visibleTasks.filter(
    (task) => task.completed,
  ).length;
  const progressPercent =
    visibleTasks.length === 0
      ? 0
      : (completedTaskCount / visibleTasks.length) * 100;
  const progressMessage =
    visibleTasks.length === 0
      ? "Add a task to get started."
      : completedTaskCount === visibleTasks.length
        ? "All done! You did it. Go celebrate!"
        : completedTaskCount === 0
          ? "Let's get one small win on the board."
          : completedTaskCount === 1
            ? "One down! You're off to a lovely start."
            : `${completedTaskCount} down - you're on a roll!`;
  const tasksByDate = tasks.reduce<Record<string, number>>((counts, task) => {
    counts[task.dueDate] = (counts[task.dueDate] ?? 0) + 1;
    return counts;
  }, {});
  const monthDays = getMonthGrid(displayedMonth);
  const rescheduleDays = getMonthGrid(rescheduleMonth);
  const reschedulingTask = tasks.find(
    (task) => task.id === reschedulingTaskId,
  );
  const selectedDateLabel = dateFromKey(selectedDate).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" },
  );

  function animatePanelChange() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }

  function toggleScreen() {
    if (isScreenTransitioning.current) {
      return;
    }

    isScreenTransitioning.current = true;
    setIsAddingTask(false);
    setNewTaskTitle("");
    setSelectedTaskId(null);
    setEditingTaskId(null);
    setEditedTaskTitle("");

    Animated.timing(screenTransition, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        isScreenTransitioning.current = false;
        return;
      }

      setActiveScreen((currentScreen) =>
        currentScreen === "home" ? "calendar" : "home",
      );
      requestAnimationFrame(() => {
        Animated.timing(screenTransition, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          isScreenTransitioning.current = false;
        });
      });
    });
  }

  function toggleTask(id: number) {
    animatePanelChange();
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

    animatePanelChange();
    setTasks((currentTasks) => [
      ...currentTasks,
      { id: nextTaskId, title, completed: false, dueDate: activeDate },
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
    setConfirmation({
      title: "Reset saved tasks?",
      message: "This removes the saved list and restores the sample tasks.",
      confirmLabel: "Reset",
      onConfirm: () => {
        void resetSavedTasksAndRetry();
      },
    });
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
    setTaskTitleLayouts((currentLayouts) => {
      const remainingLayouts = { ...currentLayouts };
      delete remainingLayouts[id];
      return remainingLayouts;
    });
    setEditedTaskTitle("");
    setEditingTaskId(null);
  }

  function confirmDeleteTask(id: number, title: string) {
    setConfirmation({
      title: "Delete task?",
      message: `Delete "${title}"?`,
      confirmLabel: "Delete",
      onConfirm: () => {
        animatePanelChange();
        setTasks((currentTasks) =>
          currentTasks.filter((task) => task.id !== id),
        );
        setTaskTitleLayouts((currentLayouts) => {
          const remainingLayouts = { ...currentLayouts };
          delete remainingLayouts[id];
          return remainingLayouts;
        });
        setSelectedTaskId(null);
      },
    });
  }

  function changeMonth(offset: number) {
    setDisplayedMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + offset,
          1,
          12,
        ),
    );
  }

  function selectDate(date: Date) {
    animatePanelChange();
    setSelectedDate(getDateKey(date));
    setDisplayedMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }

  function openRescheduleDialog(task: Task) {
    const taskDate = dateFromKey(task.dueDate);
    setReschedulingTaskId(task.id);
    setRescheduleMonth(
      new Date(taskDate.getFullYear(), taskDate.getMonth(), 1, 12),
    );
  }

  function changeRescheduleMonth(offset: number) {
    setRescheduleMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + offset,
          1,
          12,
        ),
    );
  }

  function chooseRescheduleDate(date: Date) {
    if (reschedulingTaskId === null) {
      return;
    }

    const dateKey = getDateKey(date);
    animatePanelChange();
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === reschedulingTaskId
          ? { ...task, dueDate: dateKey }
          : task,
      ),
    );
    setSelectedDate(dateKey);
    setDisplayedMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    setActiveScreen("calendar");
    setSelectedTaskId(null);
    setReschedulingTaskId(null);
  }

  function renderRescheduleDialog() {
    return (
      <Modal
        visible={reschedulingTaskId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReschedulingTaskId(null)}
      >
        <View style={styles.modalOverlay}>
          {reschedulingTask && (
            <SlidingPanel>
              <View style={styles.datePickerDialog}>
                <Text style={styles.confirmTitle}>Move task to a day</Text>
                <Text style={styles.confirmMessage}>
                  {reschedulingTask.title}
                </Text>
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={styles.monthArrow}
                    onPress={() => changeRescheduleMonth(-1)}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                  >
                    <Text style={styles.monthArrowText}>‹</Text>
                  </Pressable>
                  <Text style={styles.monthTitle}>
                    {rescheduleMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <Pressable
                    style={styles.monthArrow}
                    onPress={() => changeRescheduleMonth(1)}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                  >
                    <Text style={styles.monthArrowText}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.weekdaysRow}>
                  {["M", "T", "W", "T", "F", "S", "S"].map(
                    (weekday, index) => (
                      <Text
                        key={`${weekday}-${index}`}
                        style={styles.weekdayLabel}
                      >
                        {weekday}
                      </Text>
                    ),
                  )}
                </View>
                <View style={styles.calendarGrid}>
                  {rescheduleDays.map((date, index) => {
                    if (!date) {
                      return (
                        <View
                          key={`empty-${index}`}
                          style={styles.calendarCell}
                        />
                      );
                    }

                    const dateKey = getDateKey(date);
                    const isTaskDate = dateKey === reschedulingTask.dueDate;
                    return (
                      <View key={dateKey} style={styles.calendarCell}>
                        <Pressable
                          style={[
                            styles.calendarDay,
                            isTaskDate && styles.calendarDaySelected,
                          ]}
                          onPress={() => chooseRescheduleDate(date)}
                          accessibilityRole="button"
                          accessibilityLabel={date.toLocaleDateString(
                            "en-US",
                            { month: "long", day: "numeric" },
                          )}
                          accessibilityState={{ selected: isTaskDate }}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              isTaskDate && styles.calendarDayTextSelected,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.datePickerFooter}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setReschedulingTaskId(null)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </SlidingPanel>
          )}
        </View>
      </Modal>
    );
  }

  function renderConfirmationDialog() {
    return (
      <Modal
        visible={confirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmation(null)}
      >
        <View style={styles.modalOverlay}>
          {confirmation && (
            <SlidingPanel>
              <View style={styles.confirmDialog}>
                <Text style={styles.confirmTitle}>{confirmation.title}</Text>
                <Text style={styles.confirmMessage}>
                  {confirmation.message}
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => setConfirmation(null)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.confirmButton}
                    onPress={() => {
                      if (confirmation) {
                        const confirm = confirmation.onConfirm;
                        setConfirmation(null);
                        confirm();
                      }
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.confirmButtonText}>
                      {confirmation.confirmLabel}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </SlidingPanel>
          )}
        </View>
      </Modal>
    );
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
        {renderConfirmationDialog()}
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.screenTransition,
          {
            opacity: screenTransition,
            transform: [
              {
                translateY: screenTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          key={activeScreen}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {activeScreen === "home" ? "My Tasks" : "Calendar"}
              </Text>
              <Text style={styles.date}>
                {activeScreen === "home" ? today : "Plan your days"}
              </Text>
              <Text style={styles.tagline}>Little steps add up.</Text>
              {storageError && (
                <Text style={styles.storageWarning}>{storageError}</Text>
              )}
            </View>
            <Pressable
              style={styles.headerActionButton}
              onPress={toggleScreen}
              accessibilityRole="button"
              accessibilityLabel={
                activeScreen === "home"
                  ? "Open calendar"
                  : "Return to my tasks"
              }
            >
              <Text style={styles.headerActionText}>
                {activeScreen === "home" ? "Calendar" : "My tasks"}
              </Text>
            </Pressable>
          </View>

          {activeScreen === "calendar" && (
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Pressable
                  style={styles.monthArrow}
                  onPress={() => changeMonth(-1)}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <Text style={styles.monthArrowText}>‹</Text>
                </Pressable>
                <Text style={styles.monthTitle}>
                  {displayedMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Pressable
                  style={styles.monthArrow}
                  onPress={() => changeMonth(1)}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <Text style={styles.monthArrowText}>›</Text>
                </Pressable>
              </View>
              <View style={styles.weekdaysRow}>
                {["M", "T", "W", "T", "F", "S", "S"].map((weekday, index) => (
                  <Text key={`${weekday}-${index}`} style={styles.weekdayLabel}>
                    {weekday}
                  </Text>
                ))}
              </View>
              <View style={styles.calendarGrid}>
                {monthDays.map((date, index) => {
                  if (!date) {
                    return (
                      <View
                        key={`empty-${index}`}
                        style={styles.calendarCell}
                      />
                    );
                  }

                  const dateKey = getDateKey(date);
                  const isSelected = dateKey === selectedDate;
                  const isToday = dateKey === todayKey;
                  const taskCount = tasksByDate[dateKey] ?? 0;

                  return (
                    <View key={dateKey} style={styles.calendarCell}>
                      <Pressable
                        style={[
                          styles.calendarDay,
                          isToday && styles.calendarDayToday,
                          isSelected && styles.calendarDaySelected,
                        ]}
                        onPress={() => selectDate(date)}
                        accessibilityRole="button"
                        accessibilityLabel={`${date.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                        })}${taskCount ? `, ${taskCount} tasks` : ""}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                        {taskCount > 0 && (
                          <View
                            style={[
                              styles.calendarTaskDot,
                              isSelected && styles.calendarTaskDotSelected,
                            ]}
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <View style={styles.calendarFooter}>
                <Text style={styles.calendarHint}>
                  Tap a day to see its tasks
                </Text>
                <Pressable
                  style={styles.todayButton}
                  onPress={() => selectDate(dateFromKey(todayKey))}
                  accessibilityRole="button"
                >
                  <Text style={styles.todayButtonText}>Today</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
              <Text style={styles.progressCount}>
                {completedTaskCount} / {visibleTasks.length}
              </Text>
            </View>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: Math.max(visibleTasks.length, 1),
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

          <Text style={styles.sectionTitle}>
            {activeScreen === "home" || selectedDate === todayKey
              ? "Today's tasks"
              : selectedDateLabel}
          </Text>

          {visibleTasks.map((task, index) => {
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
                          const line = event.nativeEvent.lines[0];
                          if (line) {
                            const layout = {
                              width: line.width,
                              strikeTop: Math.max(
                                0,
                                line.y + line.ascender - line.capHeight / 2,
                              ),
                            };
                            setTaskTitleLayouts((currentLayouts) => {
                              const currentLayout = currentLayouts[task.id];
                              if (
                                currentLayout?.width === layout.width &&
                                currentLayout.strikeTop === layout.strikeTop
                              ) {
                                return currentLayouts;
                              }
                              return { ...currentLayouts, [task.id]: layout };
                            });
                          }
                        }}
                      >
                        {task.title}
                      </Text>
                      {task.completed &&
                        taskTitleLayouts[task.id] !== undefined && (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.strikethrough,
                              {
                                width: taskTitleLayouts[task.id].width,
                                top: taskTitleLayouts[task.id].strikeTop,
                              },
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
                        onPress={() => openRescheduleDialog(task)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.editActionText}>Reschedule</Text>
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
          {visibleTasks.length === 0 && (
            <Text style={styles.emptyAgenda}>
              Nothing planned for this day yet.
            </Text>
          )}
          {isAddingTask ? (
            <SlidingPanel>
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
                      animatePanelChange();
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
            </SlidingPanel>
          ) : (
            <Pressable
              style={styles.addTaskButton}
              onPress={() => {
                animatePanelChange();
                setIsAddingTask(true);
              }}
              accessibilityRole="button"
            >
              <Text style={styles.addTaskButtonText}>+ Add a task</Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
      {renderConfirmationDialog()}
      {renderRescheduleDialog()}
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
    </View>
  );
}

const createStyles = (colors: AppTheme["colors"]) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenTransition: {
    flex: 1,
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
  headerActionButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    justifyContent: "center",
    marginLeft: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerActionText: {
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
    fontSize: 14,
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 22,
    padding: 14,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthTitle: {
    color: colors.text,
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
  },
  monthArrow: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  monthArrowText: {
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
    fontSize: 28,
    lineHeight: 32,
  },
  weekdaysRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayLabel: {
    color: colors.mutedText,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
    textAlign: "center",
    width: "14.2857%",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    alignItems: "center",
    paddingVertical: 2,
    width: "14.2857%",
  },
  calendarDay: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 17,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 32,
  },
  calendarDayToday: {
    borderColor: colors.primary,
  },
  calendarDaySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  calendarDayText: {
    color: colors.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
  },
  calendarDayTextSelected: {
    color: colors.primaryText,
    fontFamily: "Nunito_800ExtraBold",
  },
  calendarTaskDot: {
    backgroundColor: colors.primary,
    borderRadius: 2,
    bottom: 3,
    height: 4,
    position: "absolute",
    width: 4,
  },
  calendarTaskDotSelected: {
    backgroundColor: colors.primaryText,
  },
  calendarFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  calendarHint: {
    color: colors.mutedText,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
  },
  todayButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  todayButtonText: {
    color: colors.primary,
    fontFamily: "Nunito_700Bold",
    fontSize: 12,
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
  emptyAgenda: {
    color: colors.mutedText,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    marginBottom: 12,
    textAlign: "center",
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
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(35, 29, 45, 0.42)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  confirmDialog: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 420,
    padding: 22,
    width: "100%",
  },
  datePickerDialog: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    maxWidth: 420,
    padding: 16,
    width: "100%",
  },
  datePickerFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  confirmTitle: {
    color: colors.text,
    fontFamily: "Nunito_800ExtraBold",
    fontSize: 21,
  },
  confirmMessage: {
    color: colors.mutedText,
    fontFamily: "Nunito_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  confirmActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: 10,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmButtonText: {
    color: colors.primaryText,
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
});
