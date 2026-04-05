// Verbesserte React Native Aufgaben-App
// Features: Swipe to delete, nur "nach oben" priorisieren, lokale Speicherung

import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");

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
    setTasks([...tasks, { id: Date.now().toString(), text, done: false }]);
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

  const renderRightActions = (id) => (
    <TouchableOpacity
      onPress={() => deleteTask(id)}
      style={{ backgroundColor: 'red', justifyContent: 'center', padding: 20 }}>
      <Text style={{ color: 'white' }}>Löschen</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 10 }}>Aufgaben</Text>

      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Neue Aufgabe"
          style={{ borderWidth: 1, flex: 1, marginRight: 10, padding: 8 }}
        />
        <TouchableOpacity onPress={addTask}>
          <Text style={{ fontSize: 28 }}>＋</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <Swipeable renderRightActions={() => renderRightActions(item.id)}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <TouchableOpacity onPress={() => toggleTask(item.id)}>
                <Text style={{ fontSize: 18 }}>{item.done ? "☑" : "☐"}</Text>
              </TouchableOpacity>

              <Text style={{ flex: 1, marginLeft: 10, fontSize: 16, textDecorationLine: item.done ? "line-through" : "none" }}>
                {item.text}
              </Text>

              <TouchableOpacity onPress={() => moveUp(index)}>
                <Text style={{ fontSize: 18 }}>↑</Text>
              </TouchableOpacity>
            </View>
          </Swipeable>
        )}
      />
    </View>
  );
}

/*
ZUSÄTZLICH INSTALLIEREN:
npm install react-native-gesture-handler

WICHTIG für Swipe:
In index.js hinzufügen:
import 'react-native-gesture-handler';

---

APK BAUEN:
cd android
./gradlew assembleRelease

---

WIDGET (Startbildschirm):

Ein echtes Android-Widget erfordert:
- Java/Kotlin Code (nicht React Native alleine)
- Separate Widget-Klasse

Wenn du willst, baue ich dir im nächsten Schritt:
👉 echtes Android Widget (mit Live-Aufgaben!)
*/
