import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getServiceItems, getPriceLists } from "@/app/actions/pricing"
import { ServiceItemForm } from "@/components/pricing/service-item-form"
import { PriceListForm } from "@/components/pricing/price-list-form"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default async function PricingSettingsPage() {
    const { data: serviceItems } = await getServiceItems()
    const { data: priceLists } = await getPriceLists()

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Pricing Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Manage service items, base prices, and builder-specific price lists.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Service Items */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Service Catalog</CardTitle>
                            <CardDescription>Base services and standard pricing.</CardDescription>
                        </div>
                        <ServiceItemForm />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {serviceItems?.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{item.name}</div>
                                        {item.description && (
                                            <div className="text-sm text-muted-foreground">{item.description}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="font-mono font-medium">${item.basePrice.toFixed(2)}</div>
                                        <ServiceItemForm item={item} trigger={
                                            <button className="text-sm text-blue-600 hover:underline">Edit</button>
                                        } />
                                    </div>
                                </div>
                            ))}
                            {(!serviceItems || serviceItems.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No service items defined.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Price Lists */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Price Lists</CardTitle>
                            <CardDescription>Custom pricing for builders and subdivisions.</CardDescription>
                        </div>
                        <PriceListForm />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {priceLists?.map((list) => (
                                <div key={list.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <div className="font-medium">{list.name}</div>
                                        <div className="flex gap-2 mt-1">
                                            {list.builder && <Badge variant="outline">{list.builder.name}</Badge>}
                                            {list.subdivision && <Badge variant="outline">{list.subdivision.name}</Badge>}
                                            <span className="text-xs text-muted-foreground self-center">
                                                Updated {format(new Date(list.updatedAt), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm text-muted-foreground">
                                            {list._count.items} items
                                        </div>
                                        <button className="text-sm text-blue-600 hover:underline">Manage</button>
                                    </div>
                                </div>
                            ))}
                            {(!priceLists || priceLists.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No price lists created.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
