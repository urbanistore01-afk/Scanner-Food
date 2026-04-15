import { api } from './api';

export interface NutritionalGoals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export const DEFAULT_GOALS: NutritionalGoals = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fats: 70,
};

export const GOALS_STORAGE_KEY = 'nutritionalGoals';

export async function getGoalsAsync(): Promise<NutritionalGoals> {
  try {
    const data = await api.getGoals();
    if (data) {
      return {
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats
      };
    }
  } catch (error) {
    console.error("Failed to fetch goals from backend:", error);
  }
  return getGoals(); // Fallback to local
}

export function getGoals(): NutritionalGoals {
  const saved = localStorage.getItem(GOALS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse goals", e);
    }
  }
  return DEFAULT_GOALS;
}

export async function saveGoalsAsync(goals: NutritionalGoals) {
  saveGoals(goals); // Save local first for immediate UI update
  try {
    await api.saveGoals(goals);
  } catch (error) {
    console.error("Failed to save goals to backend:", error);
  }
}

export function saveGoals(goals: NutritionalGoals) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
}
