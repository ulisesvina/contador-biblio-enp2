"use client"

import { useEffect, useState } from "react"
import {
    format,
    sub,
    eachDayOfInterval,
    eachHourOfInterval,
    eachMonthOfInterval,
    startOfDay,
    startOfWeek,
    startOfMonth,
    startOfYear,
    add,
} from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MessageChart from "./message-chart"

const TIMEZONE = "America/Mexico_City"

interface Message {
    id: number
    hora: string
}

export default function Dashboard() {
    const [messages, setMessages] = useState<Message[]>([])
    const [timeFrame, setTimeFrame] = useState("day")
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
    const [error, setError] = useState<string | null>(null)
    const [chartData, setChartData] = useState<{ date: string; numberOfMessages: number }[]>([])
    const [activeTab, setActiveTab] = useState("hourly")

    const formatToTimezone = (date: Date, formatStr: string): string => {
        const zonedDate = toZonedTime(date, TIMEZONE)
        return format(zonedDate, formatStr)
    }

    const fetchInitialData = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/entradasActuales`)
            const data = await response.json()
            console.log("API Data:", data)
            if (data.success && Array.isArray(data.data)) {
                setMessages(data.data)
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            setError("Falló la conexión a la API histórica")
        }
    }

    useEffect(() => {
        fetchInitialData()

        let socket: WebSocket
        let reconnectTimeout: NodeJS.Timeout

        const connect = () => {
            setConnectionStatus("connecting")
            socket = new WebSocket(`wss://${process.env.NEXT_PUBLIC_API_URL}/`)

            socket.onopen = () => {
                setConnectionStatus("connected")
                socket.send(JSON.stringify({ action: "subscribe", channel: "entradas" }))
            }

            socket.onmessage = (event) => {
                try {
                    const incoming = JSON.parse(event.data)

                    const newMessages: Message[] = Array.isArray(incoming)
                        ? incoming
                        : Array.isArray(incoming.data)
                            ? incoming.data
                            : [incoming]

                    const validMessages = newMessages.filter((msg) => msg.hora && !isNaN(new Date(msg.hora).getTime()))

                    setMessages((prevMessages) => [...prevMessages, ...validMessages])
                    console.log("🆕 Mensajes válidos agregados:", validMessages)
                } catch (err) {
                    console.error("Error procesando mensaje del WebSocket:", err)
                }
            }

            socket.onerror = (event) => {
                setConnectionStatus("error")
                setError("Error de conexión al WebSocket")
                console.error("WebSocket error:", event)
                socket.close()
            }

            socket.onclose = () => {
                setConnectionStatus("error")
                setError("Conexión cerrada")
                console.log("🔌 WS cerrado, reconectando en 5s")
                reconnectTimeout = setTimeout(connect, 5000)
            }
        }

        connect()

        return () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.close()
            }
            clearTimeout(reconnectTimeout)
        }
    }, [])

    useEffect(() => {
        if (messages.length > 0) {
            processData()
        }
    }, [messages, timeFrame, activeTab])

    const processData = () => {
        const now = new Date()
        let timeIntervals: { start: Date; end: Date }[]
        let formatString: string

        switch (timeFrame) {
            case "year":
                timeIntervals = eachMonthOfInterval({ start: startOfYear(now), end: now }).map((start) => ({
                    start,
                    end: add(start, { months: 1 }),
                }))
                formatString = "MMM"
                break
            case "quarter":
                timeIntervals = eachMonthOfInterval({ start: sub(now, { months: 3 }), end: now }).map((start) => ({
                    start,
                    end: add(start, { months: 1 }),
                }))
                formatString = "MMM"
                break
            case "month":
                timeIntervals = eachDayOfInterval({ start: startOfMonth(now), end: now }).map((start) => ({
                    start,
                    end: add(start, { days: 1 }),
                }))
                formatString = "d"
                break
            case "week":
                timeIntervals = eachDayOfInterval({ start: startOfWeek(now), end: now }).map((start) => ({
                    start,
                    end: add(start, { days: 1 }),
                }))
                formatString = "EEE"
                break
            case "day":
                timeIntervals = eachHourOfInterval({ start: startOfDay(now), end: now }).map((start) => ({
                    start,
                    end: add(start, { hours: 1 }),
                }))
                formatString = "HH:mm"
                break
            default:
                timeIntervals = eachDayOfInterval({ start: startOfMonth(now), end: now }).map((start) => ({
                    start,
                    end: add(start, { days: 1 }),
                }))
                formatString = "d"
        }

        const data = timeIntervals.map(({ start, end }) => {
            const zonedStart = toZonedTime(start, TIMEZONE)
            const zonedEnd = toZonedTime(end, TIMEZONE)

            const intervalMessages = messages.filter((message) => {
                const messageDate = toZonedTime(new Date(message.hora), TIMEZONE)
                return messageDate >= zonedStart && messageDate < zonedEnd
            })

            return {
                date: format(zonedStart, formatString),
                numberOfMessages: intervalMessages.length,
            }
        })

        setChartData(data)
    }

    const totalMessages = chartData.reduce((acc, curr) => acc + curr.numberOfMessages, 0)

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <div
                        className={`w-3 h-3 rounded-full ${connectionStatus === "connected"
                            ? "bg-green-500"
                            : connectionStatus === "connecting"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                    />
                    <span className="text-sm">
                        {connectionStatus === "connected"
                            ? "Conectado"
                            : connectionStatus === "connecting"
                                ? "Conectando..."
                                : "Conexión perdida"}
                    </span>
                </div>
                <div className="w-full sm:w-48">
                    <Select value={timeFrame} onValueChange={setTimeFrame}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select time period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="year">Año</SelectItem>
                            <SelectItem value="quarter">Trimestre</SelectItem>
                            <SelectItem value="month">Mes</SelectItem>
                            <SelectItem value="week">Semana</SelectItem>
                            <SelectItem value="day">Día</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card className="max-w-full overflow-hidden">
                <CardHeader>
                    <CardTitle>Analíticas de Entradas</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="hourly">Vista por temporalidad</TabsTrigger>
                            <TabsTrigger value="cumulative">Vista cumulativa</TabsTrigger>
                        </TabsList>
                        <TabsContent value="hourly" className="mt-4">
                            <div className="h-[300px] w-full">
                                <MessageChart
                                    data={chartData}
                                    dataKey="numberOfMessages"
                                    loading={messages.length === 0 && connectionStatus === "connecting"}
                                    error={!!error}
                                    total={totalMessages}
                                    chartType="bar"
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="cumulative" className="mt-4">
                            <div className="h-[300px] w-full">
                                <MessageChart
                                    data={chartData}
                                    dataKey="numberOfMessages"
                                    loading={messages.length === 0 && connectionStatus === "connecting"}
                                    error={!!error}
                                    total={totalMessages}
                                    chartType="area"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Entradas Totales</div>
                            <div className="text-2xl font-bold">{messages.length}</div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Entradas Este Periodo</div>
                            <div className="text-2xl font-bold">{totalMessages}</div>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground">Última Entrada</div>
                            <div className="text-2xl font-bold">
                                {messages.length > 0
                                    ? formatToTimezone(new Date(messages[messages.length - 1].hora), "HH:mm:ss")
                                    : "N/A"}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Desgloce de entradas por hora</CardTitle>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {chartData.map((item, index) => (
                                <div key={index} className="p-4 bg-muted rounded-lg">
                                    <div className="text-sm text-muted-foreground">{item.date}</div>
                                    <div className="text-2xl font-bold">{item.numberOfMessages}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </CardHeader>

            </Card>

        </div>
    )
}
