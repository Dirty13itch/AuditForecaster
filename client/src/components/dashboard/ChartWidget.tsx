import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { 
  Download, Maximize2, MoreVertical, RefreshCw, 
  Settings, Share2, Calendar, TrendingUp 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";

export type ChartType = "line" | "bar" | "area" | "pie" | "composed" | "radar";

interface ChartWidgetProps {
  title: string;
  description?: string;
  data: any[];
  type: ChartType;
  dataKeys: string[] | { key: string; color: string }[];
  xAxisKey?: string;
  loading?: boolean;
  height?: number;
  onRefresh?: () => void;
  onTimeRangeChange?: (range: string) => void;
  timeRangeOptions?: string[];
  currentTimeRange?: string;
  className?: string;
  colors?: string[];
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  interactive?: boolean;
  onDataPointClick?: (data: any) => void;
  annotations?: Array<{
    x: string | number;
    label: string;
    color?: string;
  }>;
  live?: boolean;
}

const DEFAULT_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ChartWidget({
  title,
  description,
  data,
  type,
  dataKeys,
  xAxisKey,
  loading,
  height = 300,
  onRefresh,
  onTimeRangeChange,
  timeRangeOptions = ["Day", "Week", "Month", "Year"],
  currentTimeRange = "Month",
  className,
  colors = DEFAULT_COLORS,
  stacked = false,
  showLegend = true,
  showGrid = true,
  animate = true,
  interactive = true,
  onDataPointClick,
  annotations = [],
  live = false,
}: ChartWidgetProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const chartId = `chart-${title.toLowerCase().replace(/\s+/g, '-')}`;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById(chartId);
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-')}-chart.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Chart exported",
        description: "Chart has been downloaded as an image",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export chart",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    // Mock share functionality
    toast({
      title: "Share link copied",
      description: "Chart share link has been copied to clipboard",
    });
  };

  const processedDataKeys = dataKeys.map((key, index) => {
    if (typeof key === 'string') {
      return { key, color: colors[index % colors.length] };
    }
    return key;
  });

  const renderChart = () => {
    const commonProps = {
      data,
      onClick: interactive ? onDataPointClick : undefined,
    };

    const tooltipStyle = {
      contentStyle: {
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
      },
    };

    switch (type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend />}
            {processedDataKeys.map((dataKey) => (
              <Line
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                stroke={dataKey.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </LineChart>
        );

      case "bar":
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend />}
            {processedDataKeys.map((dataKey) => (
              <Bar
                key={dataKey.key}
                dataKey={dataKey.key}
                fill={dataKey.color}
                stackId={stacked ? "stack" : undefined}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </BarChart>
        );

      case "area":
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend />}
            {processedDataKeys.map((dataKey) => (
              <Area
                key={dataKey.key}
                type="monotone"
                dataKey={dataKey.key}
                stroke={dataKey.color}
                fill={dataKey.color}
                fillOpacity={0.3}
                stackId={stacked ? "stack" : undefined}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart>
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend />}
            <Pie
              data={data}
              dataKey={processedDataKeys[0].key}
              nameKey={xAxisKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              animationDuration={animate ? 1000 : 0}
              onClick={interactive ? onDataPointClick : undefined}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case "radar":
        return (
          <RadarChart {...commonProps}>
            <PolarGrid className="stroke-border" />
            <PolarAngleAxis dataKey={xAxisKey} className="text-xs" />
            <PolarRadiusAxis className="text-xs" />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend />}
            {processedDataKeys.map((dataKey) => (
              <Radar
                key={dataKey.key}
                name={dataKey.key}
                dataKey={dataKey.key}
                stroke={dataKey.color}
                fill={dataKey.color}
                fillOpacity={0.3}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </RadarChart>
        );

      case "composed":
        return (
          <ComposedChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
            <XAxis dataKey={xAxisKey} className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip {...tooltipStyle} />
            {showLegend && <Legend />}
            {processedDataKeys.map((dataKey, index) => {
              // Alternate between bar and line
              if (index % 2 === 0) {
                return (
                  <Bar
                    key={dataKey.key}
                    dataKey={dataKey.key}
                    fill={dataKey.color}
                    animationDuration={animate ? 1000 : 0}
                  />
                );
              }
              return (
                <Line
                  key={dataKey.key}
                  type="monotone"
                  dataKey={dataKey.key}
                  stroke={dataKey.color}
                  strokeWidth={2}
                  animationDuration={animate ? 1000 : 0}
                />
              );
            })}
          </ComposedChart>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          {description && <Skeleton className="h-4 w-48 mt-1" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      id={chartId}
      className={cn(
        "transition-all duration-200",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <Badge variant="secondary" className="animate-pulse">
                <TrendingUp className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
            {onTimeRangeChange && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    {currentTimeRange}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {timeRangeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => onTimeRangeChange(option)}
                      className={cn(
                        option === currentTimeRange && "bg-accent"
                      )}
                    >
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onRefresh && (
                  <DropdownMenuItem onClick={onRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                  <Maximize2 className="h-4 w-4 mr-2" />
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export Image"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
        {annotations.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {annotations.map((annotation, index) => (
              <Badge
                key={index}
                variant="outline"
                style={{ borderColor: annotation.color }}
              >
                {annotation.label}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}