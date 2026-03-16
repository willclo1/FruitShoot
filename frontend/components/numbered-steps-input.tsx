import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  steps: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function NumberedStepsInput({ steps, onChange, disabled = false }: Props) {
  const updateAt = (index: number, value: string) => {
    const next = [...steps];
    next[index] = value;
    onChange(next);
  };

  const addStep = () => onChange([...steps, ""]);

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.block}>
      {steps.map((step, idx) => (
        <View key={`step-${idx}`} style={styles.row}>
          <View style={styles.stepLabelWrap}>
            <Text style={styles.stepLabel}>{idx + 1}</Text>
          </View>

          <View style={styles.inputWrap}>
            <View style={styles.inputShell}>
              <TextInput
                value={step}
                onChangeText={(text) => updateAt(idx, text)}
                placeholder={`Step ${idx + 1}`}
                placeholderTextColor="#66706C"
                style={styles.input}
                editable={!disabled}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.removeButton,
                (disabled || steps.length <= 1) && styles.removeButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => removeStep(idx)}
              disabled={disabled || steps.length <= 1}
              accessibilityRole="button"
              accessibilityLabel={`Remove step ${idx + 1}`}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [styles.addButton, (disabled || pressed) && styles.pressed]}
        onPress={addStep}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Add step"
      >
        <Text style={styles.addText}>+ Add Step</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 8, gap: 10 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },

  stepLabelWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E7ECE7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#27423D",
  },

  inputWrap: { flex: 1, gap: 6 },
  inputShell: {
    backgroundColor: "#F3F4F0",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.1)",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  input: {
    paddingVertical: 12,
    color: "#111",
    fontSize: 14,
  },

  addButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#E6ECE7",
    borderWidth: 1,
    borderColor: "rgba(31,76,71,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  addText: { color: "#28423D", fontWeight: "800", fontSize: 12 },

  removeButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(159,112,97,0.24)",
    backgroundColor: "#F6ECE8",
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  removeButtonDisabled: { opacity: 0.4 },
  removeText: { color: "#8D4D42", fontWeight: "700", fontSize: 12 },

  pressed: { opacity: 0.8 },
});