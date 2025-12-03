/**
 * Simple Linear Regression for Revenue Forecasting
 * y = mx + b
 * m = slope (trend)
 * b = y-intercept
 */

export interface DataPoint {
    x: number // Time (e.g., month index 0, 1, 2)
    y: number // Value (e.g., revenue)
}

export function calculateTrend(data: DataPoint[]) {
    const n = data.length
    if (n < 2) return {
        slope: 0,
        intercept: 0,
        predict: () => data[0]?.y || 0
    }

    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumXX = 0

    for (const point of data) {
        sumX += point.x
        sumY += point.y
        sumXY += point.x * point.y
        sumXX += point.x * point.x
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return {
        slope,
        intercept,
        predict: (x: number) => slope * x + intercept
    }
}

export function predictNextMonth(history: number[]) {
    // Map history to x,y points (0, val0), (1, val1), ...
    const data = history.map((val, idx) => ({ x: idx, y: val }))
    const { predict } = calculateTrend(data)

    // Predict next month (index = length)
    const nextIndex = history.length
    const prediction = predict(nextIndex)

    return Math.max(0, prediction) // Revenue cannot be negative
}
