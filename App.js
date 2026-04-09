import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  useColorScheme,
  Platform
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function App() {
  const isDark = useColorScheme() === "dark";

  const bg = isDark ? "#4d4c4c" : "#f5f7fa";
  const cardBg = isDark ? "#3a3a3a" : "white";
  const textColor = isDark ? "white" : "black";

  const [tasks, setTasks] = useState([]);
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
    await loadTasks();
    await setupNotifications();
  };

  const setupNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();

    if (status !== "granted") {
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
      const data = await AsyncStorage.getItem("TASKS");
      if (data) {
        setTasks(JSON.parse(data));
      }
    } catch (error) {
      console.log("Fehler beim Laden der Aufgaben:", error);
    }
  };

  const saveTasks = async () => {
    try {
      await AsyncStorage.setItem("TASKS", JSON.stringify(tasks));
    } catch (error) {
      console.log("Fehler beim Speichern der Aufgaben:", error);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  const scheduleNotification = async (selectedDate, taskText) => {
    try {
      const reminderDate = new Date(selectedDate);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(8, 30, 0, 0);

      if (reminderDate <= new Date()) {
        console.log("Erinnerungszeitpunkt liegt in der Vergangenheit");
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Aufgabe morgen fällig",
          body: taskText,
          sound: true
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
          channelId: "default"
        }
      });

      return notificationId;
    } catch (error) {
      console.log("Fehler beim Planen der Benachrichtigung:", error);
      return null;
    }
  };

  const addTask = async () => {
    if (!text.trim()) return;

    let notificationId = null;

    if (dueDate) {
      notificationId = await scheduleNotification(dueDate, text.trim());
    }

    const newTask = {
      id: Date.now().toString(),
      text: text.trim(),
      done: false,
      priority,
      category: category.trim(),
      dueDate: dueDate ? formatDate(dueDate) : null,
      dueDateRaw: dueDate ? dueDate.toISOString() : null,
      notificationId
    };

    setTasks((prev) => [...prev, newTask]);

    setText("");
    setCategory("");
    setPriority("normal");
    setDueDate(null);
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTask = async (id) => {
    const taskToDelete = tasks.find((t) => t.id === id);

    if (taskToDelete?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          taskToDelete.notificationId
        );
      } catch (error) {
        console.log("Fehler beim Löschen der Benachrichtigung:", error);
      }
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const moveUp = (id) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index <= 0) return;

    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [
      newTasks[index],
      newTasks[index - 1]
    ];

    setTasks(newTasks);
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
      const key = task.category || "Ohne Kategorie";
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

      <Text
        style={[
          styles.text,
          item.done && styles.done,
          { color: textColor }
        ]}
      >
        {item.text}
      </Text>

      {item.dueDate && (
        <Text style={[styles.dateText, { color: textColor }]}>
          {item.dueDate}
        </Text>
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
      </View>

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
                    <Text
                      style={[
                        styles.dropdownText,
                        { color: textColor }
                      ]}
                    >
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
              setDueDate(selectedDate);
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
  container: { flex: 1 },

  header: {
    backgroundColor: "#4d96ff",
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13
  },

  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold"
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
    height: 40
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
    height: 40,
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
    padding: 6,
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
