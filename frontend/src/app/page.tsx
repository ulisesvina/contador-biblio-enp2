import Dashboard from "@/components/dashboard"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8">
      <div className="w-full max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Entradas a la biblioteca - ENP 2</h1>
        <Dashboard />
      </div>
    </main>
  )
}
