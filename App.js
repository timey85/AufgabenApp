import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, useColorScheme
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function App() {

  const isDark = useColorScheme() === "dark";

  const bg = isDark ? '#4d4c4c' : '#f5f7fa';
  const cardBg = isDark ? '#3a3a3a' : 'white';
  const textColor = isDark ? 'white' : 'black';

  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadTasks();
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => { saveTasks(); }, [tasks]);

  const loadTasks = async () => {
    const data = await AsyncStorage.getItem("TASKS");
    if (data) setTasks(JSON.parse(data));
  };

  const saveTasks = async () => {
    await AsyncStorage.setItem("TASKS", JSON.stringify(tasks));
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("de-DE");
  };

  const scheduleNotification = async (date, text) => {
    await Notifications.scheduleNotificationAsync({
      content: { title: "Aufgabe fällig", body: text },
      trigger: date
    });
  };

  const addTask = async () => {
    if (!text) return;

    const newTask = {
      id: Date.now().toString(),
      text,
      done: false,
      priority,
      category,
      dueDate: dueDate ? formatDate(dueDate) : null
    };

    setTasks([...tasks, newTask]);

    if (dueDate) await scheduleNotification(dueDate, text);

    setText("");
    setCategory("");
    setDueDate(null);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const moveUp = (id) => {
    const index = tasks.findIndex(t => t.id === id);
    if (index <= 0) return;

    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] =
      [newTasks[index], newTasks[index - 1]];

    setTasks(newTasks);
  };

  const getColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'low': return '#6bcB77';
      default: return '#4d96ff';
    }
  };

  // 📂 Kategorien sammeln
  const uniqueCategories = [...new Set(tasks.map(t => t.category).filter(Boolean))];

  const groupedTasks = () => {
    const groups = {};

    tasks.forEach(task => {
      const key = task.category || "";
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.entries(groups);
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.card,
      {
        backgroundColor: cardBg,
        borderLeftColor: getColor(item.priority)
      }
    ]}>

      <TouchableOpacity onPress={() => toggleTask(item.id)}>
        <Text style={[styles.cardIcon, { color: textColor }]}>
          {item.done ? "☑" : "☐"}
        </Text>
      </TouchableOpacity>

      <Text style={[
        styles.text,
        item.done && styles.done,
        { color: textColor }
      ]}>
        {item.text}
      </Text>

      {item.dueDate && (
        <Text style={{ fontSize: 12, marginRight: 6, color: textColor }}>
          {item.dueDate}
        </Text>
      )}

      <TouchableOpacity onPress={() => moveUp(item.id)}>
        <Text style={[styles.cardIcon, { color: textColor }]}>⬆</Text>
      </TouchableOpacity>

      {item.done && (
        <TouchableOpacity onPress={() => deleteTask(item.id)}>
          <Text style={[styles.cardIcon, { marginLeft: 2 }]}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Aufgaben</Text>
      </View>

      {/* INPUT */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Neue Aufgabe"
          placeholderTextColor="#aaa"
          style={[styles.input, { backgroundColor: cardBg, color: textColor }]}
        />

        <TouchableOpacity style={styles.addBtn} onPress={addTask}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* KATEGORIE */}
      {text.length > 0 && (
        <>
          <View style={styles.categoryRow}>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Kategorie"
              placeholderTextColor="#aaa"
              style={[styles.categoryInput, { backgroundColor: cardBg, color: textColor }]}
            />

            {/* Farben */}
            <TouchableOpacity onPress={() => setPriority('low')}>
              <Text style={styles.icon}>🟢</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPriority('normal')}>
              <Text style={styles.icon}>🔵</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPriority('high')}>
              <Text style={styles.icon}>🔴</Text>
            </TouchableOpacity>

            {/* Kalender */}
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.icon}>📅</Text>
            </TouchableOpacity>
            
          </View>

          {/* Dropdown */}
          {uniqueCategories.length > 0 && (
            <View style={styles.dropdown}>
              {uniqueCategories.map(cat => (
                <TouchableOpacity key={cat} onPress={() => setCategory(cat)}>
                  <View style={[styles.dropdownItem, { backgroundColor: cardBg }]}>
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

      {/* DATE PICKER */}
      {showPicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          onChange={(e, d) => {
            setShowPicker(false);
            if (d) setDueDate(d);
          }}
        />
      )}

      {/* LISTE */}
      <FlatList
        data={groupedTasks()}
        keyExtractor={(item) => item[0]}
        renderItem={({ item }) => (
          <View>
            <Text style={[styles.categoryTitle, { color: textColor }]}>
              {item[0]}
            </Text>

            {item[1].map(task => (
              <View key={task.id}>
                {renderItem({ item: task })}
              </View>
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
    backgroundColor: '#4d96ff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '40px',
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 13
  },

  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold'
  },

  inputRow: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center'
  },

  input: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    marginVertical: 5,
    height: 35
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 2
  },

  categoryInput: {
    flex: 1,
    borderRadius: 12,
    height: 35,
    paddingHorizontal: 12,
    textAlignVertical: 'center',
    marginRight: 8
  },

  addBtn: {
    marginLeft: 10,
    backgroundColor: '#4d96ff',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 6
  },

  addText: {
    color: 'white',
    fontSize: 20
  },

  dropdown: {
    marginHorizontal: 10,
    borderRadius: 12,
    marginTop: 3,
    elevation: 3,
    overflow: 'hidden'
  },

  dropdownItem: {
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 1
  },

  dropdownText: {
    fontSize: 14,
  },

  categoryTitle: {
    marginTop: 10,
    marginLeft: 20,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
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

  done: {
    textDecorationLine: 'line-through',
    opacity: 0.5
  }
});
