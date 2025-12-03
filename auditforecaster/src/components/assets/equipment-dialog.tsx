'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EquipmentClientInput, EquipmentClientSchema } from "@/lib/schemas"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { format, addYears } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const SPRING_CONFIG = { stiffness: 300, damping: 30 }

export function EquipmentDialog() {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()

    const form = useForm({
        resolver: zodResolver(EquipmentClientSchema),
        defaultValues: {
            name: "",
            type: "",
            serialNumber: "",
            status: "ACTIVE" as const,
            notes: "",
            calibrationCertUrl: "",
        },
    })

    // Auto-calc next calibration when last calibration changes
    const handleLastCalChange = (date: Date | undefined) => {
        form.setValue("lastCalibration", date)
        if (date) {
            form.setValue("nextCalibration", addYears(date, 1))
        }
    }

    const { engine } = useSync()

    async function onSubmit(data: EquipmentClientInput) {
        try {
            // Deep Implementation: Enqueue mutation via Sync Engine
            // This handles IDB persistence, queue management, and background sync automatically.
            await engine.enqueue('CREATE', 'equipment', data)

            toast({
                title: "Saved",
                description: "Equipment saved. Syncing in background...",
            })

            setOpen(false)
            form.reset()
        } catch (error) {
            console.error("Failed to enqueue:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save equipment locally.",
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-lg">
                        <Plus className="mr-2 h-4 w-4" /> Add Equipment
                    </Button>
                </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-background/60 backdrop-blur-xl border-white/10 shadow-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING_CONFIG}
                >
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            Add Equipment
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground/80">
                            Register new equipment. Ensure calibration data is accurate.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6">
                            <div className="grid grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Retrotec 5000" {...field} className="bg-background/50 border-white/10 focus:ring-primary/20" />
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
                                            <FormControl>
                                                <Input placeholder="Blower Door" {...field} className="bg-background/50 border-white/10 focus:ring-primary/20" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="serialNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Serial Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="SN-123456" {...field} className="bg-background/50 border-white/10 focus:ring-primary/20" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="lastCalibration"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Last Calibration</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal bg-background/50 border-white/10 hover:bg-background/70",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 border-white/10 bg-background/95 backdrop-blur-xl" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={handleLastCalChange}
                                                        disabled={(date) =>
                                                            date > new Date() || date < new Date("1900-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="nextCalibration"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Next Calibration</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal bg-background/50 border-white/10 hover:bg-background/70",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Auto-calculated</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 border-white/10 bg-background/95 backdrop-blur-xl" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-background/50 border-white/10 focus:ring-primary/20">
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                                                <SelectItem value="ACTIVE">Active</SelectItem>
                                                <SelectItem value="CALIBRATION_DUE">Calibration Due</SelectItem>
                                                <SelectItem value="REPAIR">Out for Repair</SelectItem>
                                                <SelectItem value="RETIRED">Retired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
                                    <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                        {form.formState.isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                            "Save Equipment"
                                        )}
                                    </Button>
                                </motion.div>
                            </DialogFooter>
                        </form>
                    </Form>
                </motion.div>
            </DialogContent>
        </Dialog>
    )
}
