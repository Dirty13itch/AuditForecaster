import { describe, it, expect } from 'vitest';
import { calculateScore } from './scoring';
import type { ChecklistItem } from './schema';

describe('calculateScore - Edge Cases', () => {
  describe('All items pass (100% pass rate)', () => {
    it('should return grade A with 100% pass rate', () => {
      const items: ChecklistItem[] = [
        { id: '1', jobId: 'job1', itemNumber: 1, title: 'Item 1', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '2', jobId: 'job1', itemNumber: 2, title: 'Item 2', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '3', jobId: 'job1', itemNumber: 3, title: 'Item 3', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.grade).toBe('A');
      expect(result.passRate).toBe(100);
      expect(result.failRate).toBe(0);
      expect(result.completionRate).toBe(100);
      expect(result.totalItems).toBe(3);
      expect(result.passedItems).toBe(3);
      expect(result.failedItems).toBe(0);
    });
  });

  describe('All items fail (0% pass rate)', () => {
    it('should return grade F with 0% pass rate', () => {
      const items: ChecklistItem[] = [
        { id: '1', jobId: 'job1', itemNumber: 1, title: 'Item 1', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '2', jobId: 'job1', itemNumber: 2, title: 'Item 2', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '3', jobId: 'job1', itemNumber: 3, title: 'Item 3', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.grade).toBe('F');
      expect(result.passRate).toBe(0);
      expect(result.failRate).toBe(100);
      expect(result.completionRate).toBe(100);
      expect(result.totalItems).toBe(3);
      expect(result.passedItems).toBe(0);
      expect(result.failedItems).toBe(3);
    });
  });

  describe('No items (empty array)', () => {
    it('should handle empty array gracefully without division by zero', () => {
      const items: ChecklistItem[] = [];

      const result = calculateScore(items);

      expect(result.grade).toBe('F');
      expect(result.passRate).toBe(0);
      expect(result.failRate).toBe(0);
      expect(result.completionRate).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.passedItems).toBe(0);
      expect(result.failedItems).toBe(0);
    });
  });

  describe('All items not applicable', () => {
    it('should handle all N/A items without division by zero', () => {
      const items: ChecklistItem[] = [
        { id: '1', jobId: 'job1', itemNumber: 1, title: 'Item 1', completed: false, status: 'not_applicable', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '2', jobId: 'job1', itemNumber: 2, title: 'Item 2', completed: false, status: 'not_applicable', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(0);
      expect(result.failRate).toBe(0);
      expect(result.notApplicableItems).toBe(2);
      expect(result.totalItems).toBe(2);
    });
  });

  describe('Partial completion (some completed, some pending)', () => {
    it('should calculate rates based on completed items only', () => {
      const items: ChecklistItem[] = [
        { id: '1', jobId: 'job1', itemNumber: 1, title: 'Item 1', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '2', jobId: 'job1', itemNumber: 2, title: 'Item 2', completed: false, status: 'pending', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '3', jobId: 'job1', itemNumber: 3, title: 'Item 3', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '4', jobId: 'job1', itemNumber: 4, title: 'Item 4', completed: false, status: 'pending', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.totalItems).toBe(4);
      expect(result.passedItems).toBe(1);
      expect(result.failedItems).toBe(1);
      expect(result.pendingItems).toBe(2);
      expect(result.passRate).toBe(25);
      expect(result.failRate).toBe(25);
      expect(result.completionRate).toBe(50);
      expect(result.grade).toBe('F');
    });
  });

  describe('Boundary percentages - Grade A (90-100%)', () => {
    it('should return grade A for exactly 90% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(9).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        { id: '9', jobId: 'job1', itemNumber: 9, title: 'Item 9', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(90);
      expect(result.grade).toBe('A');
    });

    it('should return grade A for 95% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(19).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        { id: '19', jobId: 'job1', itemNumber: 19, title: 'Item 19', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(95);
      expect(result.grade).toBe('A');
    });
  });

  describe('Boundary percentages - Grade B (80-89.99%)', () => {
    it('should return grade B for exactly 80% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(8).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(2).fill(null).map((_, i) => ({
          id: `${i + 8}`,
          jobId: 'job1',
          itemNumber: i + 8,
          title: `Item ${i + 8}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(80);
      expect(result.grade).toBe('B');
    });

    it('should return grade B for 89.99% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(89).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(11).fill(null).map((_, i) => ({
          id: `${i + 89}`,
          jobId: 'job1',
          itemNumber: i + 89,
          title: `Item ${i + 89}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBeCloseTo(89, 0);
      expect(result.grade).toBe('B');
    });
  });

  describe('Boundary percentages - Grade C (70-79.99%)', () => {
    it('should return grade C for exactly 70% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(7).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(3).fill(null).map((_, i) => ({
          id: `${i + 7}`,
          jobId: 'job1',
          itemNumber: i + 7,
          title: `Item ${i + 7}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(70);
      expect(result.grade).toBe('C');
    });

    it('should return grade C for 75% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(75).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(25).fill(null).map((_, i) => ({
          id: `${i + 75}`,
          jobId: 'job1',
          itemNumber: i + 75,
          title: `Item ${i + 75}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(75);
      expect(result.grade).toBe('C');
    });
  });

  describe('Boundary percentages - Grade D (60-69.99%)', () => {
    it('should return grade D for exactly 60% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(6).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(4).fill(null).map((_, i) => ({
          id: `${i + 6}`,
          jobId: 'job1',
          itemNumber: i + 6,
          title: `Item ${i + 6}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(60);
      expect(result.grade).toBe('D');
    });

    it('should return grade D for 65% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(65).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(35).fill(null).map((_, i) => ({
          id: `${i + 65}`,
          jobId: 'job1',
          itemNumber: i + 65,
          title: `Item ${i + 65}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(65);
      expect(result.grade).toBe('D');
    });
  });

  describe('Boundary percentages - Grade F (<60%)', () => {
    it('should return grade F for 59% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(59).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(41).fill(null).map((_, i) => ({
          id: `${i + 59}`,
          jobId: 'job1',
          itemNumber: i + 59,
          title: `Item ${i + 59}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(59);
      expect(result.grade).toBe('F');
    });

    it('should return grade F for 50% pass rate', () => {
      const items: ChecklistItem[] = [
        ...Array(5).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(5).fill(null).map((_, i) => ({
          id: `${i + 5}`,
          jobId: 'job1',
          itemNumber: i + 5,
          title: `Item ${i + 5}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBe(50);
      expect(result.grade).toBe('F');
    });
  });

  describe('Mixed statuses with N/A items', () => {
    it('should exclude N/A items from pass rate calculation', () => {
      const items: ChecklistItem[] = [
        { id: '1', jobId: 'job1', itemNumber: 1, title: 'Item 1', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '2', jobId: 'job1', itemNumber: 2, title: 'Item 2', completed: false, status: 'not_applicable', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '3', jobId: 'job1', itemNumber: 3, title: 'Item 3', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '4', jobId: 'job1', itemNumber: 4, title: 'Item 4', completed: false, status: 'not_applicable', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '5', jobId: 'job1', itemNumber: 5, title: 'Item 5', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '6', jobId: 'job1', itemNumber: 6, title: 'Item 6', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '7', jobId: 'job1', itemNumber: 7, title: 'Item 7', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '8', jobId: 'job1', itemNumber: 8, title: 'Item 8', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '9', jobId: 'job1', itemNumber: 9, title: 'Item 9', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '10', jobId: 'job1', itemNumber: 10, title: 'Item 10', completed: true, status: 'passed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.totalItems).toBe(10);
      expect(result.notApplicableItems).toBe(2);
      expect(result.passedItems).toBe(8);
      expect(result.passRate).toBe(100);
      expect(result.grade).toBe('A');
    });

    it('should calculate 90% pass rate when 2 N/A out of 10 total and 1 fail out of 8 applicable', () => {
      const items: ChecklistItem[] = [
        ...Array(7).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        { id: '7', jobId: 'job1', itemNumber: 7, title: 'Item 7', completed: true, status: 'failed', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '8', jobId: 'job1', itemNumber: 8, title: 'Item 8', completed: false, status: 'not_applicable', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
        { id: '9', jobId: 'job1', itemNumber: 9, title: 'Item 9', completed: false, status: 'not_applicable', notes: null, photoCount: 0, photoRequired: false, voiceNoteUrl: null, voiceNoteDuration: null },
      ];

      const result = calculateScore(items);

      expect(result.totalItems).toBe(10);
      expect(result.notApplicableItems).toBe(2);
      expect(result.passedItems).toBe(7);
      expect(result.failedItems).toBe(1);
      expect(result.passRate).toBeCloseTo(87.5, 1);
      expect(result.grade).toBe('B');
    });
  });

  describe('Edge case: Just below grade boundaries', () => {
    it('should return grade B for 89.9% pass rate (just below A)', () => {
      const items: ChecklistItem[] = [
        ...Array(899).fill(null).map((_, i) => ({
          id: `${i}`,
          jobId: 'job1',
          itemNumber: i,
          title: `Item ${i}`,
          completed: true,
          status: 'passed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
        ...Array(101).fill(null).map((_, i) => ({
          id: `${i + 899}`,
          jobId: 'job1',
          itemNumber: i + 899,
          title: `Item ${i + 899}`,
          completed: true,
          status: 'failed' as const,
          notes: null,
          photoCount: 0,
          photoRequired: false,
          voiceNoteUrl: null,
          voiceNoteDuration: null,
        })),
      ];

      const result = calculateScore(items);

      expect(result.passRate).toBeCloseTo(89.9, 1);
      expect(result.grade).toBe('B');
    });
  });
});
