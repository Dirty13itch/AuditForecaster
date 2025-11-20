'use client'

import React, { useState } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Type, CheckSquare, Image as ImageIcon, PenTool } from 'lucide-react';

interface ReportSection {
    id: string;
    type: 'header' | 'checklist' | 'photos' | 'signature';
    title: string;
}

const initialSections: ReportSection[] = [
    { id: '1', type: 'header', title: 'Inspection Details' },
    { id: '2', type: 'checklist', title: 'Safety Checklist' },
    { id: '3', type: 'photos', title: 'Equipment Photos' },
];

function SortableSection({ section }: { section: ReportSection }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: section.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getIcon = () => {
        switch (section.type) {
            case 'header': return <Type size={16} />;
            case 'checklist': return <CheckSquare size={16} />;
            case 'photos': return <ImageIcon size={16} />;
            case 'signature': return <PenTool size={16} />;
            default: return <Type size={16} />;
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-md mb-2 shadow-sm">
            <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical size={20} />
            </div>
            <div className="p-2 bg-slate-100 rounded text-slate-600">
                {getIcon()}
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-medium">{section.title}</h4>
                <p className="text-xs text-slate-500 capitalize">{section.type} Section</p>
            </div>
        </div>
    );
}

export function ReportBuilder() {
    const [sections, setSections] = useState(initialSections);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setSections((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const addSection = (type: ReportSection['type']) => {
        const newSection: ReportSection = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            title: `New ${type} Section`,
        };
        setSections([...sections, newSection]);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Template Layout</CardTitle>
                    </CardHeader>
                    <CardContent className="bg-slate-50 min-h-[400px] p-4 rounded-md">
                        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={sections} strategy={verticalListSortingStrategy}>
                                {sections.map((section) => (
                                    <SortableSection key={section.id} section={section} />
                                ))}
                            </SortableContext>
                        </DndContext>
                        {sections.length === 0 && (
                            <div className="text-center text-slate-400 mt-20">
                                Drag items here or click to add
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Toolbox</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addSection('header')}>
                            <Type size={16} /> Text / Header
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addSection('checklist')}>
                            <CheckSquare size={16} /> Checklist
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addSection('photos')}>
                            <ImageIcon size={16} /> Photo Grid
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => addSection('signature')}>
                            <PenTool size={16} /> Signature
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
