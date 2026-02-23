import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';

const meta: Meta<typeof Input> = {
    title: 'UI/Input',
    component: Input,
    tags: ['autodocs'],
    argTypes: {
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'search', 'tel'],
        },
        disabled: {
            control: 'boolean',
        },
    },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        placeholder: 'Enter text...',
    },
};

export const Email: Story = {
    args: {
        type: 'email',
        placeholder: 'name@example.com',
    },
};

export const Password: Story = {
    args: {
        type: 'password',
        placeholder: 'Enter password',
    },
};

export const Disabled: Story = {
    args: {
        placeholder: 'Disabled input',
        disabled: true,
    },
};

export const WithValue: Story = {
    args: {
        type: 'text',
        defaultValue: '123 Main Street',
    },
};

export const Number: Story = {
    args: {
        type: 'number',
        placeholder: 'ACH50 value',
    },
};
