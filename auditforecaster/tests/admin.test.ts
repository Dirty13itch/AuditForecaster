describe('Admin Compliance Logic', () => {
    const getComplianceStatus = (sub: any) => {
        const hasW9 = sub.complianceDocs.some((d: any) => d.type === 'W9');
        const hasValidCOI = sub.complianceDocs.some((d: any) =>
            d.type === 'COI' && (!d.expirationDate || new Date(d.expirationDate) > new Date())
        );

        if (hasW9 && hasValidCOI) return 'COMPLIANT';
        if (!hasW9) return 'MISSING_W9';
        if (!hasValidCOI) return 'MISSING_COI';
        return 'NON_COMPLIANT';
    };

    it('should return COMPLIANT when both W9 and valid COI exist', () => {
        const sub = {
            complianceDocs: [
                { type: 'W9' },
                { type: 'COI', expirationDate: new Date(Date.now() + 86400000).toISOString() } // Tomorrow
            ]
        };
        expect(getComplianceStatus(sub)).toBe('COMPLIANT');
    });

    it('should return MISSING_W9 when W9 is missing', () => {
        const sub = {
            complianceDocs: [
                { type: 'COI', expirationDate: new Date(Date.now() + 86400000).toISOString() }
            ]
        };
        expect(getComplianceStatus(sub)).toBe('MISSING_W9');
    });

    it('should return MISSING_COI when COI is expired', () => {
        const sub = {
            complianceDocs: [
                { type: 'W9' },
                { type: 'COI', expirationDate: new Date(Date.now() - 86400000).toISOString() } // Yesterday
            ]
        };
        expect(getComplianceStatus(sub)).toBe('MISSING_COI');
    });

    it('should return MISSING_COI when COI is missing', () => {
        const sub = {
            complianceDocs: [
                { type: 'W9' }
            ]
        };
        expect(getComplianceStatus(sub)).toBe('MISSING_COI');
    });
});
