import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload } from "lucide-react"

export default function PlansPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Builder Plans</h1>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Plan
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="aspect-[3/4] bg-gray-100 rounded-md mb-4 flex items-center justify-center text-gray-400">
                            PDF Preview
                        </div>
                        <h3 className="font-semibold">Lot 45 - The Oakwood</h3>
                        <p className="text-sm text-gray-500">Uploaded 2 days ago</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
