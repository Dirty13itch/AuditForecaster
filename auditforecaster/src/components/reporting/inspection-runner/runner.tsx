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
import { ActionItemDialog } from '@/components/inspection/action-item-dialog';

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

    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
    const [failedItemTitle, setFailedItemTitle] = useState('');
    const [actionItems, setActionItems] = useState<ActionItem[]>([]);

    // Load action items
    useEffect(() => {
        if (!inspectionId) return;
        import('@/app/actions/action-items').then(({ getActionItems }) => {
            getActionItems(inspectionId).then(setActionItems);
        });
    }, [inspectionId]);

    const refreshActionItems = () => {
        if (!inspectionId) return;
        import('@/app/actions/action-items').then(({ getActionItems }) => {
            getActionItems(inspectionId).then(setActionItems);
        });
    };

    const handleAnswer = (questionId: string, value: string | number | string[] | boolean | null) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: { questionId, value }
        }));

        // Auto-trigger action item dialog on failure
        if (value === 'Fail' || value === 'No' || value === false) {
            // Find the item label
            let label = '';
            for (const page of structure.pages) {
                for (const section of page.sections) {
                    const item = section.items.find(i => i.id === questionId);
                    if (item) {
                        label = item.label;
                        break;
                    }
                }
                if (label) break;
            }
            
            if (label) {
                setFailedItemTitle(`Fix: ${label}`);
                setIsActionDialogOpen(true);
            }
        }
    };

    const currentPage = structure.pages[currentPageIndex];
    if (!currentPage) return <div className="p-4 text-center">No pages in template</div>;

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
                                                        setFailedItemTitle(`Fix: ${item.label}`);
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
            {inspectionId && (
                <ActionItemDialog 
                    open={isActionDialogOpen} 
                    onOpenChange={setIsActionDialogOpen} 
                    inspectionId={inspectionId}
                    failedItemTitle={failedItemTitle}
                    onSuccess={refreshActionItems}
                />
            )}
        </div>
    );
}
