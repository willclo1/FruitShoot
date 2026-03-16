import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, Pressable, View, Alert, Image, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

import { IngredientsInputList } from "@/components/ingredients-input-list";
import { NumberedStepsInput } from "@/components/numbered-steps-input";
import { clipFromUrl } from "@/services/clip";
import { createRecipe } from "@/services/recipes";
import { ingredientsToDescription, instructionsToDescription, parseIngredients, parseInstructions } from "@/services/recipeFormat";
import { tts } from "@/services/tts";
import { useSettings } from "@/services/settingsContext";
import { useFontStyle, useTouchTarget } from "@/services/settingsContext";

const CAMERA_GREEN = "#1F4C47";
const CREAM = "#FAF7F2";
const COOL_GRAY = "#B9C0BE";

export default function UploadRecipeScreen() {
  const router = useRouter();
  const { settings, loaded } = useSettings();
  const { scale, fontRegular, fontBold } = useFontStyle();
  const tt = useTouchTarget();
  const finalScale = scale * tt.fontBoost;

  const [recipeUrl, setRecipeUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([""]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  const canImport = useMemo(() => recipeUrl.trim().length > 0 && !importing && !submitting, [recipeUrl, importing, submitting]);
  const canSubmit = useMemo(() => (
    title.trim().length > 0 && ingredients.some((i) => i.trim().length > 0) &&
    instructions.some((i) => i.trim().length > 0) && !submitting && !importing
  ), [title, ingredients, instructions, submitting, importing]);

  useFocusEffect(React.useCallback(() => {
    tts.autoSay("Upload Recipe screen. Paste a URL to import, or fill in the fields manually.");
  }, [loaded, settings.ttsEnabled, settings.ttsMode, settings.ttsRate, settings.ttsPitch]));

  const onImport = async () => {
    const url = recipeUrl.trim();
    if (!url) { Alert.alert("Import Recipe", "Paste a recipe URL."); return; }
    try {
      setImporting(true);
      tts.say("Importing recipe. Please wait.");
      const res = await clipFromUrl({ url, ml_disable: true });
      setTitle(res.recipe.title || "");
      setIngredients(parseIngredients(res.recipe.ingredients_description || "").length ? parseIngredients(res.recipe.ingredients_description || "") : [""]);
      setInstructions(parseInstructions(res.recipe.instructions_description || "").length ? parseInstructions(res.recipe.instructions_description || "") : [""]);
      tts.say("Recipe imported. Review the fields, then tap Submit.");
      Alert.alert("Import Recipe", "Imported! Review and edit, then submit.");
    } catch (e: any) {
      Alert.alert("Import Recipe", e?.message || "Could not import recipe.");
    } finally { setImporting(false); }
  };

  const onSubmit = async () => {
    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    const cleanInstructions = instructions.map((i) => i.trim()).filter(Boolean);
    if (!title.trim() || !cleanIngredients.length || !cleanInstructions.length) {
      Alert.alert("Upload Recipe", "Please fill out title, ingredients, and instructions."); return;
    }
    try {
      setSubmitting(true);
      tts.say("Submitting recipe. Please wait.");
      await createRecipe(title.trim(), ingredientsToDescription(cleanIngredients), instructionsToDescription(cleanInstructions));
      tts.say("Recipe submitted successfully.");
      Alert.alert("Upload Recipe", "Recipe submitted!");
      router.back();
    } catch (e: any) {
      Alert.alert("Upload Recipe", e?.message || "Could not submit recipe.");
    } finally { setSubmitting(false); }
  };

  const showReplay = loaded && settings.ttsEnabled;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.brandHeader}>
          <Image source={require("../assets/images/FruitShoot Logo.png")} style={styles.brandLogo} resizeMode="contain" />
        </View>

        <View style={styles.titleRow}>
          <Text style={[styles.h1, { fontFamily: fontBold, fontSize: 22 * finalScale }]}>Upload Recipe</Text>
          {showReplay && (
            <Pressable style={[styles.replayButton, { minHeight: tt.minHeight, paddingHorizontal: tt.paddingHorizontal }]}
              onPress={() => tts.say("Upload Recipe screen. Paste a URL to import, or fill in manually, then tap Submit.")}>
              <Text style={[styles.replayText, { fontFamily: fontBold, fontSize: 13 * finalScale }]}>Replay</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.underline} />

        <Text style={[styles.sectionTitle, { fontFamily: fontBold, fontSize: 16 * finalScale }]}>Import from URL</Text>
        <Text style={[styles.helperText, { fontFamily: fontRegular, fontSize: 13 * finalScale }]}>Paste a recipe link and we'll auto-fill the fields below.</Text>

        <TextInput value={recipeUrl} onChangeText={setRecipeUrl}
          placeholder="https://www.allrecipes.com/recipe/..." placeholderTextColor="#66706C"
          style={[styles.input, { fontFamily: fontRegular, fontSize: 15 * finalScale, minHeight: tt.minHeight }]}
          autoCapitalize="none" autoCorrect={false} editable={!importing && !submitting} />

        <Pressable onPress={onImport}
          style={({ pressed }) => [styles.importBtn, { minHeight: tt.minHeight, borderRadius: tt.borderRadius }, (!canImport || importing) && styles.primaryBtnDisabled, pressed && styles.pressed]}
          disabled={!canImport || importing || submitting}>
          {importing
            ? <View style={styles.submitRow}><ActivityIndicator color="#fff" /><Text style={[styles.primaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Importing…</Text></View>
            : <Text style={[styles.primaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Import</Text>}
        </Pressable>

        <View style={styles.divider} />

        <Text style={[styles.label, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>Recipe Name</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="e.g., Banana Bread" placeholderTextColor="#66706C"
          style={[styles.input, { fontFamily: fontRegular, fontSize: 15 * finalScale, minHeight: tt.minHeight }]}
          editable={!submitting && !importing} />

        <Text style={[styles.label, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>Ingredients</Text>
        <IngredientsInputList values={ingredients} onChange={setIngredients} disabled={submitting || importing} />

        <Text style={[styles.label, { fontFamily: fontBold, fontSize: 14 * finalScale }]}>Instructions</Text>
        <NumberedStepsInput steps={instructions} onChange={setInstructions} disabled={submitting || importing} />

        <View style={styles.btnRow}>
          <Pressable onPress={() => { tts.say("Cancelled."); router.back(); }}
            style={({ pressed }) => [styles.secondaryBtn, { minHeight: tt.minHeight, borderRadius: tt.borderRadius }, pressed && styles.pressed]}
            disabled={submitting || importing}>
            <Text style={[styles.secondaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={onSubmit}
            style={({ pressed }) => [styles.primaryBtn, { minHeight: tt.minHeight, borderRadius: tt.borderRadius }, (!canSubmit || submitting || importing) && styles.primaryBtnDisabled, pressed && styles.pressed]}
            disabled={!canSubmit || submitting || importing}>
            {submitting
              ? <View style={styles.submitRow}><ActivityIndicator color="#fff" /><Text style={[styles.primaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Submitting…</Text></View>
              : <Text style={[styles.primaryText, { fontFamily: fontBold, fontSize: 15 * finalScale }]}>Submit</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CREAM },
  page: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 40 },
  brandHeader: { alignItems: "center" },
  brandLogo: { width: 140, height: 140, marginBottom: 6 },
  titleRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" },
  h1: { fontWeight: "900", color: CAMERA_GREEN },
  underline: { 
    height: 2, 
    width: 120, 
    backgroundColor: CAMERA_GREEN, 
    marginTop: 6, 
    marginBottom: 18, 
    borderRadius: 2 
  },
  replayButton: { 
    backgroundColor: "#3B3B3B", 
    paddingVertical: 6, 
    paddingHorizontal: 14, 
    borderRadius: 999, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  replayText: { color: "#fff", fontWeight: "700" },
  sectionTitle: { fontWeight: "900", color: "#111", marginTop: 2 },
  helperText: { marginTop: 6, color: "#333", lineHeight: 18 },
  divider: { 
    height: 1, 
    backgroundColor: COOL_GRAY, 
    marginVertical: 18, 
    opacity: 0.8 
  },
  label: { marginTop: 12, fontWeight: "800", color: "#111" },
  input: { 
    marginTop: 8, 
    backgroundColor: "#F2F3F0", 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: "rgba(31,76,71,0.12)", 
    color: "#111" 
  },
  importBtn: { 
    marginTop: 12, 
    borderRadius: 12, 
    paddingVertical: 12, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: CAMERA_GREEN 
  },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 18 },
  secondaryBtn: { 
    flex: 1, 
    borderRadius: 12, 
    paddingVertical: 12,
    alignItems: "center", 
    justifyContent: "center", 
    borderWidth: 2, 
    borderColor: CAMERA_GREEN, 
    backgroundColor: "transparent" 
  },
  secondaryText: { color: CAMERA_GREEN, fontWeight: "900" },
  primaryBtn: { 
    flex: 1, 
    borderRadius: 12, 
    paddingVertical: 12, 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: CAMERA_GREEN 
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryText: { color: "white", fontWeight: "900" },
  pressed: { opacity: 0.85 },
  submitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});