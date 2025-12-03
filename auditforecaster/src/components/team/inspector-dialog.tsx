'use client'

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { InspectorInput, InspectorSchema } from "@/lib/schemas"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash, UserPlus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface InspectorDialogProps {
    mode: "create" | "edit"
    inspector?: InspectorInput & { id: string }
    trigger?: React.ReactNode
}

export function InspectorDialog({ mode, inspector, trigger }: InspectorDialogProps) {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()
    const { engine } = useSync()

    const form = useForm<InspectorInput>({
        resolver: zodResolver(InspectorSchema) as any,
        defaultValues: {
            name: inspector?.name || "",
            email: inspector?.email || "",
            role: "INSPECTOR",
            hersRaterId: inspector?.hersRaterId || "",
            baseRate: inspector?.baseRate || 0,
            certifications: inspector?.certifications || [],
            onboarding: inspector?.onboarding ? {
                uniformIssued: inspector.onboarding.uniformIssued ?? false,
                ipadIssued: inspector.onboarding.ipadIssued ?? false,
                badgePrinted: inspector.onboarding.badgePrinted ?? false,
                trainingComplete: inspector.onboarding.trainingComplete ?? false,
                notes: inspector.onboarding.notes ?? ""
            } : {
                uniformIssued: false,
                ipadIssued: false,
                badgePrinted: false,
                trainingComplete: false,
                notes: ""
            }
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "certifications",
    })

    async function onSubmit(data: InspectorInput) {
        try {
            if (mode === "create") {
                await engine.enqueue('CREATE', 'inspector', data)
            } else {
                if (!inspector?.id) return
                await engine.enqueue('UPDATE', 'inspector', { ...data, id: inspector.id })
            }

            toast({
                title: "Saved",
                description: "Inspector saved. Syncing in background...",
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Failed to enqueue:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save inspector locally.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                        <UserPlus className="mr-2 h-4 w-4" /> Onboard Inspector
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-white/10 bg-black/80 backdrop-blur-xl text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">{mode === "create" ? "Onboard Inspector" : "Edit Inspector"}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Enter the inspector's details, certifications, and payroll info.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-white/5">
                                <TabsTrigger value="basic" className="data-[state=active]:bg-blue-600">Basic</TabsTrigger>
                                <TabsTrigger value="professional" className="data-[state=active]:bg-blue-600">Professional</TabsTrigger>
                                <TabsTrigger value="onboarding" className="data-[state=active]:bg-blue-600">Onboarding</TabsTrigger>
                            </TabsList>

                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-300">Full Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Jane Doe" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-300">Email Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="jane@example.com" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-300">Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="(555) 123-4567" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>

                            <TabsContent value="professional" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="hersRaterId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-300">HERS Rater ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="RT-12345" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="baseRate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-gray-300">Base Monthly Rate ($)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="5000" {...field} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-gray-300">Certifications</FormLabel>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "" })} className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white">
                                            <Plus className="h-4 w-4 mr-2" /> Add Cert
                                        </Button>
                                    </div>
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-2 items-start border border-white/10 bg-white/5 p-2 rounded-md">
                                            <FormField
                                                control={form.control}
                                                name={`certifications.${index}.name`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input placeholder="Cert Name (e.g. BPI)" {...field} className="bg-transparent border-none text-white placeholder:text-gray-600 focus-visible:ring-0" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`certifications.${index}.licenseNumber`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input placeholder="License #" {...field} className="bg-transparent border-none text-white placeholder:text-gray-600 focus-visible:ring-0" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-gray-500 hover:text-red-400 hover:bg-transparent">
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>
                            <TabsContent value="onboarding" className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {['uniformIssued', 'ipadIssued', 'badgePrinted', 'trainingComplete'].map((key) => (
                                        <FormField
                                            key={key}
                                            control={form.control}
                                            name={`onboarding.${key}` as any}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 bg-white/5 p-4">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            className="border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                        />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="text-gray-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="onboarding.notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-gray-300">Onboarding Notes</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Additional details..." {...field} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50 min-h-[100px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                                {form.formState.isSubmitting ? "Saving..." : "Save Inspector"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
