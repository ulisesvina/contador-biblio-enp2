"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface MessageChartProps {
    data: { date: string;[key: string]: string | number }[]
    dataKey: string
    loading: boolean
    error: boolean
    total: number
    chartType: "bar" | "area"
}

export default function MessageChart({ data, dataKey, loading, error, total, chartType }: MessageChartProps) {
    if (error) {
        return (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load data. Please try again later.</AlertDescription>
            </Alert>
        )
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>No data available for this time period</p>
            </div>
        )
    }

    return (
        <div className="h-full w-full">
            <ChartContainer config={{
                chartType: {
                    label: "bar",
                },
                chartTitle: {
                    label: "Entradas por día",
                }
            }}>
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                width={30}
                                tickFormatter={(value) => (value === 0 ? "0" : value)}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Bar dataKey={dataKey} fill="var(--color-numberOfMessages)" radius={[4, 4, 0, 0]} />
                            <ChartTooltip
                                content={<ChartTooltipContent formatter={(value) => <span className="font-bold">{value}</span>} />}
                            />
                        </BarChart>
                    ) : (
                        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-numberOfMessages)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-numberOfMessages)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                width={30}
                                tickFormatter={(value) => (value === 0 ? "0" : value)}
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke="var(--color-numberOfMessages)"
                                fillOpacity={1}
                                fill="url(#colorMessages)"
                            />
                            <ChartTooltip
                                content={<ChartTooltipContent formatter={(value) => <span className="font-bold">{value}</span>} />}
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">Total:</span> {total}
            </div>
        </div>
    )
}
