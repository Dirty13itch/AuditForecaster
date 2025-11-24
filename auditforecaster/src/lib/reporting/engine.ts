// import { z } from 'zod';

// --- Type Definitions ---

export type LogicCondition = {
    questionId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: unknown;
};

export type LogicRule = {
    conditions: LogicCondition[];
    action: 'show' | 'hide' | 'require';
    targetId: string; // The field ID to show/hide/require
};

export type Answer = {
    questionId: string;
    value: unknown;
    notes?: string;
    media?: string[]; // URLs to photos/videos
};

export type QuestionItem = {
    id: string;
    type: 'text' | 'number' | 'select' | 'multiselect' | 'photo' | 'signature' | 'slider';
    label: string;
    options?: { label: string; value: unknown; score?: number }[]; // For select/multiselect
    required?: boolean;
    weight?: number; // Multiplier for the score
};

export type Section = {
    id: string;
    title: string;
    items: QuestionItem[];
};

export type Page = {
    id: string;
    title: string;
    sections: Section[];
};

export type TemplateStructure = {
    pages: Page[];
    logic: LogicRule[];
};

// --- Logic Engine ---

/**
 * Evaluates a single condition against the provided answers.
 */
function evaluateCondition(condition: LogicCondition, answers: Record<string, Answer>): boolean {
    const answer = answers[condition.questionId];
    if (!answer) return false; // No answer yet, condition fails (or assume false)

    const val = answer.value;
    const target = condition.value;

    switch (condition.operator) {
        case 'equals':
            return val == target;
        case 'not_equals':
            return val != target;
        case 'contains':
            return Array.isArray(val) ? val.includes(target) : String(val).includes(String(target));
        case 'greater_than':
            return Number(val) > Number(target);
        case 'less_than':
            return Number(val) < Number(target);
        default:
            return false;
    }
}

/**
 * Determines which fields should be visible based on logic rules.
 */
export function evaluateLogic(
    structure: TemplateStructure,
    answers: Record<string, Answer>
): Record<string, { visible: boolean; required: boolean }> {
    const state: Record<string, { visible: boolean; required: boolean }> = {};

    // Initialize all items as visible and use their default required state
    for (const page of structure.pages) {
        for (const section of page.sections) {
            for (const item of section.items) {
                state[item.id] = { visible: true, required: !!item.required };
            }
        }
    }

    // Apply rules
    for (const rule of structure.logic) {
        const allConditionsMet = rule.conditions.every((c) => evaluateCondition(c, answers));

        if (allConditionsMet) {
            if (rule.action === 'show') {
                state[rule.targetId].visible = true;
            } else if (rule.action === 'hide') {
                state[rule.targetId].visible = false;
            } else if (rule.action === 'require') {
                state[rule.targetId].required = true;
            }
        } else {
            if (rule.action === 'show') {
                state[rule.targetId].visible = false;
            }
        }
    }

    return state;
}

// --- Scoring Engine ---

export function calculateScore(
    structure: TemplateStructure,
    answers: Record<string, Answer>
): { score: number; maxScore: number; percentage: number } {
    let totalScore = 0;
    let maxPossibleScore = 0;

    const logicState = evaluateLogic(structure, answers);

    for (const page of structure.pages) {
        for (const section of page.sections) {
            for (const item of section.items) {
                // Skip if item is hidden
                if (!logicState[item.id]?.visible) continue;

                // Skip if no scoring weight or weight is 0 (informational fields)
                if (!item.options && item.type !== 'slider') continue;

                const answer = answers[item.id];

                let itemMaxScore = 0;
                let itemScore = 0;
                const weight = item.weight ?? 1;

                if (item.type === 'select' && item.options) {
                    const maxOptionScore = Math.max(...item.options.map(o => o.score ?? 0));
                    itemMaxScore = maxOptionScore * weight;

                    if (answer) {
                        const selectedOption = item.options.find(o => o.value === answer.value);
                        if (selectedOption) {
                            itemScore = (selectedOption.score ?? 0) * weight;
                        }
                    }
                } else if (item.type === 'slider') {
                    itemMaxScore = 100 * weight;
                    if (answer) {
                        itemScore = Number(answer.value) * weight;
                    }
                }

                totalScore += itemScore;
                maxPossibleScore += itemMaxScore;
            }
        }
    }

    return {
        score: totalScore,
        maxScore: maxPossibleScore,
        percentage: maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0
    };
}
