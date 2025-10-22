import ForecastCard from '../ForecastCard';

export default function ForecastCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2 p-4 max-w-4xl">
      <ForecastCard
        title="Total Duct Leakage (TDL)"
        predicted={156.3}
        actual={148.7}
        unit="CFM25"
        confidence={87}
        threshold={200}
      />
      <ForecastCard
        title="Duct Leakage to Outside (DLO)"
        predicted={42.8}
        actual={51.2}
        unit="CFM25"
        confidence={82}
        threshold={50}
      />
      <ForecastCard
        title="Total Duct Leakage (TDL)"
        predicted={178.5}
        unit="CFM25"
        confidence={91}
        threshold={200}
      />
      <ForecastCard
        title="Duct Leakage to Outside (DLO)"
        predicted={38.2}
        unit="CFM25"
        confidence={85}
        threshold={50}
      />
    </div>
  );
}
