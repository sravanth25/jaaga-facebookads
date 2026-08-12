import React, { useState, useEffect } from 'react';
import { DateRange } from '../../types';
import { formatINR, formatNumber } from '../../lib/formatters';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PieChart as PieIcon, BarChart2, MapPin, Smartphone } from 'lucide-react';

interface AnalyticsSectionProps {
  dateRange: DateRange;
  onFetchBreakdown: (breakdown: string) => Promise<any[]>;
}

const COLORS = ['#0866FF', '#0B6B3A', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  dateRange,
  onFetchBreakdown,
}) => {
  const [placementData, setPlacementData] = useState<any[]>([]);
  const [ageGenderData, setAgeGenderData] = useState<any[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      onFetchBreakdown('publisher_platform'),
      onFetchBreakdown('age,gender'),
      onFetchBreakdown('region'),
      onFetchBreakdown('device_platform'),
    ])
      .then(([placements, ageGenders, regions, devices]) => {
        if (!isMounted) return;
        setPlacementData(placements || []);
        setAgeGenderData(ageGenders || []);
        setRegionData(regions || []);
        setDeviceData(devices || []);
      })
      .catch((err) => console.error('Error loading breakdowns:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Placement Breakdown Chart */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="h-4 w-4 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">By Placement Platform</h3>
          </div>
          {isLoading ? (
            <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : placementData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No placement breakdown available.
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-between">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={placementData}
                    dataKey="spend"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {placementData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg bg-slate-900 p-2.5 text-xs text-white shadow-lg border border-slate-700">
                            <div className="font-bold">{d.name}</div>
                            <div>Spend: {formatINR(d.spend)}</div>
                            <div className="text-emerald-400 font-semibold">Leads: {formatNumber(d.leads)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 2. Device Breakdown */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="h-4 w-4 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">By Device Platform</h3>
          </div>
          {isLoading ? (
            <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : deviceData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No device breakdown available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deviceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `₹${formatNumber(v)}`} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg bg-slate-900 p-2.5 text-xs text-white shadow-lg border border-slate-700">
                            <div className="font-bold">{d.name}</div>
                            <div>Spend: {formatINR(d.spend)}</div>
                            <div className="text-emerald-400 font-semibold">Leads: {formatNumber(d.leads)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="spend" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 3. Demographics (Age & Gender) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Demographics (Age & Gender)</h3>
          </div>
          {isLoading ? (
            <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : ageGenderData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No demographics data available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageGenderData.slice(0, 10)} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" fill="#0B6B3A" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 4. Geographic Region */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Regions / Locations</h3>
          </div>
          {isLoading ? (
            <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : regionData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No region breakdown available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="spend" name="Spend (₹)" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
