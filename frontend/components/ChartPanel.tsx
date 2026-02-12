"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { DistributionPoint, TimePoint } from "../lib/api";

type Props = {
  timeseries: TimePoint[];
  distribution: DistributionPoint[];
  questionCode: string;
  selectedDimension: string;
};

function labelFromQuestionCode(code: string): string {
  if (code === "regulatory_pressure") return "Regulatory Pressure";
  if (code === "policy_confidence") return "Policy Confidence";
  return code;
}

export default function ChartPanel({ timeseries, distribution, questionCode, selectedDimension }: Props) {
  const title = labelFromQuestionCode(questionCode);
  return (
    <section className="panel">
      <div className="panelHeader">
        <h2>{title}</h2>
        <p>Trend over time and by-group comparison update instantly with your filters.</p>
      </div>

      <div className="chartWrap">
        <div className="chartCard">
          <h3>Time Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5dd" />
              <XAxis dataKey="wave" tick={{ fill: "#3f3b2c" }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#3f3b2c" }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#2a5db0" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chartCard">
          <h3>{selectedDimension} Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5dd" />
              <XAxis dataKey="group" tick={{ fill: "#3f3b2c" }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#3f3b2c" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#db7c2a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
