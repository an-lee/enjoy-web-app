#!/usr/bin/env bun

import { readdir, readFile } from "fs/promises";
import { join } from "path";

interface TranslationData {
  [key: string]: string | TranslationData;
}

/**
 * Recursively extract all keys from a translation object
 * Returns keys in dot notation (e.g., "settings.ai.provider")
 */
function extractKeys(obj: TranslationData, prefix = ""): Set<string> {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      const nestedKeys = extractKeys(value as TranslationData, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      // Leaf node - add the key
      keys.add(fullKey);
    }
  }

  return keys;
}

/**
 * Get the value at a key path
 */
function getValue(obj: TranslationData, keyPath: string): any {
  const parts = keyPath.split(".");
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

async function checkLocales() {
  const localesDir = join(process.cwd(), "src", "shared", "locales");
  const locales: Record<string, TranslationData> = {};

  // Read all locale files
  const dirs = await readdir(localesDir, { withFileTypes: true });
  const localeDirs = dirs.filter((dirent) => dirent.isDirectory());

  console.log("📚 Reading translation files...\n");

  for (const dir of localeDirs) {
    const localeCode = dir.name;
    const filePath = join(localesDir, localeCode, "translation.json");

    try {
      const content = await readFile(filePath, "utf-8");
      locales[localeCode] = JSON.parse(content);
      console.log(`✓ Loaded ${localeCode}`);
    } catch (error) {
      console.error(`✗ Failed to load ${localeCode}:`, error);
      process.exit(1);
    }
  }

  if (Object.keys(locales).length === 0) {
    console.error("No locale files found!");
    process.exit(1);
  }

  console.log(`\n📊 Found ${Object.keys(locales).length} languages\n`);

  // Extract all keys from all locales
  const allKeys = new Set<string>();
  const localeKeys: Record<string, Set<string>> = {};

  for (const [locale, data] of Object.entries(locales)) {
    const keys = extractKeys(data);
    localeKeys[locale] = keys;
    keys.forEach((key) => allKeys.add(key));
  }

  console.log(`🔑 Total unique keys found: ${allKeys.size}\n`);

  // Check for missing keys
  const issues: Array<{
    locale: string;
    missingKeys: string[];
    extraKeys: string[];
  }> = [];

  for (const [locale, keys] of Object.entries(localeKeys)) {
    const missingKeys: string[] = [];
    const extraKeys: string[] = [];

    // Find missing keys (keys that exist in other locales but not in this one)
    for (const key of allKeys) {
      if (!keys.has(key)) {
        missingKeys.push(key);
      }
    }

    // Find extra keys (keys that exist in this locale but not in others)
    for (const key of keys) {
      let existsInAllOthers = true;
      for (const [otherLocale, otherKeys] of Object.entries(localeKeys)) {
        if (otherLocale !== locale && !otherKeys.has(key)) {
          existsInAllOthers = false;
          break;
        }
      }
      if (existsInAllOthers && !allKeys.has(key)) {
        // This shouldn't happen, but check anyway
        extraKeys.push(key);
      }
    }

    if (missingKeys.length > 0 || extraKeys.length > 0) {
      issues.push({ locale, missingKeys, extraKeys });
    }
  }

  // Report results
  if (issues.length === 0) {
    console.log("✅ All translation files have consistent keys!\n");
    console.log("🎉 No missing translations found.\n");
    process.exit(0);
  }

  console.log("❌ Found inconsistencies in translation files:\n");

  let hasErrors = false;

  for (const issue of issues) {
    if (issue.missingKeys.length > 0) {
      hasErrors = true;
      console.log(`\n📋 ${issue.locale.toUpperCase()} - Missing keys (${issue.missingKeys.length}):`);
      console.log("─".repeat(60));

      // Group missing keys by top-level namespace for better readability
      const grouped = issue.missingKeys.reduce((acc, key) => {
        const topLevel = key.split(".")[0];
        if (!acc[topLevel]) {
          acc[topLevel] = [];
        }
        acc[topLevel].push(key);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [namespace, keys] of Object.entries(grouped)) {
        console.log(`\n  ${namespace}:`);
        for (const key of keys.sort()) {
          // Try to show the value from another locale as reference
          let referenceValue = "";
          for (const [otherLocale, data] of Object.entries(locales)) {
            if (otherLocale !== issue.locale) {
              const value = getValue(data, key);
              if (value !== undefined) {
                referenceValue = ` (e.g., "${String(value).substring(0, 50)}${String(value).length > 50 ? "..." : ""}")`;
                break;
              }
            }
          }
          console.log(`    - ${key}${referenceValue}`);
        }
      }
    }

    if (issue.extraKeys.length > 0) {
      console.log(`\n⚠️  ${issue.locale.toUpperCase()} - Extra keys (${issue.extraKeys.length}):`);
      console.log("─".repeat(60));
      for (const key of issue.extraKeys.sort()) {
        console.log(`    + ${key}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Summary:");
  const totalMissing = issues.reduce((sum, issue) => sum + issue.missingKeys.length, 0);
  console.log(`   Total missing keys: ${totalMissing}`);
  console.log(`   Languages with issues: ${issues.length}`);

  console.log("\n💡 Tip: Use the reference values above to add missing translations.\n");

  process.exit(hasErrors ? 1 : 0);
}

// Run the check
checkLocales().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

