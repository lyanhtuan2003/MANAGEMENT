export default function ProgressBar({ progress }) {
  return (
    <div className="employee-progress">
      <div
        className="employee-progress-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}