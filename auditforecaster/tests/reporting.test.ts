import { evaluateLogic, calculateScore, TemplateStructure, Answer } from '../src/lib/reporting/engine';

describe('Reporting Engine', () => {
    const mockStructure: TemplateStructure = {
        pages: [
            {
                id: 'p1',
                title: 'Page 1',
                sections: [
                    {
                        id: 's1',
                        title: 'Section 1',
                        items: [
                            {
                                id: 'q1',
                                type: 'select',
                                label: 'Question 1',
                                options: [
                                    { label: 'Yes', value: 'yes', score: 10 },
                                    { label: 'No', value: 'no', score: 0 }
                                ],
                                weight: 1
                            },
                            {
                                id: 'q2',
                                type: 'text',
                                label: 'Why No?',
                                required: false
                            }
                        ]
                    }
                ]
            }
        ],
        logic: [
            {
                conditions: [{ questionId: 'q1', operator: 'equals', value: 'no' }],
                action: 'show',
                targetId: 'q2'
            },
            {
                conditions: [{ questionId: 'q1', operator: 'equals', value: 'no' }],
                action: 'require',
                targetId: 'q2'
            }
        ]
    };

    describe('Logic Evaluation', () => {
        it('should hide q2 by default (show rule exists)', () => {
            const answers: Record<string, Answer> = {};
            const state = evaluateLogic(mockStructure, answers);
            expect(state['q2'].visible).toBe(false);
        });

        it('should show and require q2 when q1 is "no"', () => {
            const answers: Record<string, Answer> = {
                'q1': { questionId: 'q1', value: 'no' }
            };
            const state = evaluateLogic(mockStructure, answers);
            expect(state['q2'].visible).toBe(true);
            expect(state['q2'].required).toBe(true);
        });

        it('should hide q2 when q1 is "yes"', () => {
            const answers: Record<string, Answer> = {
                'q1': { questionId: 'q1', value: 'yes' }
            };
            const state = evaluateLogic(mockStructure, answers);
            expect(state['q2'].visible).toBe(false);
        });
    });

    describe('Scoring Calculation', () => {
        it('should calculate max score correctly', () => {
            const answers: Record<string, Answer> = {};
            const result = calculateScore(mockStructure, answers);
            // q1 max is 10. q2 has no score.
            // But wait, q2 is hidden by default. Does it count?
            // Logic: if hidden, skip.
            // q1 is visible. q2 is hidden.
            // Max score = 10.
            expect(result.maxScore).toBe(10);
        });

        it('should calculate score for "yes"', () => {
            const answers: Record<string, Answer> = {
                'q1': { questionId: 'q1', value: 'yes' }
            };
            const result = calculateScore(mockStructure, answers);
            expect(result.score).toBe(10);
            expect(result.percentage).toBe(100);
        });

        it('should calculate score for "no"', () => {
            const answers: Record<string, Answer> = {
                'q1': { questionId: 'q1', value: 'no' }
            };
            const result = calculateScore(mockStructure, answers);
            expect(result.score).toBe(0);
            // q2 becomes visible. It has no score options, so it adds 0 to max score?
            // Yes, text fields don't add to max score in our engine.
            expect(result.maxScore).toBe(10);
            expect(result.percentage).toBe(0);
        });
    });
});
