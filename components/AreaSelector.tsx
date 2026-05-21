type AreaSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const areaOptions = [
  "무릎",
  "허리",
  "골반",
  "발",
  "상체",
  "팔꿈치",
  "손목",
  "기타",
] as const;

export default function AreaSelector({ value, onChange }: AreaSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {areaOptions.map((area) => {
        const active = value === area;

        return (
          <button
            key={area}
            type="button"
            onClick={() => onChange(area)}
            className={`min-h-10 rounded-xl px-2 py-2 text-xs font-semibold ${
              active
                ? "bg-[#111827] text-white"
                : "bg-[#f3f4f6] text-[#374151]"
            }`}
          >
            {area}
          </button>
        );
      })}
    </div>
  );
}
