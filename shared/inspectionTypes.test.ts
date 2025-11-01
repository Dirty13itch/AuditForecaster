import { describe, it, expect } from 'vitest';
import { 
  normalizeInspectionType, 
  getInspectionTypeLabel,
  INSPECTION_TYPE_OPTIONS 
} from './inspectionTypes';

describe('inspectionTypes', () => {
  describe('normalizeInspectionType', () => {
    it('should normalize short codes to enum values', () => {
      expect(normalizeInspectionType('final')).toBe('full_test');
      expect(normalizeInspectionType('rough')).toBe('rough_duct');
      expect(normalizeInspectionType('duct_test')).toBe('sv2');
    });

    it('should handle case-insensitive matching', () => {
      expect(normalizeInspectionType('FINAL')).toBe('full_test');
      expect(normalizeInspectionType('Final')).toBe('full_test');
      expect(normalizeInspectionType('FiNaL')).toBe('full_test');
      expect(normalizeInspectionType('ROUGH')).toBe('rough_duct');
      expect(normalizeInspectionType('Rough')).toBe('rough_duct');
    });

    it('should normalize full label forms', () => {
      expect(normalizeInspectionType('Final Testing')).toBe('full_test');
      expect(normalizeInspectionType('final testing')).toBe('full_test');
      expect(normalizeInspectionType('FINAL TESTING')).toBe('full_test');
      
      expect(normalizeInspectionType('Pre-Drywall')).toBe('rough_duct');
      expect(normalizeInspectionType('pre-drywall')).toBe('rough_duct');
      expect(normalizeInspectionType('Pre Drywall')).toBe('rough_duct');
      expect(normalizeInspectionType('PRE-DRYWALL')).toBe('rough_duct');
      
      expect(normalizeInspectionType('Blower Door Retest')).toBe('bdoor_retest');
      expect(normalizeInspectionType('blower door retest')).toBe('bdoor_retest');
    });

    it('should handle snake_case variations', () => {
      expect(normalizeInspectionType('pre_drywall')).toBe('rough_duct');
      expect(normalizeInspectionType('blower_door_retest')).toBe('bdoor_retest');
      expect(normalizeInspectionType('duct_blaster')).toBe('sv2');
    });

    it('should pass through current enum values unchanged', () => {
      expect(normalizeInspectionType('full_test')).toBe('full_test');
      expect(normalizeInspectionType('rough_duct')).toBe('rough_duct');
      expect(normalizeInspectionType('sv2')).toBe('sv2');
      expect(normalizeInspectionType('code_bdoor')).toBe('code_bdoor');
      expect(normalizeInspectionType('bdoor_retest')).toBe('bdoor_retest');
      expect(normalizeInspectionType('rehab')).toBe('rehab');
      expect(normalizeInspectionType('multifamily')).toBe('multifamily');
      expect(normalizeInspectionType('energy_star')).toBe('energy_star');
      expect(normalizeInspectionType('other')).toBe('other');
    });

    it('should return original value if no mapping exists', () => {
      expect(normalizeInspectionType('unknown_type')).toBe('unknown_type');
      expect(normalizeInspectionType('custom')).toBe('custom');
    });

    it('should handle all variants from architect requirements', () => {
      // Short codes
      expect(normalizeInspectionType('final')).toBe('full_test');
      expect(normalizeInspectionType('rough')).toBe('rough_duct');
      expect(normalizeInspectionType('sv2')).toBe('sv2');
      expect(normalizeInspectionType('duct_test')).toBe('sv2');
      
      // Full labels (case-insensitive)
      expect(normalizeInspectionType('Final Testing')).toBe('full_test');
      expect(normalizeInspectionType('Pre-Drywall')).toBe('rough_duct');
      expect(normalizeInspectionType('Pre Drywall')).toBe('rough_duct');
      expect(normalizeInspectionType('Code Blower Door')).toBe('code_bdoor');
      expect(normalizeInspectionType('Blower Door Retest')).toBe('bdoor_retest');
      expect(normalizeInspectionType('Duct Blaster')).toBe('sv2');
      expect(normalizeInspectionType('Duct Testing')).toBe('sv2');
      expect(normalizeInspectionType('Multifamily')).toBe('multifamily');
      expect(normalizeInspectionType('Energy Star')).toBe('energy_star');
      expect(normalizeInspectionType('Rehab')).toBe('rehab');
    });
  });

  describe('getInspectionTypeLabel', () => {
    it('should get label from normalized enum value', () => {
      expect(getInspectionTypeLabel('full_test')).toBe('Final Testing');
      expect(getInspectionTypeLabel('rough_duct')).toBe('Pre-Drywall Inspection');
      expect(getInspectionTypeLabel('code_bdoor')).toBe('Blower Door Only');
      expect(getInspectionTypeLabel('sv2')).toBe('Duct Blaster Only');
    });

    it('should normalize legacy values before getting label', () => {
      expect(getInspectionTypeLabel('final')).toBe('Final Testing');
      expect(getInspectionTypeLabel('rough')).toBe('Pre-Drywall Inspection');
      expect(getInspectionTypeLabel('Final Testing')).toBe('Final Testing');
      expect(getInspectionTypeLabel('Pre-Drywall')).toBe('Pre-Drywall Inspection');
    });

    it('should handle case-insensitive legacy values', () => {
      expect(getInspectionTypeLabel('FINAL')).toBe('Final Testing');
      expect(getInspectionTypeLabel('ROUGH')).toBe('Pre-Drywall Inspection');
      expect(getInspectionTypeLabel('FINAL TESTING')).toBe('Final Testing');
    });

    it('should return original value if no mapping found', () => {
      expect(getInspectionTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('INSPECTION_TYPE_OPTIONS', () => {
    it('should contain all expected enum values', () => {
      const values = INSPECTION_TYPE_OPTIONS.map(opt => opt.value);
      expect(values).toContain('rough_duct');
      expect(values).toContain('full_test');
      expect(values).toContain('code_bdoor');
      expect(values).toContain('sv2');
      expect(values).toContain('bdoor_retest');
      expect(values).toContain('rehab');
      expect(values).toContain('multifamily');
      expect(values).toContain('energy_star');
      expect(values).toContain('other');
    });

    it('should have human-readable labels', () => {
      const roughOption = INSPECTION_TYPE_OPTIONS.find(opt => opt.value === 'rough_duct');
      expect(roughOption?.label).toBe('Pre-Drywall Inspection');
      
      const finalOption = INSPECTION_TYPE_OPTIONS.find(opt => opt.value === 'full_test');
      expect(finalOption?.label).toBe('Final Testing');
    });
  });
});
