export interface ChecklistItem {
    label: string;
    name?: string;
    status: 'PASS' | 'FAIL' | 'NA' | 'PENDING';
    note?: string;
}
