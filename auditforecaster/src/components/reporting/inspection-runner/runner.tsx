'use client';

import { useState, useEffect } from 'react';
import { TemplateStructure, Answer, evaluateLogic, calculateScore } from '@/lib/reporting/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

type ActionItem = {
    id: string
    title: string
    description: string | null
    priority: string
    status: string
    assignedToEmail: string | null
    createdAt: Date
    updatedAt: Date
}

export function InspectionRunner({
    structure,
    initialAnswers = {},
    onComplete,
    inspectionId
}: {
    structure: TemplateStructure,
    initialAnswers?: Record<string, Answer>,
    onComplete: (answers: Record<string, Answer>, score: number) => void,
    inspectionId?: string
}) {
    const [answers, setAnswers] = useState<Record<string, Answer>>(initialAnswers);
    const [logicState, setLogicState] = useState<Record<string, { visible: boolean; required: boolean }>>({});
    const [scoreData, setScoreData] = useState({ score: 0, maxScore: 0, percentage: 0 });
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Recalculate logic and score whenever answers change
    useEffect(() => {
        const state = evaluateLogic(structure, answers);
        setLogicState(state);

        const score = calculateScore(structure, answers);
        setScoreData(score);
    }, [answers, structure]);

    const handleAnswer = (questionId: string, value: string | number | string[] | boolean | null) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { questionId, value }
        }));
    };

    const currentPage = structure.pages[currentPageIndex];



    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
    const [currentActionItem, setCurrentActionItem] = useState<{ title: string; description: string; priority: string; assignedToEmail: string }>({
        title: '', description: '', priority: 'MEDIUM', assignedToEmail: ''
    });
    const [actionItems, setActionItems] = useState<ActionItem[]>([]);

    // Load action items
    useEffect(() => {
        if (!inspectionId) return;
        import('@/app/actions/action-items').then(({ getActionItems }) => {
            getActionItems(inspectionId).then(setActionItems);
        });
    }, [inspectionId]);

    const handleCreateActionItem = async () => {
        if (!inspectionId) return;

        try {
            const { createActionItem } = await import('@/app/actions/action-items');
            await createActionItem({
                inspectionId,
                title: currentActionItem.title,
                description: currentActionItem.description,
                priority: currentActionItem.priority,
                assignedToEmail: currentActionItem.assignedToEmail
            });
            setIsActionDialogOpen(false);
            setCurrentActionItem({ title: '', description: '', priority: 'MEDIUM', assignedToEmail: '' });
            // Reload action items
            import('@/app/actions/action-items').then(({ getActionItems }) => {
                getActionItems(inspectionId).then(setActionItems);
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <div className="sticky top-0 bg-background z-10 py-4 border-b">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold">{currentPage.title}</h2>
                    <div className="text-sm font-mono">Score: {scoreData.percentage.toFixed(0)}%</div>
                </div>
                <Progress value={(currentPageIndex + 1) / structure.pages.length * 100} />
            </div>

            <div className="space-y-8">
                {currentPage.sections.map(section => (
                    <Card key={section.id}>
                        <CardContent className="pt-6 space-y-6">
                            <h3 className="font-semibold text-lg border-b pb-2">{section.title}</h3>

                            {section.items.map(item => {
                                const state = logicState[item.id];
                                if (!state?.visible) return null;

                                return (
                                    <div key={item.id} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Label className={state.required ? "after:content-['*'] after:text-red-500" : ""}>
                                                {item.label}
                                            </Label>
                                            {inspectionId && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                    onClick={() => {
                                                        setCurrentActionItem(prev => ({ ...prev, title: `Fix: ${item.label}` }));
                                                        setIsActionDialogOpen(true);
                                                    }}
                                                >
                                                    <AlertTriangle className="h-4 w-4 mr-1" /> Action Item
                                                </Button>
                                            )}
                                        </div>

                                        {item.type === 'text' && (
                                            <Input
                                                value={typeof answers[item.id]?.value === 'string' ? answers[item.id]?.value as string : ''}
                                                onChange={(e) => handleAnswer(item.id, e.target.value)}
                                            />
                                        )}

                                        {item.type === 'select' && (
                                            <Select
                                                value={typeof answers[item.id]?.value === 'string' ? answers[item.id]?.value as string : undefined}
                                                onValueChange={(val) => handleAnswer(item.id, val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {item.options?.map(opt => (
                                                        <SelectItem key={opt.value as string} value={opt.value as string}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}

                                        {/* Add other input types here */}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Action Items Summary */}
            {actionItems.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardContent className="pt-6">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4">Action Items ({actionItems.length})</h3>
                        <div className="space-y-2">
                            {actionItems.map(item => (
                                <div key={item.id} className="flex items-start gap-3 p-3 bg-white rounded border">
                                    <AlertTriangle className={`h-4 w-4 mt-0.5 ${item.priority === 'HIGH' || item.priority === 'CRITICAL' ? 'text-red-500' : 'text-amber-500'}`} />
                                    <div className="flex-1">
                                        <div className="font-medium">{item.title}</div>
                                        {item.description && <div className="text-sm text-muted-foreground mt-1">{item.description}</div>}
                                        <div className="text-xs text-muted-foreground mt-2">Assigned to: {item.assignedToEmail} • {item.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-between max-w-3xl mx-auto">
                <Button
                    variant="outline"
                    disabled={currentPageIndex === 0}
                    onClick={() => setCurrentPageIndex(prev => prev - 1)}
                >
                    Previous
                </Button>

                {currentPageIndex < structure.pages.length - 1 ? (
                    <Button onClick={() => setCurrentPageIndex(prev => prev + 1)}>
                        Next Page
                    </Button>
                ) : (
                    <Button onClick={() => onComplete(answers, scoreData.score)}>
                        Complete Inspection
                    </Button>
                )}
            </div>

            {/* Action Item Dialog */}
            {isActionDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <h3 className="text-lg font-bold">Create Action Item</h3>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={currentActionItem.title}
                                    onChange={(e) => setCurrentActionItem({ ...currentActionItem, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                    value={currentActionItem.priority}
                                    onValueChange={(val) => setCurrentActionItem({ ...currentActionItem, priority: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="CRITICAL">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Assign To (Email)</Label>
                                <Input
                                    type="email"
                                    placeholder="builder@example.com"
                                    value={currentActionItem.assignedToEmail}
                                    onChange={(e) => setCurrentActionItem({ ...currentActionItem, assignedToEmail: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input
                                    value={currentActionItem.description}
                                    onChange={(e) => setCurrentActionItem({ ...currentActionItem, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreateActionItem}>Create & Send</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
