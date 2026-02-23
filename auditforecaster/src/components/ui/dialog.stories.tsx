import type { Meta, StoryObj } from '@storybook/react';
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './dialog';
import { Button } from './button';
import { Input } from './input';

const meta: Meta<typeof Dialog> = {
    title: 'UI/Dialog',
    component: Dialog,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Input placeholder="Name" defaultValue="Shaun Ulrich" />
                    <Input placeholder="Email" defaultValue="shaun@example.com" />
                </div>
                <DialogFooter>
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};

export const Confirmation: Story = {
    render: () => (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive">Delete Job</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you sure?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    This action cannot be undone. This will permanently delete the job and all associated inspections.
                </p>
                <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive">Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    ),
};
