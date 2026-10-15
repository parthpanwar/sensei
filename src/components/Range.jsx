export default function Range({ id, min, max, step, value, onChange }) {
  const p = ((value - min) / (max - min)) * 100
  return <input type="range" id={id} min={min} max={max} step={step} value={value} style={{ '--p': p + '%' }} onChange={(e) => onChange(+e.target.value)} />
}
