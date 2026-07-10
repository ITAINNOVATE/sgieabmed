"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const data = [
  { name: "Jan", Receptions: 1200, Sorties: 900 },
  { name: "Fév", Receptions: 1900, Sorties: 1200 },
  { name: "Mar", Receptions: 1500, Sorties: 1100 },
  { name: "Avr", Receptions: 2100, Sorties: 1600 },
  { name: "Mai", Receptions: 1800, Sorties: 1400 },
  { name: "Juin", Receptions: 2400, Sorties: 2000 },
  { name: "Juil", Receptions: 2100, Sorties: 1800 },
]

export function DashboardChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
          dy={10} 
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
        />
        <Tooltip 
          cursor={{ fill: 'var(--primary)', opacity: 0.05 }}
          contentStyle={{ 
            borderRadius: '12px', 
            border: '1px solid hsl(var(--border))', 
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            backgroundColor: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))'
          }} 
        />
        <Legend 
          iconType="circle" 
          wrapperStyle={{ paddingTop: '20px', fontSize: '13px', color: 'hsl(var(--foreground))' }} 
        />
        <Bar dataKey="Receptions" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={24} name="Réceptions" />
        <Bar dataKey="Sorties" fill="var(--warning)" radius={[4, 4, 0, 0]} barSize={24} name="Sorties" />
      </BarChart>
    </ResponsiveContainer>
  )
}
