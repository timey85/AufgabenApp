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
      const key = task.category || "Ohne Kategorie";
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
        <Text style={{ color: textColor }}>
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
        <Text style={{ color: textColor }}>⬆</Text>
      </TouchableOpacity>

      {item.done && (
        <TouchableOpacity onPress={() => deleteTask(item.id)}>
          <Text style={{ marginLeft: 6 }}>🗑️</Text>
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
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="Kategorie"
            style={[styles.input, { backgroundColor: cardBg, color: textColor }]}
          />

          {/* Dropdown */}
          <View style={styles.dropdown}>
            {uniqueCategories.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setCategory(cat)}>
                <Text style={{ color: textColor }}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* BUTTONS */}
      {text.length > 0 && (
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setPriority('low')}>
            <Text style={styles.btn}>🟢</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPriority('normal')}>
            <Text style={styles.btn}>🔵</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPriority('high')}>
            <Text style={styles.btn}>🔴</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowPicker(true)}>
            <Text style={styles.btn}>📅</Text>
          </TouchableOpacity>
        </View>
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
    borderRadius: 10,
    padding: 10,
    marginVertical: 5
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

  row: {
    flexDirection: 'row',
    justifyContent: 'center'
  },

  btn: {
    fontSize: 26,
    marginHorizontal: 8
  },

  dropdown: {
    paddingHorizontal: 10
  },

  categoryTitle: {
    marginTop: 10,
    marginLeft: 10,
    fontWeight: 'bold'
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 3,
    padding: 8,
    borderRadius: 10,
    borderLeftWidth: 5
  },

  text: {
    flex: 1,
    marginLeft: 10
  },

  done: {
    textDecorationLine: 'line-through',
    opacity: 0.5
  }
});
