"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DashboardChartsProps {
  stageDistribution: Array<{ stageName: string; count: number; colour?: string }>;
  monthlyTrend: Array<{ month: string; received: number; delivered: number }>;
}

export function DashboardCharts({
  stageDistribution,
  monthlyTrend,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Pieces by Production Stage */}
      <Card className="border-neutral-200/80 dark:border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Pieces by Production Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stageDistribution}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <XAxis
                  dataKey="stageName"
                  tick={{ fontSize: 10, fill: "#888" }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#f3f4f6",
                    fontSize: "12px",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Pieces in Stage"
                  fill="#d4af37"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Monthly Trend: Received vs Delivered */}
      <Card className="border-neutral-200/80 dark:border-neutral-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Orders Received vs. Delivered (Monthly)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrend}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#f3f4f6",
                    fontSize: "12px",
                    borderRadius: "6px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                <Bar
                  dataKey="received"
                  name="Orders Received"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="delivered"
                  name="Orders Delivered"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
