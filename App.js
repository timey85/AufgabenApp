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

const defaultSettings = {
  reminder1Enabled: true,
  reminder1DaysBefore: 1,
  reminder1Time: "08:30",
  reminder2Enabled: true,
  reminder2HoursBefore: 2
};

export default function App() {
  const isDark = useColorScheme() === "dark";

  const bg = isDark ? "#4d4c4c" : "#f5f7fa";
  const cardBg = isDark ? "#3a3a3a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#000000";
  const subTextColor = isDark ? "#d0d0d0" : "#555555";
  const inputBorder = isDark ? "#666666" : "#d8dee6";

  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsDraft, setSettingsDraft] = useState(defaultSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    saveTasks();
  }, [tasks]);

  const initializeApp = async () => {
    await setupNotifications();

    const loadedSettings = await loadSettings();
    await loadTasks();

    setSettings(loadedSettings);
    setSettingsDraft(loadedSettings);
  };

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
      if (data) {
        setTasks(JSON.parse(data));
      }
    } catch (error) {
      console.log("Fehler beim Laden der Aufgaben:", error);
    }
  };

  const saveTasks = async () => {
    try {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
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

  const isValidTimeString = (value) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  };

  const parseTimeString = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return { hours, minutes };
  };

  const buildReminderDates = (selectedDate, reminderSettings) => {
    const due = new Date(selectedDate);
    const reminderDates = [];

    if (reminderSettings.reminder1Enabled) {
      const firstReminder = new Date(due);
      firstReminder.setDate(
        firstReminder.getDate() - Number(reminderSettings.reminder1DaysBefore || 0)
      );

      const timeString = reminderSettings.reminder1Time || "08:30";
      if (isValidTimeString(timeString)) {
        const { hours, minutes } = parseTimeString(timeString);
        firstReminder.setHours(hours, minutes, 0, 0);
        reminderDates.push(firstReminder);
      }
    }

    if (reminderSettings.reminder2Enabled) {
      const secondReminder = new Date(due);
      secondReminder.setHours(
        secondReminder.getHours() - Number(reminderSettings.reminder2HoursBefore || 0)
      );
      reminderDates.push(secondReminder);
    }

    return reminderDates.filter((date) => date > new Date());
  };

  const scheduleNotificationsForTask = async (taskText, selectedDate, reminderSettings) => {
    const reminderDates = buildReminderDates(selectedDate, reminderSettings);
    const notificationIds = [];

    for (const reminderDate of reminderDates) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Aufgabe fällig",
            body: taskText,
            sound: true
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            channelId: "default"
          }
        });

        notificationIds.push(id);
      } catch (error) {
        console.log("Fehler beim Planen einer Benachrichtigung:", error);
      }
    }

    return notificationIds;
  };

  const cancelTaskNotifications = async (notificationIds = []) => {
    for (const id of notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch (error) {
        console.log("Fehler beim Löschen einer Benachrichtigung:", error);
      }
    }
  };

  const addTask = async () => {
    if (!text.trim()) return;

    let notificationIds = [];

    if (dueDate) {
      notificationIds = await scheduleNotificationsForTask(
        text.trim(),
        dueDate,
        settings
      );
    }

    const newTask = {
      id: Date.now().toString(),
      text: text.trim(),
      done: false,
      priority,
      category: category.trim(),
      dueDate: dueDate ? formatDate(dueDate) : null,
      dueDateRaw: dueDate ? dueDate.toISOString() : null,
      notificationIds
    };

    setTasks((prev) => [...prev, newTask]);

    setText("");
    setCategory("");
    setPriority("normal");
    setDueDate(null);
  };

  const toggleTask = async (id) => {
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
        settings
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
  };

  const deleteTask = async (id) => {
    const taskToDelete = tasks.find((t) => t.id === id);

    if (taskToDelete?.notificationIds?.length) {
      await cancelTaskNotifications(taskToDelete.notificationIds);
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const moveUp = (id) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index <= 0) return;

    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    setTasks(newTasks);
  };

  const rescheduleAllTasks = async (newSettings) => {
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
          newSettings
        );
      }

      updatedTasks.push({
        ...task,
        notificationIds: newNotificationIds
      });
    }

    setTasks(updatedTasks);
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

  const uniqueCategories = [
    ...new Set(tasks.map((t) => t.category).filter(Boolean))
  ];

  const groupedTasks = () => {
    const groups = {};

    tasks.forEach((task) => {
      const key = task.category || "";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.entries(groups);
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

      <Text style={[styles.text, item.done && styles.done, { color: textColor }]}>
        {item.text}
      </Text>

      {item.dueDate && (
        <Text style={[styles.dateText, { color: textColor }]}>{item.dueDate}</Text>
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

            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.icon}>📅</Text>
            </TouchableOpacity>
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

      {showPicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) {
              const normalizedDate = new Date(selectedDate);
              normalizedDate.setHours(8, 30, 0, 0);
              setDueDate(normalizedDate);
            }
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
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10
  },

  secondaryBtnText: {
    fontWeight: "600"
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

  text: {
    flex: 1,
    marginLeft: 7,
    fontSize: 15
  },

  dateText: {
    fontSize: 12,
    marginRight: 6
  },

  done: {
    textDecorationLine: "line-through",
    opacity: 0.5
  }
});
