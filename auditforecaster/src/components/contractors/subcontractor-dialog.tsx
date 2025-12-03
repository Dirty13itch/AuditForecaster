'use client'

import { useState } from "react"
import { useForm, Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SubcontractorInput, SubcontractorSchema } from "@/lib/schemas"
import { createSubcontractor, updateSubcontractor } from "@/app/actions/contractors"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Pencil } from "lucide-react"

interface SubcontractorDialogProps {
    mode: "create" | "edit"
    subcontractor?: SubcontractorInput & { id: string }
    trigger?: React.ReactNode
}

export function SubcontractorDialog({ mode, subcontractor, trigger }: SubcontractorDialogProps) {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()

    const form = useForm<SubcontractorInput>({
        resolver: zodResolver(SubcontractorSchema) as Resolver<SubcontractorInput>,
        defaultValues: {
            name: subcontractor?.name || "",
            type: (subcontractor?.type === "Company" ? "Company" : "Individual") as "Individual" | "Company",
            status: (subcontractor?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
        },
    })

    async function onSubmit(data: SubcontractorInput) {
        try {
            let result
            if (mode === "create") {
                result = await createSubcontractor(data)
            } else {
                if (!subcontractor?.id) return
                result = await updateSubcontractor(subcontractor.id, data)
            }

            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                })
                setOpen(false)
                form.reset()
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Something went wrong. Please try again.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Add Subcontractor
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Add Subcontractor" : "Edit Subcontractor"}</DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Add a new subcontractor to your network."
                            : "Update the subcontractor's details."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe or Acme Corp" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Individual">Individual</SelectItem>
                                            <SelectItem value="Company">Company</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="email@example.com" {...field} />
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
                                    <FormLabel>Phone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(555) 555-5555" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
