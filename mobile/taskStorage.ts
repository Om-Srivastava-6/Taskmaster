import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDateKey, isDateKey } from "./dateUtils";

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  dueDate: string;
  priority: TaskPriority;
};

export type TaskPriority = "low" | "normal" | "high";

type StoredTask = Omit<Task, "dueDate" | "priority"> & {
  dueDate?: string;
  priority?: TaskPriority;
};

const STORAGE_KEY = "@taskmaster/tasks/v1";
const today = getDateKey(new Date());

export const initialTasks: Task[] = [
  {
    id: 1,
    title: "Write down a task",
    completed: false,
    dueDate: today,
    priority: "normal",
  },
  {
    id: 2,
    title: "Take a break",
    completed: false,
    dueDate: today,
    priority: "normal",
  },
];

export async function loadTasks(): Promise<Task[]> {
  const savedTasks = await AsyncStorage.getItem(STORAGE_KEY);
  if (savedTasks === null) {
    return initialTasks.map((task) => ({ ...task }));
  }

  const parsed: unknown = JSON.parse(savedTasks);
  if (!Array.isArray(parsed)) {
    throw new Error("Saved task data must be a list.");
  }

  const tasks = parsed.filter(isStoredTask);
  if (tasks.length !== parsed.length) {
    throw new Error("Saved task data contains an invalid task.");
  }

  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
    throw new Error("Saved task data contains duplicate task IDs.");
  }

  return tasks.map((task) => ({
    ...task,
    dueDate: task.dueDate ?? today,
    priority: task.priority ?? "normal",
  }));
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function resetSavedTasks(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

function isStoredTask(value: unknown): value is StoredTask {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    "title" in value &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    "completed" in value &&
    typeof value.completed === "boolean" &&
    (!("dueDate" in value) || isDateKey(value.dueDate)) &&
    (!("priority" in value) || isTaskPriority(value.priority))
  );
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === "low" || value === "normal" || value === "high";
}
