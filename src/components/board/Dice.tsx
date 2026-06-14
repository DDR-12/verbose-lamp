function Pip({ pos }: { pos: number[] }) {
  return (
    <div
      className="pip"
      style={{
        gridColumn: pos[0],
        gridRow: pos[1],
      }}
    />
  );
}

const FACES: Record<number, number[][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

interface DiceProps {
  value: number;
  rolling?: boolean;
  size?: number;
}

export default function Dice({ value, rolling, size = 64 }: DiceProps) {
  const face = FACES[value] || FACES[1];
  return (
    <div
      className={`dice-3d ${rolling ? 'animate-roll' : ''}`}
      style={{ width: size, height: size }}
    >
      <div className="dice-face" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}>
        {face.map((p, i) => (
          <Pip key={i} pos={p} />
        ))}
      </div>
    </div>
  );
}
