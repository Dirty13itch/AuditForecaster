import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Card content with some example text.</p>
            </CardContent>
            <CardFooter>
                <Button>Action</Button>
            </CardFooter>
        </Card>
    ),
};

export const Simple: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Simple Card</CardTitle>
            </CardHeader>
            <CardContent>
                <p>A card with only a title and content.</p>
            </CardContent>
        </Card>
    ),
};

export const WithDescription: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Inspection Report</CardTitle>
                <CardDescription>123 Main St - Blower Door Test</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">ACH50</span>
                        <span className="font-medium">2.8</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className="font-medium text-green-600">Pass</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    ),
};
