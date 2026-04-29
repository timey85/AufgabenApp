import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  useColorScheme,
  Platform,
  Switch,
  Alert,
  ScrollView
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

const TASKS_KEY = "TASKS";
const SETTINGS_KEY = "REMINDER_SETTINGS";
const LOGS_KEY = "DEBUG_LOGS";

const defaultSettings = {
  reminder1Enabled: true,
  reminder1DaysBefore: 1,
  reminder1Time: "08:30",
  reminder2Enabled: true,
  reminder2HoursBefore: 2,
  debugLoggingEnabled: false
};

export default function App() {
  const isDark = useColorScheme() === "dark";

  const bg = isDark ? "#4d4c4c" : "#f5f7fa";
  const cardBg = isDark ? "#3a3a3a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#000000";
  const subTextColor = isDark ? "#d0d0d0" : "#555555";
  const inputBorder = isDark ? "#666666" : "#d8dee6";

  const [tasks, setTasks] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsDraft, setSettingsDraft] = useState(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsOpen, setLogsOpen] = useState(false);

  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [hasTime, setHasTime] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const nowStamp = () => {
    const now = new Date();
    const date = now.toLocaleDateString("de-DE");
    const time = now.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    return `${date} ${time}`;
  };

  const loadLogs = async () => {
    try {
      const data = await AsyncStorage.getItem(LOGS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.log("Fehler beim Laden der Logs:", error);
      return [];
    }
  };

  const saveLogs = async (nextLogs) => {
    try {
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(nextLogs));
    } catch (error) {
      console.log("Fehler beim Speichern der Logs:", error);
    }
  };

  const addLog = async (message, force = false) => {
    const enabled = force || settings.debugLoggingEnabled || settingsDraft.debugLoggingEnabled;

    if (!enabled) return;

    const entry = `[${nowStamp()}] ${message}`;
    console.log(entry);

    const nextLogs = [entry, ...logs].slice(0, 200);
    setLogs(nextLogs);
    await saveLogs(nextLogs);
  };

  const clearLogs = async () => {
    setLogs([]);
    try {
      await AsyncStorage.removeItem(LOGS_KEY);
    } catch (error) {
      console.log("Fehler beim Löschen der Logs:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const loadedLogs = await loadLogs();
      setLogs(loadedLogs);

      await setupNotifications();

      const loadedSettings = await loadSettings();
      const loadedTasks = await loadTasks();

      const restoredTasks = await restoreScheduledNotifications(
        loadedTasks,
        loadedSettings
      );

      setSettings(loadedSettings);
      setSettingsDraft(loadedSettings);
      setTasks(restoredTasks);

      setIsReady(true);

      if (loadedSettings.debugLoggingEnabled) {
        const initLogs = [`[${nowStamp()}] App gestartet`, ...loadedLogs].slice(0, 200);
        setLogs(initLogs);
        await saveLogs(initLogs);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (tasks === null) return;

    saveTasks();
  }, [tasks, isReady]);

  const setupNotifications = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Keine Berechtigung für Benachrichtigungen");
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default"
      });
    }
  };

  const loadTasks = async () => {
    try {
      const data = await AsyncStorage.getItem(TASKS_KEY);
      const loaded = data ? JSON.parse(data) : [];
      await addLog(`Aufgaben geladen: ${loaded.length}`, true);
      return loaded;
    } catch (error) {
      console.log("Fehler beim Laden der Aufgaben:", error);
      return [];
    }
  };

  const saveTasks = async () => {
    try {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      await addLog(`Aufgaben gespeichert: ${tasks.length}`);
    } catch (error) {
      console.log("Fehler beim Speichern der Aufgaben:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (!data) return defaultSettings;

      return {
        ...defaultSettings,
        ...JSON.parse(data)
      };
    } catch (error) {
      console.log("Fehler beim Laden der Einstellungen:", error);
      return defaultSettings;
    }
  };

  const saveSettingsToStorage = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.log("Fehler beim Speichern der Einstellungen:", error);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDateTime = (date) => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const isValidTimeString = (value) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  };

  const parseTimeString = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return { hours, minutes };
  };

  const buildDateWithTime = (baseDate, timeSource) => {
    const result = new Date(baseDate);
    result.setHours(
      timeSource.getHours(),
      timeSource.getMinutes(),
      0,
      0
    );
    return result;
  };

  const getInitialDueDate = () => {
    const initial = new Date();
    initial.setSeconds(0, 0);
    initial.setHours(10, 0, 0, 0);
    return initial;
  };

  const getDueDateForCalculation = (selectedDate, itemHasTime = true) => {
    const due = new Date(selectedDate);

    if (!itemHasTime) {
      due.setHours(12, 0, 0, 0);
    }

    return due;
  };

  const getReminder1Title = (daysBefore) => {
    if (daysBefore === 1) return "Aufgabe in einem Tag fällig";
    return `Aufgabe in ${daysBefore} Tagen fällig`;
  };

  const getReminder2Title = (hoursBefore) => {
    if (hoursBefore === 1) return "Aufgabe in einer Stunde fällig";
    return `Aufgabe in ${hoursBefore} Stunden fällig`;
  };

  const buildReminderEntries = (selectedDate, reminderSettings, itemHasTime = true) => {
    const due = getDueDateForCalculation(selectedDate, itemHasTime);
    const reminderEntries = [];

    if (reminderSettings.reminder1Enabled) {
      const firstReminder = new Date(due);
      const daysBefore = Number(reminderSettings.reminder1DaysBefore || 0);

      firstReminder.setDate(firstReminder.getDate() - daysBefore);

      const timeString = reminderSettings.reminder1Time || "08:30";
      if (isValidTimeString(timeString)) {
        const { hours, minutes } = parseTimeString(timeString);
        firstReminder.setHours(hours, minutes, 0, 0);

        reminderEntries.push({
          date: firstReminder,
          title: getReminder1Title(daysBefore)
        });
      }
    }

    if (reminderSettings.reminder2Enabled && itemHasTime) {
      const secondReminder = new Date(due);
      const hoursBefore = Number(reminderSettings.reminder2HoursBefore || 0);

      secondReminder.setTime(
        secondReminder.getTime() - hoursBefore * 60 * 60 * 1000
      );

      reminderEntries.push({
        date: secondReminder,
        title: getReminder2Title(hoursBefore)
      });
    }
    
    return reminderEntries.filter((entry) => entry.date.getTime() > Date.now());
  };

  const restoreScheduledNotifications = async (taskList, reminderSettings) => {
    const updatedTasks = [];
  
    await addLog("Stelle geplante Benachrichtigungen wieder her", true);
  
    for (const task of taskList) {
      if (task.notificationIds?.length) {
        await cancelTaskNotifications(task.notificationIds);
      }
  
      let newNotificationIds = [];
  
      if (!task.done && task.dueDateRaw) {
        newNotificationIds = await scheduleNotificationsForTask(
          task.text,
          new Date(task.dueDateRaw),
          reminderSettings,
          task.hasTime !== false
        );
      }
  
      updatedTasks.push({
        ...task,
        notificationIds: newNotificationIds
      });
    }
  
    return updatedTasks;
  };
  
  const scheduleNotificationsForTask = async (
    taskText,
    selectedDate,
    reminderSettings,
    itemHasTime = true
  ) => {
    const reminderEntries = buildReminderEntries(
      selectedDate,
      reminderSettings,
      itemHasTime
    );
    const notificationIds = [];

    await addLog(
      `Reminder-Einstellungen für "${taskText}": r1=${reminderSettings.reminder1Enabled}, tage=${reminderSettings.reminder1DaysBefore}, zeit=${reminderSettings.reminder1Time}, r2=${reminderSettings.reminder2Enabled}, stunden=${reminderSettings.reminder2HoursBefore}, hasTime=${itemHasTime}`,
      true
    );
    
    if (reminderEntries.length === 0) {
      await addLog(
        `Es wurden keine zukünftigen reminderEntries erzeugt für "${taskText}"`,
        true
      );
    } else {
      for (const entry of reminderEntries) {
        await addLog(
          `ReminderEntry erzeugt: "${entry.title}" für "${taskText}" am ${formatDateTime(entry.date)}`,
          true
        );
      }
    }

    await addLog(
      `Plane Benachrichtigungen für "${taskText}" (${itemHasTime ? "mit Uhrzeit" : "ohne Uhrzeit"})`,
      true
    );

    for (const entry of reminderEntries) {
      try {
        await addLog(
          `Versuche zu planen: "${entry.title}" für "${taskText}" am ${formatDateTime(entry.date)}`,
          true
        );
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: entry.title,
            body: taskText,
            sound: true
          },
          trigger: entry.date
        });

        notificationIds.push(id);
        await addLog(
          `Geplant: "${entry.title}" für "${taskText}" am ${formatDateTime(entry.date)}`,
          true
        );
      } catch (error) {
        const errorMessage =
          error?.message ||
          error?.toString?.() ||
          JSON.stringify(error);
      
        console.log("Fehler beim Planen einer Benachrichtigung:", error);
        await addLog(`Fehler beim Planen für "${taskText}": ${errorMessage}`, true);
      }
    }

    if (reminderEntries.length === 0) {
      await addLog(`Keine zukünftigen Erinnerungen für "${taskText}" planbar`);
    }

    return notificationIds;
  };

  const cancelTaskNotifications = async (notificationIds = []) => {
    for (const id of notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
        await addLog(`Benachrichtigung gelöscht: ${id}`);
      } catch (error) {
        console.log("Fehler beim Löschen einer Benachrichtigung:", error);
      }
    }
  };

  const addTask = async () => {
    if (!text.trim()) return;

    let notificationIds = [];
    let dueDateRaw = null;
    let dueDateLabel = null;
    let dueTimeLabel = null;

    if (dueDate) {
      dueDateRaw = dueDate.toISOString();
      dueDateLabel = formatDate(dueDate);
      dueTimeLabel = hasTime ? formatTime(dueDate) : null;

      notificationIds = await scheduleNotificationsForTask(
        text.trim(),
        dueDate,
        settings,
        hasTime
      );
    }

    const newTask = {
      id: Date.now().toString(),
      text: text.trim(),
      done: false,
      priority,
      category: category.trim(),
      hasTime,
      dueDate: dueDateLabel,
      dueTime: dueTimeLabel,
      dueDateRaw,
      notificationIds
    };

    setTasks((prev) => [...prev, newTask]);

    await addLog(
      `Aufgabe erstellt: "${newTask.text}"${dueDate ? `, fällig ${hasTime ? formatDateTime(dueDate) : formatDate(dueDate)}` : ""}`
    );

    setText("");
    setCategory("");
    setPriority("normal");
    setDueDate(null);
    setHasTime(false);
  };

  const toggleTask = async (id) => {
    if (!tasks) return;

    const currentTask = tasks.find((t) => t.id === id);
    if (!currentTask) return;

    const newDoneValue = !currentTask.done;

    if (newDoneValue && currentTask.notificationIds?.length) {
      await cancelTaskNotifications(currentTask.notificationIds);
    }

    let newNotificationIds = currentTask.notificationIds || [];

    if (!newDoneValue && currentTask.dueDateRaw) {
      newNotificationIds = await scheduleNotificationsForTask(
        currentTask.text,
        new Date(currentTask.dueDateRaw),
        settings,
        currentTask.hasTime !== false
      );
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              done: newDoneValue,
              notificationIds: newDoneValue ? [] : newNotificationIds
            }
          : t
      )
    );

    await addLog(
      `Aufgabe ${newDoneValue ? "erledigt" : "reaktiviert"}: "${currentTask.text}"`
    );
  };

  const deleteTask = async (id) => {
    if (!tasks) return;

    const taskToDelete = tasks.find((t) => t.id === id);

    if (taskToDelete?.notificationIds?.length) {
      await cancelTaskNotifications(taskToDelete.notificationIds);
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (taskToDelete) {
      await addLog(`Aufgabe gelöscht: "${taskToDelete.text}"`);
    }
  };

  const moveUp = async (id) => {
    if (!tasks) return;
  
    const currentIndex = tasks.findIndex((t) => t.id === id);
    if (currentIndex <= 0) return;
  
    const currentTask = tasks[currentIndex];
    const currentCategory = currentTask.category || "";
  
    let previousSameCategoryIndex = -1;
  
    for (let i = currentIndex - 1; i >= 0; i--) {
      const taskCategory = tasks[i].category || "";
  
      if (taskCategory === currentCategory) {
        previousSameCategoryIndex = i;
        break;
      }
    }
  
    if (previousSameCategoryIndex === -1) return;
  
    const newTasks = [...tasks];
  
    [newTasks[previousSameCategoryIndex], newTasks[currentIndex]] = [
      newTasks[currentIndex],
      newTasks[previousSameCategoryIndex]
    ];
  
    setTasks(newTasks);
  
    await addLog(`Aufgabe innerhalb der Kategorie nach oben verschoben: ${id}`);
  };

  const rescheduleAllTasks = async (newSettings) => {
    if (!tasks) return;

    const updatedTasks = [];

    for (const task of tasks) {
      if (task.notificationIds?.length) {
        await cancelTaskNotifications(task.notificationIds);
      }

      let newNotificationIds = [];

      if (!task.done && task.dueDateRaw) {
        newNotificationIds = await scheduleNotificationsForTask(
          task.text,
          new Date(task.dueDateRaw),
          newSettings,
          task.hasTime !== false
        );
      }

      updatedTasks.push({
        ...task,
        notificationIds: newNotificationIds
      });
    }

    setTasks(updatedTasks);
    await addLog("Alle Aufgaben neu terminiert");
  };

  const saveReminderSettings = async () => {
    const normalizedSettings = {
      ...settingsDraft,
      reminder1DaysBefore: Number(settingsDraft.reminder1DaysBefore || 0),
      reminder2HoursBefore: Number(settingsDraft.reminder2HoursBefore || 0)
    };

    if (
      normalizedSettings.reminder1Enabled &&
      !isValidTimeString(normalizedSettings.reminder1Time)
    ) {
      Alert.alert("Ungültige Uhrzeit", "Bitte gib die Uhrzeit im Format HH:MM ein.");
      return;
    }

    if (normalizedSettings.reminder1DaysBefore < 0) {
      Alert.alert("Ungültiger Wert", "Tage vorher dürfen nicht negativ sein.");
      return;
    }

    if (normalizedSettings.reminder2HoursBefore < 0) {
      Alert.alert("Ungültiger Wert", "Stunden vorher dürfen nicht negativ sein.");
      return;
    }

    await saveSettingsToStorage(normalizedSettings);
    setSettings(normalizedSettings);
    setSettingsDraft(normalizedSettings);
    await rescheduleAllTasks(normalizedSettings);
    setSettingsOpen(false);

    await addLog("Einstellungen gespeichert", true);
    Alert.alert("Gespeichert", "Die Erinnerungen wurden für alle Aufgaben aktualisiert.");
  };

  const getColor = (taskPriority) => {
    switch (taskPriority) {
      case "high":
        return "#ff6b6b";
      case "low":
        return "#6bcB77";
      default:
        return "#4d96ff";
    }
  };

  const uniqueCategories = tasks
    ? [...new Set(tasks.map((t) => t.category).filter(Boolean))]
    : [];

  const groupedTasks = () => {
    if (!tasks) return [];

    const groups = {};

    tasks.forEach((task) => {
      const key = task.category || "";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.entries(groups);
  };

  const renderTaskDate = (item) => {
    if (!item.dueDateRaw) return null;

    const date = new Date(item.dueDateRaw);

    if (item.hasTime === false) {
      return formatDate(date);
    }

    return formatDateTime(date);
  };

  const renderTaskItem = (item) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderLeftColor: getColor(item.priority)
        }
      ]}
    >
      <TouchableOpacity onPress={() => toggleTask(item.id)}>
        <Text style={[styles.cardIcon, { color: textColor }]}>
          {item.done ? "☑" : "☐"}
        </Text>
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <Text style={[styles.text, item.done && styles.done, { color: textColor }]}>
          {item.text}
        </Text>
      </View>

      {item.dueDateRaw && (
        <View style={styles.dateWrap}>
          <Text style={[styles.taskMeta, { color: subTextColor }]}>
            {renderTaskDate(item)}
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={() => moveUp(item.id)}>
        <Text style={[styles.cardIcon, { color: textColor }]}>⬆</Text>
      </TouchableOpacity>

      {item.done && (
        <TouchableOpacity onPress={() => deleteTask(item.id)}>
          <Text style={styles.cardIcon}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!isReady || tasks === null) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: textColor }}>Lade Aufgaben...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Aufgaben</Text>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            setSettingsDraft(settings);
            setSettingsOpen((prev) => !prev);
          }}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {settingsOpen && (
        <ScrollView
          style={[styles.settingsPanel, { backgroundColor: cardBg }]}
          contentContainerStyle={styles.settingsPanelContent}
        >
          <Text style={[styles.settingsTitle, { color: textColor }]}>
            Erinnerungen
          </Text>

          <Text style={[styles.settingsInfo, { color: subTextColor }]}>
            Diese Einstellungen gelten für alle Aufgaben mit Fälligkeitsdatum.
          </Text>

          <View style={styles.settingBlock}>
            <View style={styles.settingHeaderRow}>
              <Text style={[styles.settingLabel, { color: textColor }]}>
                Erinnerung 1 aktiv
              </Text>
              <Switch
                value={settingsDraft.reminder1Enabled}
                onValueChange={(value) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    reminder1Enabled: value
                  }))
                }
              />
            </View>

            <Text style={[styles.inlineLabel, { color: subTextColor }]}>
              Tage vorher
            </Text>
            <TextInput
              value={String(settingsDraft.reminder1DaysBefore)}
              onChangeText={(value) =>
                setSettingsDraft((prev) => ({
                  ...prev,
                  reminder1DaysBefore: value.replace(/[^0-9]/g, "")
                }))
              }
              keyboardType="numeric"
              style={[
                styles.settingsInput,
                {
                  backgroundColor: bg,
                  color: textColor,
                  borderColor: inputBorder
                }
              ]}
            />

            <Text style={[styles.inlineLabel, { color: subTextColor }]}>
              Uhrzeit (HH:MM)
            </Text>
            <TextInput
              value={settingsDraft.reminder1Time}
              onChangeText={(value) =>
                setSettingsDraft((prev) => ({
                  ...prev,
                  reminder1Time: value
                }))
              }
              placeholder="08:30"
              placeholderTextColor="#999"
              style={[
                styles.settingsInput,
                {
                  backgroundColor: bg,
                  color: textColor,
                  borderColor: inputBorder
                }
              ]}
            />
          </View>

          <View style={styles.settingBlock}>
            <View style={styles.settingHeaderRow}>
              <Text style={[styles.settingLabel, { color: textColor }]}>
                Erinnerung 2 aktiv
              </Text>
              <Switch
                value={settingsDraft.reminder2Enabled}
                onValueChange={(value) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    reminder2Enabled: value
                  }))
                }
              />
            </View>

            <Text style={[styles.inlineLabel, { color: subTextColor }]}>
              Stunden vorher
            </Text>
            <TextInput
              value={String(settingsDraft.reminder2HoursBefore)}
              onChangeText={(value) =>
                setSettingsDraft((prev) => ({
                  ...prev,
                  reminder2HoursBefore: value.replace(/[^0-9]/g, "")
                }))
              }
              keyboardType="numeric"
              style={[
                styles.settingsInput,
                {
                  backgroundColor: bg,
                  color: textColor,
                  borderColor: inputBorder
                }
              ]}
            />
          </View>

          <View style={styles.settingBlock}>
            <View style={styles.settingHeaderRow}>
              <Text style={[styles.settingLabel, { color: textColor }]}>
                Debug-Logging aktiv
              </Text>
              <Switch
                value={settingsDraft.debugLoggingEnabled}
                onValueChange={(value) =>
                  setSettingsDraft((prev) => ({
                    ...prev,
                    debugLoggingEnabled: value
                  }))
                }
              />
            </View>

            <View style={styles.logButtonsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setLogsOpen((prev) => !prev)}
              >
                <Text style={styles.secondaryBtnText}>
                  {logsOpen ? "Logs ausblenden" : "Logs anzeigen"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={clearLogs}
              >
                <Text style={styles.secondaryBtnText}>Logs löschen</Text>
              </TouchableOpacity>
            </View>

            {logsOpen && (
              <View style={[styles.logBox, { backgroundColor: bg, borderColor: inputBorder }]}>
                <ScrollView
                  style={styles.logScroll}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {logs.length === 0 ? (
                    <Text style={{ color: subTextColor }}>Keine Logs vorhanden</Text>
                  ) : (
                    logs.map((entry, index) => (
                      <Text key={`${entry}-${index}`} style={[styles.logText, { color: textColor }]}>
                        {entry}
                      </Text>
                    ))
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.settingsActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: "#4d96ff" }]}
              onPress={() => {
                setSettingsDraft(settings);
                setSettingsOpen(false);
              }}
            >
              <Text style={[styles.secondaryBtnText, { color: "#4d96ff" }]}>
                Abbrechen
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={saveReminderSettings}
            >
              <Text style={styles.primaryBtnText}>Speichern</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Neue Aufgabe"
          placeholderTextColor="#aaa"
          style={[
            styles.input,
            { backgroundColor: cardBg, color: textColor }
          ]}
        />

        <TouchableOpacity style={styles.addBtn} onPress={addTask}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      {text.length > 0 && (
        <>
          <View style={styles.categoryRow}>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Kategorie"
              placeholderTextColor="#aaa"
              style={[
                styles.categoryInput,
                { backgroundColor: cardBg, color: textColor }
              ]}
            />

            <TouchableOpacity onPress={() => setPriority("low")}>
              <Text style={styles.icon}>🟢</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPriority("normal")}>
              <Text style={styles.icon}>🔵</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPriority("high")}>
              <Text style={styles.icon}>🔴</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <View style={[styles.dateButton, { backgroundColor: cardBg }]}>
                <Text style={[styles.dateButtonText, { color: textColor }]}>
                  {dueDate ? `📅 ${formatDate(dueDate)}` : "📅 Datum"}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (!dueDate) {
                  setDueDate(getInitialDueDate());
                }
                setHasTime((prev) => !prev);
              }}
            >
              <View style={[styles.timeButton, { backgroundColor: cardBg }]}>
                <Text style={[styles.dateButtonText, { color: textColor }]}>
                  {hasTime ? "⏰ Uhrzeit an" : "⏰ Uhrzeit aus"}
                </Text>
              </View>
            </TouchableOpacity>

            {hasTime && (
              <TouchableOpacity
                onPress={() => {
                  if (!dueDate) {
                    setDueDate(getInitialDueDate());
                  }
                  setShowTimePicker(true);
                }}
              >
                <View style={[styles.timeButton, { backgroundColor: cardBg }]}>
                  <Text style={[styles.dateButtonText, { color: textColor }]}>
                    {dueDate ? `⏰ ${formatTime(dueDate)}` : "⏰ Uhrzeit"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {uniqueCategories.length > 0 && (
            <View style={styles.dropdown}>
              {uniqueCategories.map((cat) => (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat)}>
                  <View
                    style={[
                      styles.dropdownItem,
                      { backgroundColor: cardBg }
                    ]}
                  >
                    <Text style={[styles.dropdownText, { color: textColor }]}>
                      {cat}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || getInitialDueDate()}
          mode="date"
          is24Hour={true}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);

            if (event.type === "dismissed" || !selectedDate) return;

            const currentTime = dueDate || getInitialDueDate();
            const combinedDate = buildDateWithTime(selectedDate, currentTime);
            setDueDate(combinedDate);
          }}
        />
      )}

      {showTimePicker && hasTime && (
        <DateTimePicker
          value={dueDate || getInitialDueDate()}
          mode="time"
          is24Hour={true}
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);

            if (event.type === "dismissed" || !selectedTime) return;

            const currentDate = dueDate || getInitialDueDate();
            const combinedDate = buildDateWithTime(currentDate, selectedTime);
            setDueDate(combinedDate);
          }}
        />
      )}

      <FlatList
        data={groupedTasks()}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => (
          <View>
            <Text style={[styles.categoryTitle, { color: textColor }]}>
              {item[0]}
            </Text>

            {item[1].map((task) => (
              <View key={task.id}>{renderTaskItem(task)}</View>
            ))}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  header: {
    backgroundColor: "#4d96ff",
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13,
    position: "relative"
  },

  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold"
  },

  settingsButton: {
    position: "absolute",
    right: 12,
    top: 1,
    padding: 4
  },

  settingsButtonText: {
    fontSize: 24
  },

  settingsPanel: {
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 14,
    elevation: 4
  },

  settingsPanelContent: {
    padding: 14
  },

  settingsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4
  },

  settingsInfo: {
    fontSize: 13,
    marginBottom: 14
  },

  settingBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d9d9d9"
  },

  settingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },

  settingLabel: {
    fontSize: 16,
    fontWeight: "600"
  },

  inlineLabel: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 6
  },

  settingsInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42
  },

  settingsActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#4d96ff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10
  },

  secondaryBtnText: {
    fontWeight: "600",
    color: "#4d96ff"
  },

  primaryBtn: {
    backgroundColor: "#4d96ff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },

  primaryBtnText: {
    color: "white",
    fontWeight: "600"
  },

  logButtonsRow: {
    flexDirection: "row",
    marginTop: 8
  },

  logBox: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 10,
    padding: 8,
    maxHeight: 220
  },

  logScroll: {
    maxHeight: 200
  },

  logText: {
    fontSize: 12,
    marginBottom: 6
  },

  inputRow: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center"
  },

  input: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    marginVertical: 5,
    height: 35
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 2
  },

  categoryInput: {
    flex: 1,
    borderRadius: 12,
    height: 35,
    paddingHorizontal: 12,
    textAlignVertical: "center",
    marginRight: 8
  },

  dateRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginTop: 3
  },

  dateButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8
  },

  timeButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8
  },

  dateButtonText: {
    fontSize: 14
  },

  addBtn: {
    marginLeft: 10,
    backgroundColor: "#4d96ff",
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 6
  },

  addText: {
    color: "white",
    fontSize: 20
  },

  dropdown: {
    marginHorizontal: 10,
    borderRadius: 12,
    marginTop: 3,
    elevation: 3,
    overflow: "hidden"
  },

  dropdownItem: {
    paddingVertical: 4,
    paddingHorizontal: 12
  },

  dropdownText: {
    fontSize: 14
  },

  categoryTitle: {
    marginTop: 10,
    marginLeft: 20,
    fontWeight: "bold",
    fontSize: 17
  },

  icon: {
    fontSize: 22,
    marginHorizontal: 4
  },

  cardIcon: {
    fontSize: 20,
    marginHorizontal: 4
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
    marginVertical: 3,
    padding: 1,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 8,
    borderLeftWidth: 6
  },

  taskContent: {
    flex: 1,
    marginLeft: 7
  },

  text: {
    fontSize: 15
  },

  dateWrap: {
    alignItems: "flex-end",
    marginLeft: 8
  },

  taskMeta: {
    fontSize: 12,
    marginRight: 6,
    textAlign: "right"
  },

  done: {
    textDecorationLine: "line-through",
    opacity: 0.5
  }
});
