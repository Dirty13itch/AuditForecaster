'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Bot, X, Send } from 'lucide-react'

export function AICopilot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'Hello! I am your Audit Copilot. Ask me about codes, equipment, or this inspection.' }
    ])
    const [input, setInput] = useState('')

    const handleSend = () => {
        if (!input.trim()) return

        setMessages(prev => [...prev, { role: 'user', text: input }])
        setInput('')

        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'ai', text: "I'm currently in demo mode, but soon I'll be able to answer that using our knowledge base!" }])
        }, 1000)
    }

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <Button
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 z-50"
                    onClick={() => setIsOpen(true)}
                >
                    <Bot className="h-8 w-8 text-white" />
                </Button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <Card className="fixed bottom-6 right-6 w-80 h-96 shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-10">
                    <CardHeader className="bg-indigo-600 text-white rounded-t-lg p-4 flex flex-row justify-between items-center">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Bot className="h-4 w-4" /> Audit Copilot
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-indigo-700" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${m.role === 'user'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white border shadow-sm rounded-bl-none'
                                    }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <div className="p-3 border-t bg-white">
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <Button size="icon" onClick={handleSend}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </>
    )
}
