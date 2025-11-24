'use client';

import { useState } from 'react';
import { TemplateStructure, Page, Section, QuestionItem, LogicRule, LogicCondition } from '@/lib/reporting/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export function TemplateBuilder({ initialStructure, onSave }: { initialStructure?: TemplateStructure, onSave: (structure: TemplateStructure) => void }) {
    const [structure, setStructure] = useState<TemplateStructure>(initialStructure || { pages: [], logic: [] });

    const addPage = () => {
        const newPage: Page = {
            id: crypto.randomUUID(),
            title: 'New Page',
            sections: []
        };
        setStructure({ ...structure, pages: [...structure.pages, newPage] });
    };

    const updatePage = (pageIndex: number, updates: Partial<Page>) => {
        const newPages = [...structure.pages];
        newPages[pageIndex] = { ...newPages[pageIndex], ...updates };
        setStructure({ ...structure, pages: newPages });
    };

    const addSection = (pageIndex: number) => {
        const newSection: Section = {
            id: crypto.randomUUID(),
            title: 'New Section',
            items: []
        };
        const newPages = [...structure.pages];
        newPages[pageIndex].sections.push(newSection);
        setStructure({ ...structure, pages: newPages });
    };

    const addItem = (pageIndex: number, sectionIndex: number) => {
        const newItem: QuestionItem = {
            id: crypto.randomUUID(),
            type: 'text',
            label: 'New Question'
        };
        const newPages = [...structure.pages];
        newPages[pageIndex].sections[sectionIndex].items.push(newItem);
        setStructure({ ...structure, pages: newPages });
    };

    const updateItem = (pageIndex: number, sectionIndex: number, itemIndex: number, updates: Partial<QuestionItem>) => {
        const newPages = [...structure.pages];
        newPages[pageIndex].sections[sectionIndex].items[itemIndex] = {
            ...newPages[pageIndex].sections[sectionIndex].items[itemIndex],
            ...updates
        };
        setStructure({ ...structure, pages: newPages });
    };

    const [isLogicOpen, setIsLogicOpen] = useState(false);

    // Helper to get all questions for dropdowns
    const getAllQuestions = () => {
        const questions: { id: string; label: string }[] = [];
        structure.pages.forEach(p => p.sections.forEach(s => s.items.forEach(i => questions.push({ id: i.id, label: i.label }))));
        return questions;
    };

    const addRule = () => {
        const questions = getAllQuestions();
        if (questions.length < 2) return; // Need at least 2 questions

        const newRule: LogicRule = {
            conditions: [{ questionId: questions[0].id, operator: 'equals', value: '' }],
            action: 'show',
            targetId: questions[1].id
        };
        setStructure({ ...structure, logic: [...(structure.logic || []), newRule] });
    };

    const updateRule = (index: number, updates: Partial<LogicRule>) => {
        const newLogic = [...(structure.logic || [])];
        newLogic[index] = { ...newLogic[index], ...updates };
        setStructure({ ...structure, logic: newLogic });
    };

    const updateCondition = (ruleIndex: number, conditionIndex: number, updates: Partial<LogicCondition>) => {
        const newLogic = [...(structure.logic || [])];
        newLogic[ruleIndex].conditions[conditionIndex] = { ...newLogic[ruleIndex].conditions[conditionIndex], ...updates };
        setStructure({ ...structure, logic: newLogic });
    };

    const removeRule = (index: number) => {
        const newLogic = [...(structure.logic || [])];
        newLogic.splice(index, 1);
        setStructure({ ...structure, logic: newLogic });
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Template Builder</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsLogicOpen(!isLogicOpen)}>
                        {isLogicOpen ? 'Hide Logic' : 'Edit Logic'}
                    </Button>
                    <Button onClick={() => onSave(structure)}>Save Template</Button>
                </div>
            </div>

            {isLogicOpen && (
                <Card className="border-l-4 border-l-purple-500 bg-purple-50/50">
                    <CardHeader>
                        <h3 className="text-lg font-semibold">Conditional Logic</h3>
                        <p className="text-sm text-muted-foreground">Define rules to show/hide questions based on answers.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(structure.logic || []).map((rule, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-white rounded border shadow-sm flex-wrap">
                                <span className="font-bold text-sm">IF</span>
                                {rule.conditions.map((condition, cIndex) => (
                                    <div key={cIndex} className="flex items-center gap-2">
                                        <Select
                                            value={condition.questionId}
                                            onValueChange={(val) => updateCondition(index, cIndex, { questionId: val })}
                                        >
                                            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {getAllQuestions().map(q => (
                                                    <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={condition.operator}
                                            onValueChange={(val) => updateCondition(index, cIndex, { operator: val as LogicCondition['operator'] })}
                                        >
                                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="equals">equals</SelectItem>
                                                <SelectItem value="not_equals">not equals</SelectItem>
                                                <SelectItem value="contains">contains</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            className="w-[150px]"
                                            placeholder="Value"
                                            value={String(condition.value)}
                                            onChange={(e) => updateCondition(index, cIndex, { value: e.target.value })}
                                        />
                                    </div>
                                ))}

                                <span className="font-bold text-sm ml-2">THEN</span>
                                <Select
                                    value={rule.action}
                                    onValueChange={(val) => updateRule(index, { action: val as LogicRule['action'] })}
                                >
                                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="show">Show</SelectItem>
                                        <SelectItem value="hide">Hide</SelectItem>
                                        <SelectItem value="require">Require</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={rule.targetId}
                                    onValueChange={(val) => updateRule(index, { targetId: val })}
                                >
                                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {getAllQuestions().map(q => (
                                            <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button variant="ghost" size="icon" onClick={() => removeRule(index)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addRule}>
                            <Plus className="h-4 w-4 mr-2" /> Add Rule
                        </Button>
                    </CardContent>
                </Card>
            )}

            {structure.pages.map((page, pageIndex) => (
                <Card key={page.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Label>Page Title</Label>
                            <Input
                                value={page.title}
                                onChange={(e) => updatePage(pageIndex, { title: e.target.value })}
                                className="font-bold text-lg"
                            />
                            <Button variant="destructive" size="icon" onClick={() => {
                                const newPages = structure.pages.filter((_, i) => i !== pageIndex);
                                setStructure({ ...structure, pages: newPages });
                            }}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {page.sections.map((section, sectionIndex) => (
                            <div key={section.id} className="pl-4 border-l-2 border-muted space-y-4">
                                <div className="flex items-center gap-4">
                                    <Label>Section</Label>
                                    <Input
                                        value={section.title}
                                        onChange={(e) => {
                                            const newPages = [...structure.pages];
                                            newPages[pageIndex].sections[sectionIndex].title = e.target.value;
                                            setStructure({ ...structure, pages: newPages });
                                        }}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        const newPages = [...structure.pages];
                                        newPages[pageIndex].sections = newPages[pageIndex].sections.filter((_, i) => i !== sectionIndex);
                                        setStructure({ ...structure, pages: newPages });
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {section.items.map((item, itemIndex) => (
                                        <div key={item.id} className="flex items-start gap-2 p-2 bg-muted/20 rounded-md">
                                            <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                                            <div className="grid gap-2 flex-1">
                                                <Input
                                                    value={item.label}
                                                    onChange={(e) => updateItem(pageIndex, sectionIndex, itemIndex, { label: e.target.value })}
                                                    placeholder="Question Label"
                                                />
                                                <div className="flex gap-2">
                                                    <Select
                                                        value={item.type}
                                                        onValueChange={(val: string) => updateItem(pageIndex, sectionIndex, itemIndex, { type: val as QuestionItem['type'] })}
                                                    >
                                                        <SelectTrigger className="w-[150px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="text">Text</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="select">Select</SelectItem>
                                                            <SelectItem value="photo">Photo</SelectItem>
                                                            <SelectItem value="signature">Signature</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {/* Add more property editors here (required, weight, options) */}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => {
                                                const newPages = [...structure.pages];
                                                newPages[pageIndex].sections[sectionIndex].items = newPages[pageIndex].sections[sectionIndex].items.filter((_, i) => i !== itemIndex);
                                                setStructure({ ...structure, pages: newPages });
                                            }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => addItem(pageIndex, sectionIndex)}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Question
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="secondary" size="sm" onClick={() => addSection(pageIndex)}>
                            <Plus className="h-4 w-4 mr-2" /> Add Section
                        </Button>
                    </CardContent>
                </Card>
            ))}

            <Button variant="outline" className="w-full py-8 border-dashed" onClick={addPage}>
                <Plus className="h-6 w-6 mr-2" /> Add Page
            </Button>
        </div>
    );
}
