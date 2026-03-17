import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function IngredientsInputList({
  values,
  onChange,
  disabled = false,
}: Props) {
  const updateAt = (index: number, value: string) => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };

  const addItem = () => onChange([...values, ""]);

  const removeItem = (index: number) => {
    if (values.length <= 1) return;
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.block}>
      {values.map((ingredient, idx) => (
        <View key={`ingredient-${idx}`} style={styles.row}>
          <View style={styles.inputShell}>
            <View style={styles.bulletDot} />
            <TextInput
              value={ingredient}
              onChangeText={(text) => updateAt(idx, text)}
              placeholder={`Ingredient ${idx + 1}`}
              placeholderTextColor="#7A847F"
              style={styles.input}
              editable={!disabled}
              returnKeyType="done"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.removeButton,
              (disabled || values.length <= 1) && styles.removeButtonDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => removeItem(idx)}
            disabled={disabled || values.length <= 1}
            accessibilityRole="button"
            accessibilityLabel={`Remove ingredient ${idx + 1}`}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [
          styles.addButton,
          (disabled || pressed) && styles.pressed,
        ]}
        onPress={addItem}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Add ingredient"
      >
        <Text style={styles.addText}>+ Add Ingredient</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 10,
    gap: 12,
  },

  row: {
    gap: 8,
  },

  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F6F2",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.10)",
    borderRadius: 16,
    paddingHorizontal: 13,
    minHeight: 52,
  },

  bulletDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "#8FA49C",
  },

  input: {
    flex: 1,
    paddingVertical: 13,
    color: "#111",
    fontSize: 14,
  },

  addButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#EAF0EB",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 2,
  },

  addText: {
    color: "#28423D",
    fontWeight: "800",
    fontSize: 12,
  },

  removeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(159,112,97,0.20)",
    backgroundColor: "#F8EFEB",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  removeButtonDisabled: {
    opacity: 0.4,
  },

  removeText: {
    color: "#8D4D42",
    fontWeight: "700",
    fontSize: 12,
  },

  pressed: {
    opacity: 0.8,
  },
});