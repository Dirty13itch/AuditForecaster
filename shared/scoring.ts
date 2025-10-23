import type { ChecklistItem } from "./schema";

export interface ScoreMetrics {
  totalItems: number;
  passedItems: number;
  failedItems: number;
  notApplicableItems: number;
  pendingItems: number;
  passRate: number;
  failRate: number;
  completionRate: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export function calculateScore(items: ChecklistItem[]): ScoreMetrics {
  const totalItems = items.length;
  const passedItems = items.filter(i => i.status === 'passed').length;
  const failedItems = items.filter(i => i.status === 'failed').length;
  const notApplicableItems = items.filter(i => i.status === 'not_applicable').length;
  const pendingItems = items.filter(i => i.status === 'pending').length;
  
  const applicableItems = totalItems - notApplicableItems;
  const completedItems = passedItems + failedItems;
  
  const passRate = applicableItems > 0 ? (passedItems / applicableItems) * 100 : 0;
  const failRate = applicableItems > 0 ? (failedItems / applicableItems) * 100 : 0;
  const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (passRate >= 90) grade = 'A';
  else if (passRate >= 80) grade = 'B';
  else if (passRate >= 70) grade = 'C';
  else if (passRate >= 60) grade = 'D';
  else grade = 'F';
  
  return {
    totalItems,
    passedItems,
    failedItems,
    notApplicableItems,
    pendingItems,
    passRate,
    failRate,
    completionRate,
    grade,
  };
}
