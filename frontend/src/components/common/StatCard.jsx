export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color = "blue",
}) {
  return (
    <div className="employee-stat-card">
      <div className={`employee-stat-icon ${color}`}>
        <Icon size={23} />
      </div>

      <div className="employee-stat-content">
        <span>{title}</span>
        <h2>{value}</h2>
        <small>{description}</small>
      </div>
    </div>
  );
}