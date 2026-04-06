"use client";

/** Skeleton cards para mostrar mientras cargan los datos de Sheets */
export function SkeletonCard({ height = 96 }) {
  return (
    <div className="skeleton" style={{ height, borderRadius: "var(--radius-md)" }} />
  );
}

export function SkeletonGrid() {
  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: "12px" }}>
        <SkeletonCard height={100} />
        <SkeletonCard height={100} />
        <SkeletonCard height={120} />
        <SkeletonCard height={120} />
        <SkeletonCard height={96} />
      </div>
      <SkeletonCard height={60} />
      <div style={{ marginTop:"12px" }}>
        <SkeletonCard height={180} />
      </div>
    </div>
  );
}

export function SkeletonChart({ height = 200 }) {
  return (
    <div className="card" style={{ padding: "16px" }}>
      <div className="skeleton skeleton-text" style={{ width:"40%", marginBottom:"12px" }} />
      <div className="skeleton" style={{ height }} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="card" style={{ padding: "16px" }}>
      <div className="skeleton skeleton-text" style={{ width:"30%", marginBottom:"12px" }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ marginBottom:"8px", width: `${70 + Math.random()*25}%` }} />
      ))}
    </div>
  );
}
