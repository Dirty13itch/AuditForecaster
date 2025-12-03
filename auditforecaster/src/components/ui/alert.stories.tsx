import type { Meta, StoryObj } from '@storybook/react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Terminal, AlertCircle } from 'lucide-react';

const meta: Meta<typeof Alert> = {
    title: 'UI/Alert',
    component: Alert,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
    render: (args) => (
        <Alert {...args}>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
                You can add components to your app using the cli.
            </AlertDescription>
        </Alert>
    ),
    args: {
        variant: 'default',
    },
};

export const Destructive: Story = {
    render: (args) => (
        <Alert {...args}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
                Your session has expired. Please log in again.
            </AlertDescription>
        </Alert>
    ),
    args: {
        variant: 'destructive',
    },
};
