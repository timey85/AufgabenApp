// React Native Aufgaben App
// Features:
// ✅ Drag & Drop
// ✅ Prioritäten
// ✅ Löschen nur wenn erledigt
// ✅ Pfeil zum Verschieben
// ✅ Verbesserte UI

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList from 'react-native-draggable-flatlist';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");

  useEffect(() => { loadTasks(); }, []);
  useEffect(() => { saveTasks(); }, [tasks]);

  const loadTasks = async () => {
    const data = await AsyncStorage.getItem("TASKS");
    if (data) setTasks(JSON.parse(data));
  };

  const saveTasks = async () => {
    await AsyncStorage.setItem("TASKS", JSON.stringify(tasks));
  };

  const addTask = () => {
    if (!text) return;
    setTasks([
      ...tasks,
      {
        id: Date.now().toString(),
        text,
        done: false,
        priority
      }
    ]);
    setText("");
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    setTasks(newTasks);
  };

  const getColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'low': return '#6bcB77';
      default: return '#4d96ff';
    }
  };

  const renderItem = ({ item, drag, isActive, index }) => (
    <TouchableOpacity
      onLongPress={drag}
      style={[
        styles.card,
        { backgroundColor: getColor(item.priority), opacity: isActive ? 0.8 : 1 }
      ]}
    >
      <TouchableOpacity onPress={() => toggleTask(item.id)}>
        <Text style={styles.checkbox}>{item.done ? "☑" : "☐"}</Text>
      </TouchableOpacity>

      <Text style={[styles.text, item.done && styles.done]}>
        {item.text}
      </Text>

      {/* Pfeil zum Verschieben */}
      <TouchableOpacity onPress={() => moveUp(index)}>
        <Text style={styles.arrow}>↑</Text>
      </TouchableOpacity>

      {/* Löschen nur wenn erledigt */}
      {item.done && (
        <TouchableOpacity onPress={() => deleteTask(item.id)}>
          <Text style={styles.delete}>🗑️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meine Aufgaben</Text>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Neue Aufgabe"
          style={styles.input}
        />

        <TouchableOpacity onPress={addTask}>
          <Text style={styles.add}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Priorität nur anzeigen wenn Text eingegeben wurde */}
      {text.length > 0 && (
        <View style={styles.priorityRow}>
          <TouchableOpacity onPress={() => setPriority('low')}>
            <Text style={styles.priorityBtn}>🟢</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPriority('normal')}>
            <Text style={styles.priorityBtn}>🔵</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPriority('high')}>
            <Text style={styles.priorityBtn}>🔴</Text>
          </TouchableOpacity>
        </View>
      )}

      <DraggableFlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => setTasks(data)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    backgroundColor: 'white'
  },
  add: {
    fontSize: 30,
    marginLeft: 10
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10
  },
  priorityBtn: {
    fontSize: 28
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 15,
    marginBottom: 8
  },
  text: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: 'white'
  },
  done: {
    textDecorationLine: 'line-through',
    opacity: 0.7
  },
  checkbox: {
    fontSize: 18,
    color: 'white'
  },
  arrow: {
    fontSize: 18,
    marginHorizontal: 5,
    color: 'white'
  },
  delete: {
    fontSize: 18,
    marginLeft: 5
  }
});
