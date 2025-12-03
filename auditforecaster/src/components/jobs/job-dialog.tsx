'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { JobInput, JobSchema } from "@/lib/schemas"
import { useSync } from "@/providers/sync-provider"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { PlusCircle } from "lucide-react"
import { Builder, User } from "@prisma/client"

interface JobDialogProps {
    builders: Builder[]
    inspectors: Pick<User, 'id' | 'name' | 'email' | 'image' | 'role'>[]
}

export function JobDialog({ builders, inspectors }: JobDialogProps) {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()
    const { engine } = useSync()

    const form = useForm<JobInput>({
        resolver: zodResolver(JobSchema) as any,
        defaultValues: {
            status: "PENDING"
        },
    })

    async function onSubmit(data: JobInput) {
        try {
            console.log('JobDialog: Enqueuing job...')
            await engine.enqueue('CREATE', 'job', data)
            console.log('JobDialog: Job enqueued successfully')

            toast({
                title: "Scheduled",
                description: "Job scheduled. Syncing in background...",
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Failed to enqueue:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to schedule job locally.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Job
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-white/10 bg-black/80 backdrop-blur-xl text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Schedule New Job</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Create a new inspection job.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="lotNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Lot Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">City</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Austin" {...field} className="bg-white/5 border-white/10 text-white" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="streetAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-gray-300">Street Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123 Main St" {...field} className="bg-white/5 border-white/10 text-white" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="builderId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-gray-300">Builder</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                <SelectValue placeholder="Select Builder" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {builders.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="inspectorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Inspector (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                    <SelectValue placeholder="Unassigned" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {inspectors.map(i => (
                                                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="scheduledDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-gray-300">Date</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-emerald-700 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                                {form.formState.isSubmitting ? "Scheduling..." : "Schedule Job"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
