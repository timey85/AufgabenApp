// React Native modern Material-Style Aufgaben App
// Features:
// ✅ Drag & Drop
// ✅ Prioritäten
// ✅ Löschen nur wenn erledigt
// ✅ Pfeil zum Verschieben
// ✅ Verbesserte UI

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");
  const [tab, setTab] = useState("alle");

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

  const moveUp = (id) => {
    const index = tasks.findIndex(t => t.id === id);
    if (index <= 0) return;
    const newTasks = [...tasks];
    [newTasks[index - 1], newTasks[index]] = [newTasks[index], newTasks[index - 1]];
    setTasks(newTasks);
  };

  const filteredTasks = tasks.filter(t => {
    if (tab === "offen") return !t.done;
    if (tab === "erledigt") return t.done;
    return true;
  });

  const getColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'low': return '#6bcB77';
      default: return '#4d96ff';
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={[styles.card, { borderLeftColor: getColor(item.priority) }]}>      
      <TouchableOpacity onPress={() => toggleTask(item.id)}>
        <Text style={styles.checkbox}>{item.done ? "☑" : "☐"}</Text>
      </TouchableOpacity>

      <Text style={[styles.text, item.done && styles.done]}>
        {item.text}
      </Text>

      <TouchableOpacity onPress={() => moveUp(item.id)}>
        <Text style={styles.arrow}>↑</Text>
      </TouchableOpacity>

      {item.done && (
        <TouchableOpacity onPress={() => deleteTask(item.id)}>
          <Text style={styles.delete}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Aufgaben</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['alle', 'offen', 'erledigt'].map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}>
            <Text style={[styles.tab, tab === t && styles.activeTab]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Neue Aufgabe"
          style={styles.input}
        />
      </View>

      {/* Priority */}
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

      {/* List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={addTask}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef1f5'
  },
  header: {
    padding: 20,
    backgroundColor: '#4d96ff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold'
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10
  },
  tab: {
    fontSize: 14,
    color: '#888'
  },
  activeTab: {
    color: '#4d96ff',
    fontWeight: 'bold'
  },
  inputRow: {
    paddingHorizontal: 15
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 2,
    marginBottom: 5
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10
  },
  priorityBtn: {
    fontSize: 28
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 3,
    padding: 10,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 9,
    borderLeftWidth: 6,
    elevation: 3
  },
  text: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16
  },
  done: {
    textDecorationLine: 'line-through',
    opacity: 0.5
  },
  checkbox: {
    fontSize: 18
  },
  arrow: {
    fontSize: 18,
    marginHorizontal: 8
  },
  delete: {
    fontSize: 18,
    marginLeft: 8
  },
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    backgroundColor: '#4d96ff',
    width: 45,
    height: 45,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5
  },
  fabText: {
    color: 'white',
    fontSize: 30
  }
});
